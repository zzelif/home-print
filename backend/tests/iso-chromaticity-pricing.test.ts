import { describe, it, expect, beforeAll } from 'vitest';
import { DocumentConverterService } from '../src/services/document-converter.service';
import { PDFDocument, rgb } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

describe('ISO/IEC 24712 Calibrated Chromaticity & Per-Page PDF Costing', () => {
  const service = new DocumentConverterService();
  const testDir = path.join(process.cwd(), 'cache', 'test_iso_pricing');

  let pureBwImgPath: string;
  let spotLogoImgPath: string;
  let mapGraphicImgPath: string;
  let fullPhotoImgPath: string;

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });

    // 1. Pure Monochrome B&W Image (0% color)
    pureBwImgPath = path.join(testDir, 'pure_bw.png');
    await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toFile(pureBwImgPath);

    // 2. Spot / Logo Accent Image (~3.5% chromatic coverage)
    // 400x400 = 160,000 px. 75x75 colored box = 5,625 px (3.5%)
    spotLogoImgPath = path.join(testDir, 'spot_logo.png');
    const spotCanvas = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    }).png().toBuffer();

    const logoPatch = await sharp({
      create: {
        width: 75,
        height: 75,
        channels: 3,
        background: { r: 220, g: 50, b: 50 }, // Rich red
      },
    }).png().toBuffer();

    await sharp(spotCanvas)
      .composite([{ input: logoPatch, top: 20, left: 20 }])
      .png()
      .toFile(spotLogoImgPath);

    // 3. Map / Medium Color Graphic Image (~15% chromatic coverage)
    // 150x160 colored area = 24,000 px (15%)
    mapGraphicImgPath = path.join(testDir, 'map_graphic.png');
    const mapPatch = await sharp({
      create: {
        width: 150,
        height: 160,
        channels: 3,
        background: { r: 50, g: 120, b: 220 }, // Blue roads / routes
      },
    }).png().toBuffer();

    await sharp(spotCanvas)
      .composite([{ input: mapPatch, top: 50, left: 50 }])
      .png()
      .toFile(mapGraphicImgPath);

    // 4. Heavy / Full Photo Color Image (100% chromatic coverage)
    fullPhotoImgPath = path.join(testDir, 'full_photo.png');
    await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 230, g: 140, b: 30 },
      },
    })
      .png()
      .toFile(fullPhotoImgPath);
  });

  it('classifies Pure B&W image as Tier 0 (Monochrome @ ₱3.00)', async () => {
    const buf = await fs.readFile(pureBwImgPath);
    const res = await service.analyzeRasterImageBuffer(buf, 1);
    expect(res.tier).toBe(0);
    expect(res.tierName).toBe('Monochrome (B&W)');
    expect(res.unitPrice).toBe(3.00);
  });

  it('classifies Spot / Logo accent image as Tier 1 (Spot Color @ ₱8.00)', async () => {
    const buf = await fs.readFile(spotLogoImgPath);
    const res = await service.analyzeRasterImageBuffer(buf, 1);
    expect(res.tier).toBe(1);
    expect(res.tierName).toBe('Spot / Logo Accent Color');
    expect(res.unitPrice).toBe(8.00);
    expect(res.chromaticRatio).toBeGreaterThanOrEqual(0.010);
    expect(res.chromaticRatio).toBeLessThan(0.080);
  });

  it('classifies Map / Slide graphic as Tier 2 (Medium Color Graphic @ ₱15.00)', async () => {
    const buf = await fs.readFile(mapGraphicImgPath);
    const res = await service.analyzeRasterImageBuffer(buf, 1);
    expect(res.tier).toBe(2);
    expect(res.tierName).toBe('Medium Color Graphic');
    expect(res.unitPrice).toBe(15.00);
    expect(res.chromaticRatio).toBeGreaterThanOrEqual(0.080);
    expect(res.chromaticRatio).toBeLessThan(0.350);
  });

  it('classifies Full Photo Color as Tier 3 (Heavy Color @ ₱20.00)', async () => {
    const buf = await fs.readFile(fullPhotoImgPath);
    const res = await service.analyzeRasterImageBuffer(buf, 1);
    expect(res.tier).toBe(3);
    expect(res.tierName).toBe('Heavy / Full Photo Color');
    expect(res.unitPrice).toBe(20.00);
    expect(res.chromaticRatio).toBeGreaterThanOrEqual(0.350);
  });

  it('analyzes synthetic multi-page PDF with true per-page independence', async () => {
    const doc = await PDFDocument.create();

    // Page 1: Has vector color (purple title)
    const page1 = doc.addPage([595, 842]);
    page1.drawText('Employment Contract', { x: 50, y: 750, size: 24, color: rgb(0.5, 0.1, 0.7) });

    // Page 2: Pure black text (monochrome)
    const page2 = doc.addPage([595, 842]);
    page2.drawText('Standard black and white text body paragraph.', { x: 50, y: 750, size: 12, color: rgb(0, 0, 0) });

    const pdfPath = path.join(testDir, 'synthetic_doc.pdf');
    const pdfBytes = await doc.save();
    await fs.writeFile(pdfPath, pdfBytes);

    const analysis = await service.analyzePdf(pdfPath);
    expect(analysis.totalPages).toBe(2);
    expect(analysis.pageBreakdown.length).toBe(2);

    // Page 1 should be Spot Color (₱8.00)
    expect(analysis.pageBreakdown[0].tier).toBe(1);
    expect(analysis.pageBreakdown[0].unitPrice).toBe(8.00);

    // Page 2 should be Monochrome B&W (₱3.00)
    expect(analysis.pageBreakdown[1].tier).toBe(0);
    expect(analysis.pageBreakdown[1].unitPrice).toBe(3.00);
  });
});

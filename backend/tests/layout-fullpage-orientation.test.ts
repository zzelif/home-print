import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { PdfBuilderService } from '../src/services/pdf-builder.service';

describe('Layout Studio Full-Page & Orientation Standards', () => {
  const pdfBuilder = new PdfBuilderService();
  const testDir = path.join(process.cwd(), 'cache', 'test_layout_fullpage');
  let testPhotoPath: string;

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    testPhotoPath = path.join(testDir, 'sample_photo.jpg');

    await sharp({
      create: {
        width: 1200,
        height: 1600,
        channels: 3,
        background: { r: 50, g: 120, b: 220 },
      },
    })
    .jpeg()
    .toFile(testPhotoPath);
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('builds a FULL_PAGE photo print on 4R paper in PORTRAIT orientation', async () => {
    const outputPath = path.join(testDir, '4r_portrait.pdf');
    await pdfBuilder.buildLayoutPdf(
      {
        inputFiles: [{ filePath: testPhotoPath, mimeType: 'image/jpeg' }],
        product: { paperSize: '4R' },
        layout: { presetId: 'FULL_PAGE', paperSize: '4R', orientation: 'PORTRAIT' },
      },
      outputPath
    );

    const pdfBytes = await fs.readFile(outputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    // 4R = 4 x 6 in = 288 x 432 pt
    expect(Math.round(width)).toBe(288);
    expect(Math.round(height)).toBe(432);
  });

  it('builds a FULL_PAGE photo print on 4R paper in LANDSCAPE orientation', async () => {
    const outputPath = path.join(testDir, '4r_landscape.pdf');
    await pdfBuilder.buildLayoutPdf(
      {
        inputFiles: [{ filePath: testPhotoPath, mimeType: 'image/jpeg' }],
        product: { paperSize: '4R' },
        layout: { presetId: 'FULL_PAGE', paperSize: '4R', orientation: 'LANDSCAPE' },
      },
      outputPath
    );

    const pdfBytes = await fs.readFile(outputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    // In landscape: width is 432 pt, height is 288 pt
    expect(Math.round(width)).toBe(432);
    expect(Math.round(height)).toBe(288);
  });

  it('builds a FULL_PAGE photo print on A4 paper', async () => {
    const outputPath = path.join(testDir, 'a4_portrait.pdf');
    await pdfBuilder.buildLayoutPdf(
      {
        inputFiles: [{ filePath: testPhotoPath, mimeType: 'image/jpeg' }],
        product: { paperSize: 'A4' },
        layout: { presetId: 'FULL_PAGE', paperSize: 'A4', orientation: 'PORTRAIT' },
      },
      outputPath
    );

    const pdfBytes = await fs.readFile(outputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    // A4 = 210 x 297 mm ≈ 595.28 x 841.89 pt
    expect(Math.abs(width - 595.28)).toBeLessThan(1.0);
    expect(Math.abs(height - 841.89)).toBeLessThan(1.0);
  });

  it('builds a GRID_2X2 preset on Letter paper with 4 slots', async () => {
    const boxes = pdfBuilder.resolvePresetBoxes('GRID_2X2', true, 'Letter', 'PORTRAIT');
    expect(boxes.length).toBe(4);
    // Each quadrant is half width and half height
    expect(boxes[0].widthMm).toBeCloseTo(215.9 / 2, 1);
    expect(boxes[0].heightMm).toBeCloseTo(279.4 / 2, 1);
  });
});

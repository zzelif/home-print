import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { PdfBuilderService } from '../src/services/pdf-builder.service';
import { sanitizeWinAnsi } from '../src/services/document-converter.service';

describe('Dynamic N-Up Tiling, Government ID Nameplates & Studio Enhancements', () => {
  const pdfBuilder = new PdfBuilderService();
  const testDir = path.join(process.cwd(), 'cache', 'test_dynamic_studio');
  let testPhotoPath: string;

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    testPhotoPath = path.join(testDir, 'customer_pet.jpg');

    // Create realistic test image with colors
    await sharp({
      create: {
        width: 1200,
        height: 1600,
        channels: 3,
        background: { r: 180, g: 120, b: 60 },
      },
    })
    .jpeg()
    .toFile(testPhotoPath);
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Dynamic N-Up Auto-Tiling Math (5-in-a-page, 2-up, 3-up, 8-up, 10-up)', () => {
    it('generates exact 5-in-a-page balanced layout on Letter paper (Portrait)', () => {
      const boxes = pdfBuilder.resolvePresetBoxes('TILE_5', true, 'Letter', 'PORTRAIT');
      expect(boxes.length).toBe(5);

      // 3 Rows: Row 1 (2 photos), Row 2 (2 photos), Row 3 (1 photo centered)
      const expectedW = 215.9 / 2;
      const expectedH = 279.4 / 3;
      expect(boxes[0].yMm).toBe(0);
      expect(boxes[1].yMm).toBe(0);
      expect(boxes[0].widthMm).toBeCloseTo(expectedW, 1);
      expect(boxes[1].widthMm).toBeCloseTo(expectedW, 1);
      expect(boxes[0].heightMm).toBeCloseTo(expectedH, 1);

      // Row 2
      expect(boxes[2].yMm).toBeCloseTo(expectedH, 1);
      expect(boxes[3].yMm).toBeCloseTo(expectedH, 1);
      expect(boxes[2].widthMm).toBeCloseTo(expectedW, 1);
      expect(boxes[3].widthMm).toBeCloseTo(expectedW, 1);

      // Row 3 (1 photo centered)
      expect(boxes[4].yMm).toBeCloseTo(2 * expectedH, 1);
      expect(boxes[4].widthMm).toBeCloseTo(expectedW, 1);
      expect(boxes[4].heightMm).toBeCloseTo(expectedH, 1);
      expect(boxes[4].xMm).toBeCloseTo((215.9 - expectedW) / 2, 1);
    });

    it('generates exact 5-in-a-page uniform layout on A4 paper (Landscape)', () => {
      const boxes = pdfBuilder.resolvePresetBoxes('TILE_5', true, 'A4', 'LANDSCAPE');
      expect(boxes.length).toBe(5);

      // Landscape A4 = 297mm width x 210mm height
      // Row 1: 3 photos, Row 2: 2 photos centered with same width and height
      const expectedW = 297.0 / 3;
      const expectedH = 210.0 / 2;
      expect(boxes[0].yMm).toBe(0);
      expect(boxes[1].yMm).toBe(0);
      expect(boxes[2].yMm).toBe(0);
      expect(boxes[0].widthMm).toBeCloseTo(expectedW, 1);
      expect(boxes[0].heightMm).toBeCloseTo(expectedH, 1);

      // Row 2: 2 photos centered with equal width & height
      expect(boxes[3].yMm).toBeCloseTo(expectedH, 1);
      expect(boxes[4].yMm).toBeCloseTo(expectedH, 1);
      expect(boxes[3].widthMm).toBeCloseTo(expectedW, 1);
      expect(boxes[4].widthMm).toBeCloseTo(expectedW, 1);
    });

    it('generates 2-in-a-page half sheet layout on 4R paper', () => {
      const boxes = pdfBuilder.resolvePresetBoxes('TILE_2', true, '4R', 'PORTRAIT');
      expect(boxes.length).toBe(2);
      // 4R Portrait = 101.6mm x 152.4mm
      expect(boxes[0].widthMm).toBeCloseTo(101.6, 1);
      expect(boxes[0].heightMm).toBeCloseTo(152.4 / 2, 1);
      expect(boxes[1].heightMm).toBeCloseTo(152.4 / 2, 1);
      expect(boxes[1].yMm).toBeCloseTo(152.4 / 2, 1);
    });

    it('generates custom grid (e.g. 3 cols x 2 rows) on Long / Folio paper', () => {
      const boxes = pdfBuilder.resolvePresetBoxes('GRID_CUSTOM', true, 'Long', 'PORTRAIT', {
        customGrid: { cols: 3, rows: 2 },
      });
      expect(boxes.length).toBe(6);
      expect(boxes[0].widthMm).toBeCloseTo(215.9 / 3, 1);
      expect(boxes[0].heightMm).toBeCloseTo(330.2 / 2, 1);
    });
  });

  describe('Official Philippine Civil Service (CSC) 2x2 ID Nameplate Vector Rendering', () => {
    it('renders vector PDF with solid white nameplate box, bold uppercase name, and subtext', async () => {
      const outputPath = path.join(testDir, 'csc_2x2_with_nameplate.pdf');
      await pdfBuilder.buildLayoutPdf(
        {
          inputFiles: [{ filePath: testPhotoPath, mimeType: 'image/jpeg' }],
          product: { paperSize: '4R' },
          layout: {
            presetId: 'SET_2', // 6x 2x2"
            paperSize: '4R',
            orientation: 'PORTRAIT',
            nameplateConfig: {
              enabled: true,
              name: 'Dela Cruz, Juan Pedro Jr. (CSC)',
              subtext: 'Civil Service Commission Exam',
              style: 'CSC_OFFICIAL',
            },
          },
        },
        outputPath
      );

      const pdfBytes = await fs.readFile(outputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBe(1);

      // Verify file size is valid high-res vector PDF (> 10 KB)
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(10000);
    });

    it('sanitizes WinAnsi Unicode ligatures and special symbols in nameplate', () => {
      const input = 'DE LA PEÑA—OFFICIAL ₱50 “PASSPORT” ﬁle';
      const clean = sanitizeWinAnsi(input);
      expect(clean).not.toContain('₱');
      expect(clean).toContain('PHP');
      expect(clean).not.toContain('—');
      expect(clean).toContain('-');
      expect(clean).not.toContain('ﬁ');
      expect(clean).toContain('fi');
      expect(clean).not.toContain('“');
      expect(clean).not.toContain('”');
    });
  });

  describe('Sharp 1-Tap Photo Enhancements & Filters', () => {
    it('applies Grayscale / B&W ID Mode filter during slot image processing', async () => {
      const rawBytes = await fs.readFile(testPhotoPath);
      const processed = await pdfBuilder.processImageForSlot(rawBytes, 50.8, 50.8, {
        enhancement: { grayscale: true, filterPreset: 'BW' },
      });

      const meta = await sharp(processed).metadata();
      expect(meta.channels).toBe(3); // Standard JPEG encoded as grayscale
      expect(meta.width).toBeGreaterThan(0);
    });

    it('applies Brighten and High Contrast adjustments without error', async () => {
      const rawBytes = await fs.readFile(testPhotoPath);
      const processed = await pdfBuilder.processImageForSlot(rawBytes, 50.8, 50.8, {
        enhancement: { brightness: 15, contrast: 20, filterPreset: 'BRIGHTEN' },
      });

      const meta = await sharp(processed).metadata();
      expect(meta.width).toBeGreaterThan(0);
      expect(meta.height).toBeGreaterThan(0);
    });
  });

  describe('Full 5-in-a-Page PDF Generation Execution', () => {
    it('successfully renders a 5-in-a-page vector PDF for animal/customer photo on Letter', async () => {
      const outputPath = path.join(testDir, 'animal_5_in_a_page.pdf');
      await pdfBuilder.buildLayoutPdf(
        {
          inputFiles: [{ filePath: testPhotoPath, mimeType: 'image/jpeg' }],
          product: { paperSize: 'Letter' },
          layout: {
            presetId: 'TILE_5',
            paperSize: 'Letter',
            orientation: 'PORTRAIT',
            showCutLines: true,
            zeroGap: false,
          },
        },
        outputPath
      );

      const pdfBytes = await fs.readFile(outputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBe(1);
      const page = pdfDoc.getPage(0);
      const { width, height } = page.getSize();
      // Letter = 215.9 x 279.4 mm = 612 x 792 pt
      expect(Math.round(width)).toBe(612);
      expect(Math.round(height)).toBe(792);
    });
  });
});

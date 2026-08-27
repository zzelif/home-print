import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { DocumentConverterService } from '../src/services/document-converter.service';

describe('Multi-Image Batch Collation Pipeline (15 Photos Ingestion)', () => {
  const converter = new DocumentConverterService();
  const testDir = path.join(process.cwd(), 'cache', 'test_batch_15');
  const imagePaths: string[] = [];

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });

    // Generate 15 distinct sample images (mix of B&W, Spot, Medium, and Heavy Full Color)
    for (let i = 1; i <= 15; i++) {
      const imgPath = path.join(testDir, `photo_${i}.jpg`);
      let bg = { r: 255, g: 255, b: 255 }; // Default white

      if (i <= 5) {
        // First 5: Heavy full color photo
        bg = { r: 180, g: 40, b: 60 };
      } else if (i <= 10) {
        // Next 5: Medium color chart
        bg = { r: 40, g: 140, b: 200 };
      } else {
        // Last 5: Monochrome/gray
        bg = { r: 200, g: 200, b: 200 };
      }

      await sharp({
        create: {
          width: 600,
          height: 800,
          channels: 3,
          background: bg,
        },
      })
      .jpeg()
      .toFile(imgPath);

      imagePaths.push(imgPath);
    }
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('collates all 15 images into 1 single 15-page vector PDF', async () => {
    expect(imagePaths.length).toBe(15);

    const collatedPdfPath = await converter.convertImagesToMultiPagePdf(
      imagePaths,
      'A4',
      'PORTRAIT',
      'FIT_PRINTABLE'
    );

    expect(collatedPdfPath).toBeDefined();
    const pdfBytes = await fs.readFile(collatedPdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(15);
  });

  it('correctly analyzes page-by-page color tiers and calculates total adaptive price', async () => {
    const collatedPdfPath = await converter.convertImagesToMultiPagePdf(
      imagePaths,
      'A4',
      'PORTRAIT',
      'FIT_PRINTABLE'
    );

    const result = await converter.analyzePdf(collatedPdfPath, imagePaths);
    expect(result.totalPages).toBe(15);
    expect(result.pageBreakdown.length).toBe(15);

    // Verify first 5 pages are heavy color (₱20)
    for (let i = 0; i < 5; i++) {
      expect(result.pageBreakdown[i].tier).toBe(3);
      expect(result.pageBreakdown[i].unitPrice).toBe(20.00);
    }

    // Verify middle 5 pages are medium/heavy color
    for (let i = 5; i < 10; i++) {
      expect(result.pageBreakdown[i].tier).toBeGreaterThanOrEqual(2);
      expect(result.pageBreakdown[i].unitPrice).toBeGreaterThanOrEqual(15.00);
    }

    // Verify last 5 pages are monochrome / gray (₱3.00)
    for (let i = 10; i < 15; i++) {
      expect(result.pageBreakdown[i].tier).toBe(0);
      expect(result.pageBreakdown[i].unitPrice).toBe(3.00);
    }

    // Total must be accurately accumulated
    expect(result.suggestedAdaptiveTotal).toBeGreaterThan(100);
    expect(result.flatColorTotal).toBe(15 * 20.00); // ₱300.00
    expect(result.customerSavings).toBe(result.flatColorTotal - result.suggestedAdaptiveTotal);
  });
});

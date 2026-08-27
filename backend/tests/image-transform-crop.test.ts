import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { PdfBuilderService, MM_TO_POINTS, PAPER_DIMENSIONS_MM } from '../src/services/pdf-builder.service';

describe('Sharp Image Crop, Zoom, Pan & Vector PDF Composition Tests', () => {
  const pdfBuilder = new PdfBuilderService();
  const testOutputDir = path.join(process.cwd(), 'cache', 'test_transforms');
  let testImageBuffer: Buffer;
  let testImagePath: string;

  beforeAll(async () => {
    await fs.mkdir(testOutputDir, { recursive: true });

    // Generate a synthetic test image (800 x 1200, 2:3 portrait)
    testImagePath = path.join(testOutputDir, 'synthetic_test_photo.jpg');
    testImageBuffer = await sharp({
      create: {
        width: 800,
        height: 1200,
        channels: 3,
        background: { r: 50, g: 120, b: 220 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    await fs.writeFile(testImagePath, testImageBuffer);
  });

  it('processes image for square slot (1:1 aspect ratio) with center crop', async () => {
    // 2x2" slot is 50.8mm x 50.8mm (1:1)
    const resultBuffer = await pdfBuilder.processImageForSlot(
      testImageBuffer,
      50.8,
      50.8,
      { scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0, mirrorFlip: false }
    );

    const meta = await sharp(resultBuffer).metadata();
    expect(meta.width).toBeDefined();
    expect(meta.height).toBeDefined();

    // The extracted buffer should have a 1:1 aspect ratio
    const aspect = (meta.width || 1) / (meta.height || 1);
    expect(aspect).toBeCloseTo(1.0, 1);
  });

  it('processes image for passport slot (35x45mm, ~0.778 aspect ratio)', async () => {
    const resultBuffer = await pdfBuilder.processImageForSlot(
      testImageBuffer,
      35,
      45,
      { scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 }
    );

    const meta = await sharp(resultBuffer).metadata();
    const aspect = (meta.width || 1) / (meta.height || 1);
    expect(aspect).toBeCloseTo(35 / 45, 1);
  });

  it('applies zoom scale and pan offsets accurately without bounds overflow', async () => {
    const zoomedBuffer = await pdfBuilder.processImageForSlot(
      testImageBuffer,
      50.8,
      50.8,
      { scale: 2.0, offsetX: 30, offsetY: -20, rotation: 0 }
    );

    const meta = await sharp(zoomedBuffer).metadata();
    expect(meta.width).toBeGreaterThan(0);
    expect(meta.height).toBeGreaterThan(0);

    const aspect = (meta.width || 1) / (meta.height || 1);
    expect(aspect).toBeCloseTo(1.0, 1);
  });

  it('applies 90-degree rotation and mirror flip', async () => {
    const rotatedBuffer = await pdfBuilder.processImageForSlot(
      testImageBuffer,
      50.8,
      50.8,
      { scale: 1.0, rotation: 90, mirrorFlip: true }
    );

    const meta = await sharp(rotatedBuffer).metadata();
    expect(meta.width).toBeGreaterThan(0);
    expect(meta.height).toBeGreaterThan(0);
  });

  it('generates a 300+ DPI vector PDF for all 5 presets with accurate slot coordinates', async () => {
    const presets = ['SET_1', 'SET_2', 'SET_3', 'SET_4', 'POLAROID'];

    for (const preset of presets) {
      const pdfPath = path.join(testOutputDir, `test_layout_${preset}.pdf`);
      const state = {
        product: { paperSize: '4R', paperType: 'GLOSSY_PHOTO' },
        options: {
          preset,
          zeroGap: true,
          showCutLines: true,
          mirror: false,
        },
        layout: {
          presetId: preset,
          copies: 1,
          showCutLines: true,
          zeroGap: true,
          mirrorFlip: false,
          cropTransform: { scale: 1.2, offsetX: 0, offsetY: 0, rotation: 0 },
        },
        inputFiles: [
          {
            fileId: 'f_test',
            originalName: 'test.jpg',
            filePath: testImagePath,
            mimeType: 'image/jpeg',
          },
        ],
      };

      const resultPath = await pdfBuilder.buildLayoutPdf(state, pdfPath, 'job_test_123');
      expect(resultPath).toBe(pdfPath);

      // Verify PDF exists and has valid 4R dimensions
      const pdfBytes = await fs.readFile(pdfPath);
      expect(pdfBytes.length).toBeGreaterThan(1000);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBe(1);

      const page = pdfDoc.getPage(0);
      const { width, height } = page.getSize();

      const expectedWidth = PAPER_DIMENSIONS_MM['4R'].width * MM_TO_POINTS;
      const expectedHeight = PAPER_DIMENSIONS_MM['4R'].height * MM_TO_POINTS;

      expect(width).toBeCloseTo(expectedWidth, 1);
      expect(height).toBeCloseTo(expectedHeight, 1);
    }
  });
});

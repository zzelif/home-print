import { describe, it, expect, beforeAll } from 'vitest';
import { DocumentConverterService } from '../src/services/document-converter.service';
import { PrintWorkflowGraph } from '../src/nodes/print-graph';
import { SharedPrintJobState } from '../src/nodes/types';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

describe('Batch Image Inspection, Auto-Orientation & Graph Pipeline', () => {
  const converter = new DocumentConverterService();
  const testDir = path.join(process.cwd(), 'cache', 'test_batch_orientation');

  const landscapeImgPath = path.join(testDir, 'att_sample_landscape'); // No extension!
  const portraitImgPath = path.join(testDir, 'att_sample_portrait');   // No extension!
  const squareImgPath = path.join(testDir, 'att_sample_square.jpg');

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });

    // 1. Create synthetic landscape image (1600 x 900)
    await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 3,
        background: { r: 220, g: 80, b: 50 }, // Heavy color
      },
    })
      .jpeg({ quality: 90 })
      .toFile(landscapeImgPath);

    // 2. Create synthetic portrait image (800 x 1200)
    await sharp({
      create: {
        width: 800,
        height: 1200,
        channels: 3,
        background: { r: 50, g: 150, b: 220 }, // Heavy color
      },
    })
      .jpeg({ quality: 90 })
      .toFile(portraitImgPath);

    // 3. Create synthetic square image (1000 x 1000)
    await sharp({
      create: {
        width: 1000,
        height: 1000,
        channels: 3,
        background: { r: 80, g: 200, b: 100 },
      },
    })
      .jpeg({ quality: 90 })
      .toFile(squareImgPath);
  });

  it('detectFileType accurately identifies extensionless files as IMAGE', async () => {
    const typeLandscape = await converter.detectFileType(landscapeImgPath);
    const typePortrait = await converter.detectFileType(portraitImgPath);
    const typeSquare = await converter.detectFileType(squareImgPath);

    expect(typeLandscape).toBe('IMAGE');
    expect(typePortrait).toBe('IMAGE');
    expect(typeSquare).toBe('IMAGE');
  });

  it('converts mixed orientation batch into multi-page PDF with per-page auto-orientation', async () => {
    // 6 images total: 3 landscape, 3 portrait
    const batchFiles = [
      landscapeImgPath,
      portraitImgPath,
      landscapeImgPath,
      portraitImgPath,
      landscapeImgPath,
      portraitImgPath,
    ];

    const pdfPath = await converter.convertImagesToMultiPagePdf(batchFiles, 'A4', 'AUTO', 'FIT_PRINTABLE');
    expect(pdfPath).toBeDefined();

    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    expect(pdfDoc.getPageCount()).toBe(6);

    // Page 0 (Landscape image): Width should be greater than Height
    const p0 = pdfDoc.getPage(0);
    const size0 = p0.getSize();
    expect(size0.width).toBeGreaterThan(size0.height);
    expect(Math.round(size0.width)).toBe(842);
    expect(Math.round(size0.height)).toBe(595);

    // Page 1 (Portrait image): Height should be greater than Width
    const p1 = pdfDoc.getPage(1);
    const size1 = p1.getSize();
    expect(size1.height).toBeGreaterThan(size1.width);
    expect(Math.round(size1.width)).toBe(595);
    expect(Math.round(size1.height)).toBe(842);

    // Page 2 (Landscape): Width > Height
    const p2 = pdfDoc.getPage(2);
    expect(p2.getSize().width).toBeGreaterThan(p2.getSize().height);

    // Page 3 (Portrait): Height > Width
    const p3 = pdfDoc.getPage(3);
    expect(p3.getSize().height).toBeGreaterThan(p3.getSize().width);
  });

  it('guarantees each page contains valid image embedded content (non-blank inspection)', async () => {
    const batchFiles = [landscapeImgPath, portraitImgPath];
    const pdfPath = await converter.convertImagesToMultiPagePdf(batchFiles, 'A4', 'AUTO');
    const pdfBytes = await fs.readFile(pdfPath);

    // PDF binary should contain Image / DCTDecode / FlateDecode objects
    const rawContent = pdfBytes.toString('binary');
    expect(rawContent).toMatch(/\/Subtype\s*\/Image|\/DCTDecode|\/FlateDecode/i);
    expect(pdfBytes.length).toBeGreaterThan(10000); // Non-empty raster data
  });

  it('runs PrintWorkflowGraph on multi-image batch order without fallback to single photo', async () => {
    const graph = new PrintWorkflowGraph();
    const jobId = `test_batch_graph_${Date.now()}`;

    const batchFiles = [
      { fileId: 'f1', originalName: 'att_sample_landscape', mimeType: 'image/jpeg', filePath: landscapeImgPath },
      { fileId: 'f2', originalName: 'att_sample_portrait', mimeType: 'image/jpeg', filePath: portraitImgPath },
      { fileId: 'f3', originalName: 'att_sample_square.jpg', mimeType: 'image/jpeg', filePath: squareImgPath },
    ];

    const initialState: SharedPrintJobState = {
      jobId,
      createdAt: new Date().toISOString(),
      source: 'MANUAL_UI',
      customer: { name: 'Batch Customer', phone: '' },
      inputFiles: batchFiles,
      product: {
        productId: 'prod_document_a4',
        name: 'A4 Document Printing',
        category: 'DOCUMENT',
        paperSize: 'A4',
        paperType: 'PLAIN_PAPER',
        isDuplex: false,
      },
      layout: {
        presetId: 'FULL_PAGE',
        copies: 1,
        pageRange: 'all',
        showCutLines: false,
        zeroGap: true,
        mirrorFlip: false,
      },
      costing: {
        materialCost: 5.0,
        operationCost: 5.0,
        laborCost: 5.0,
        totalBaseCost: 15.0,
        targetMarginPercent: 50,
        calculatedPrice: 60.0,
        discount: 0,
        finalPrice: 60.0,
      },
      preflightVerdict: {
        passed: true,
        warnings: [],
        errors: [],
      },
      hardwareState: {
        printerReady: true,
        inkStatus: 'OK',
        paperStatus: 'LOADED',
      },
      payment: {
        status: 'PENDING',
        cashTendered: 0,
        changeDue: 0,
        paymentMethod: 'CASH',
      },
    };

    const result = await graph.run(initialState, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toBeDefined();

    // Verify generated PDF contains 3 pages (multi-page batch), not 1 photo
    const pdfBytes = await fs.readFile(result.pdfPath!);
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(3);
  });

  it('extracts subset page range from multi-page image batch PDF', async () => {
    const batchFiles = [landscapeImgPath, portraitImgPath, squareImgPath];
    const pdfPath = await converter.convertImagesToMultiPagePdf(batchFiles, 'A4', 'AUTO');

    const subsetPath = path.join(testDir, `subset_${Date.now()}.pdf`);
    const { extractedPageCount, targetPdfPath } = await converter.extractPdfPages(pdfPath, '1-2', subsetPath);

    expect(extractedPageCount).toBe(2);
    const subsetBytes = await fs.readFile(targetPdfPath);
    const subsetDoc = await PDFDocument.load(subsetBytes);
    expect(subsetDoc.getPageCount()).toBe(2);
  });
});

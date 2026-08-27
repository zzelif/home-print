import { describe, it, expect, beforeAll } from 'vitest';
import { DocumentConverterService } from '../src/services/document-converter.service';
import { PrintWorkflowGraph } from '../src/nodes/print-graph';
import { SharedPrintJobState } from '../src/nodes/types';
import { PDFDocument, rgb } from 'pdf-lib';
import path from 'path';
import fs from 'fs/promises';

describe('Page Range Printing & Subsetting Pipeline', () => {
  const converter = new DocumentConverterService();
  const graph = new PrintWorkflowGraph();
  const testDir = path.join(process.cwd(), 'cache', 'test_pages');

  let sampleMultiPagePdfPath: string;

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });

    // Create a 5-page sample PDF
    const pdfDoc = await PDFDocument.create();
    for (let i = 1; i <= 5; i++) {
      const page = pdfDoc.addPage([595.28, 841.89]);
      page.drawText(`Page ${i} Content`, {
        x: 50,
        y: 800,
        size: 24,
        color: rgb(0, 0, 0),
      });
    }
    const bytes = await pdfDoc.save();
    sampleMultiPagePdfPath = path.join(testDir, 'sample_5pages.pdf');
    await fs.writeFile(sampleMultiPagePdfPath, bytes);
  });

  describe('parsePageRangeToIndices unit logic', () => {
    it('handles single page strings ("1", "3", "5")', () => {
      expect(converter.parsePageRangeToIndices('1', 5)).toEqual([0]);
      expect(converter.parsePageRangeToIndices('3', 5)).toEqual([2]);
      expect(converter.parsePageRangeToIndices('5', 5)).toEqual([4]);
    });

    it('handles contiguous ranges ("1-3", "2-4", "4-5")', () => {
      expect(converter.parsePageRangeToIndices('1-3', 5)).toEqual([0, 1, 2]);
      expect(converter.parsePageRangeToIndices('2-4', 5)).toEqual([1, 2, 3]);
      expect(converter.parsePageRangeToIndices('4-5', 5)).toEqual([3, 4]);
    });

    it('handles comma-separated and mixed lists ("1,3,5" and "1-2, 4")', () => {
      expect(converter.parsePageRangeToIndices('1,3,5', 5)).toEqual([0, 2, 4]);
      expect(converter.parsePageRangeToIndices('1-2, 4', 5)).toEqual([0, 1, 3]);
    });

    it('handles "all", empty strings, and out-of-bounds inputs gracefully', () => {
      expect(converter.parsePageRangeToIndices('all', 5)).toEqual([0, 1, 2, 3, 4]);
      expect(converter.parsePageRangeToIndices('', 5)).toEqual([0, 1, 2, 3, 4]);
      expect(converter.parsePageRangeToIndices('undefined', 5)).toEqual([0, 1, 2, 3, 4]);
      expect(converter.parsePageRangeToIndices('99', 5)).toEqual([0, 1, 2, 3, 4]);
      expect(converter.parsePageRangeToIndices('1-99', 5)).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('extractPdfPages physical extraction', () => {
    it('extracts exactly 1 selected page from a 5-page PDF into a new physical PDF', async () => {
      const targetPath = path.join(testDir, 'extracted_page_2.pdf');
      const result = await converter.extractPdfPages(sampleMultiPagePdfPath, '2', targetPath);

      expect(result.extractedPageCount).toBe(1);
      expect(result.targetPdfPath).toBe(targetPath);

      // Verify the generated PDF physically has 1 page
      const generatedBytes = await fs.readFile(targetPath);
      const generatedDoc = await PDFDocument.load(generatedBytes);
      expect(generatedDoc.getPageCount()).toBe(1);
    });

    it('extracts custom non-contiguous pages (e.g. "1, 4")', async () => {
      const targetPath = path.join(testDir, 'extracted_pages_1_4.pdf');
      const result = await converter.extractPdfPages(sampleMultiPagePdfPath, '1, 4', targetPath);

      expect(result.extractedPageCount).toBe(2);
      const generatedBytes = await fs.readFile(targetPath);
      const generatedDoc = await PDFDocument.load(generatedBytes);
      expect(generatedDoc.getPageCount()).toBe(2);
    });
  });

  describe('PrintWorkflowGraph with Page Range Subsetting', () => {
    it('dispatches only the selected single page when operator specifies pageRange: "1"', async () => {
      const jobId = `test_range_${Date.now()}`;
      const state: SharedPrintJobState = {
        jobId,
        createdAt: new Date().toISOString(),
        source: 'MANUAL_UI',
        customer: { name: 'Dan Le' },
        inputFiles: [
          {
            fileId: `f_${Date.now()}`,
            originalName: 'Contract_5pages.pdf',
            mimeType: 'application/pdf',
            filePath: sampleMultiPagePdfPath,
          },
        ],
        product: {
          paperSize: 'A4',
          paperType: 'PLAIN_PAPER',
          isDuplex: false,
        },
        layout: {
          presetId: 'SET_1',
          copies: 1,
          pageRange: '1',
          showCutLines: false,
          zeroGap: false,
          mirrorFlip: false,
          cropTransform: { scale: 1, offsetX: 0, offsetY: 0 },
        },
        costing: {
          materialCost: 0.5,
          operationCost: 0.5,
          laborCost: 1.0,
          totalBaseCost: 2.0,
          targetMarginPercent: 50,
          calculatedPrice: 3.0,
          discount: 0,
          finalPrice: 3.0,
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
          status: 'PAID',
          cashTendered: 3,
          changeDue: 0,
          paymentMethod: 'CASH',
        },
      };

      const result = await graph.run(state, { dryRun: true });
      expect(result.success).toBe(true);
      expect(result.pdfPath).toBeDefined();

      // Read the output PDF to assert that it contains EXACTLY 1 page
      const spooledBytes = await fs.readFile(result.pdfPath!);
      const spooledDoc = await PDFDocument.load(spooledBytes);
      expect(spooledDoc.getPageCount()).toBe(1);
    });
  });
});

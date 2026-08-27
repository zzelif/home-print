import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrintWorkflowGraph, FileValidationNode, OrderFreezeGateNode, PreflightVerifierNode } from '../src/nodes/print-graph';
import { SharedPrintJobState } from '../src/nodes/types';
import { PdfBuilderService, OVERSPRAY_BLEED_COMPENSATION, MM_TO_POINTS } from '../src/services/pdf-builder.service';
import fs from 'fs/promises';
import path from 'path';

describe('Print Workflow Graph Pipeline Tests', () => {
  const pdfBuilder = new PdfBuilderService();
  const graph = new PrintWorkflowGraph();
  const testDir = path.join(process.cwd(), 'uploads', 'test_graph');
  const sampleImagePath = path.join(testDir, 'sample_photo.jpg');

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    // Create a 1x1 test JPEG image buffer
    const minimalJpg = Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
      'base64'
    );
    await fs.writeFile(sampleImagePath, minimalJpg);
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  function createSampleState(overrides?: Partial<SharedPrintJobState>): SharedPrintJobState {
    return {
      jobId: `test_job_${Date.now()}`,
      createdAt: new Date().toISOString(),
      source: 'MANUAL_UI',
      customer: { name: 'Juan Dela Cruz', phone: '09123456789' },
      inputFiles: [
        {
          fileId: 'file_1',
          originalName: 'sample_photo.jpg',
          mimeType: 'image/jpeg',
          filePath: sampleImagePath,
        },
      ],
      product: {
        productId: 'prod_rush_id_4r',
        name: '4R Rush ID',
        category: 'RUSH_ID',
        paperSize: '4R',
        paperType: 'GLOSSY_PHOTO',
        isDuplex: false,
      },
      layout: {
        presetId: 'SET_1',
        copies: 1,
        showCutLines: true,
        zeroGap: true,
        mirrorFlip: false,
        cropTransform: { scale: 1.0, offsetX: 0, offsetY: 0 },
      },
      costing: {
        materialCost: 3.5,
        operationCost: 6.5,
        laborCost: 7.5,
        totalBaseCost: 17.5,
        targetMarginPercent: 50,
        calculatedPrice: 40.0,
        discount: 0,
        finalPrice: 40.0,
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
      ...overrides,
    };
  }

  it('FileValidationNode catches missing or empty files', async () => {
    const node = new FileValidationNode();

    // 1. Missing files
    const emptyState = createSampleState({ inputFiles: [] });
    const emptyResult = await node.execute(emptyState);
    expect(emptyResult.preflightVerdict.passed).toBe(false);
    expect(emptyResult.preflightVerdict.errors.length).toBeGreaterThan(0);

    // 2. Non-existent file path
    const invalidState = createSampleState({
      inputFiles: [{ fileId: 'f2', originalName: 'none.jpg', mimeType: 'image/jpeg', filePath: '/invalid/path.jpg' }],
    });
    const invalidResult = await node.execute(invalidState);
    expect(invalidResult.preflightVerdict.passed).toBe(false);
  });

  it('OrderFreezeGateNode rejects negative prices and 0 copies', async () => {
    const node = new OrderFreezeGateNode();

    const negativeState = createSampleState({
      costing: { materialCost: 0, operationCost: 0, laborCost: 0, totalBaseCost: 0, targetMarginPercent: 0, calculatedPrice: -10, discount: 0, finalPrice: -10 },
    });
    const negResult = await node.execute(negativeState);
    expect(negResult.preflightVerdict.passed).toBe(false);

    const zeroCopiesState = createSampleState({
      layout: { presetId: 'SET_1', copies: 0, showCutLines: true, zeroGap: true, mirrorFlip: false, cropTransform: { scale: 1, offsetX: 0, offsetY: 0 } },
    });
    const zeroResult = await node.execute(zeroCopiesState);
    expect(zeroResult.preflightVerdict.passed).toBe(false);
  });

  it('PdfBuilderService resolves preset bounding boxes and applies bleed scaling', () => {
    const boxesSet1 = pdfBuilder.resolvePresetBoxes('SET_1', true);
    expect(boxesSet1.length).toBe(12); // 4x 2x2 + 8x 1x1

    const boxesSet2 = pdfBuilder.resolvePresetBoxes('SET_2', true);
    expect(boxesSet2.length).toBe(6); // 6x 2x2

    const boxesSet4 = pdfBuilder.resolvePresetBoxes('SET_4', true);
    expect(boxesSet4.length).toBe(6); // 6x Passport

    // Verify 4R overspray bleed factor
    expect(OVERSPRAY_BLEED_COMPENSATION).toBe(0.985);
    const scaledWidthPt = 50.8 * OVERSPRAY_BLEED_COMPENSATION * MM_TO_POINTS;
    expect(scaledWidthPt).toBeCloseTo(141.84, 1);
  });

  it('runs full PrintWorkflowGraph end-to-end in dry-run mode with progress telemetry', async () => {
    const state = createSampleState();
    const progressEvents: Array<{ nodeName: string; progress: number }> = [];

    const result = await graph.run(state, {
      dryRun: true,
      onProgress: (nodeName, progress) => {
        progressEvents.push({ nodeName, progress });
      },
    });

    expect(result.success).toBe(true);
    expect(result.trace.length).toBeGreaterThan(0);
    expect(progressEvents.length).toBeGreaterThan(0);
    expect(result.pdfPath).toBeDefined();

    // Verify output PDF was generated
    if (result.pdfPath) {
      const stats = await fs.stat(result.pdfPath);
      expect(stats.size).toBeGreaterThan(500);
      // Clean up test generated file
      try {
        await fs.unlink(result.pdfPath);
      } catch {}
    }
  });

  it('traps preflight failure and halts before hardware dispatch', async () => {
    // Create state pointing to invalid file
    const faultyState = createSampleState({
      inputFiles: [
        { fileId: 'f_bad', originalName: 'corrupt.jpg', mimeType: 'image/jpeg', filePath: '/fake/nonexistent.jpg' },
      ],
    });

    const result = await graph.run(faultyState, { dryRun: true });
    expect(result.success).toBe(false);
    expect(result.trace.some(t => t.status === 'FAILED')).toBe(true);
  });
});

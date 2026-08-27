import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getDatabase } from '../db/database';
import { CupsDriverService } from '../services/cups-driver.service';
import { PrintWorkflowGraph } from '../nodes/print-graph';
import { SharedPrintJobState } from '../nodes/types';
import { wsHub } from './ws';
import path from 'path';
import fs from 'fs/promises';

export const operatorPrintRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const db = getDatabase();
  const cupsDriver = new CupsDriverService();
  const printGraph = new PrintWorkflowGraph();

  const spoolDir = path.join(process.cwd(), 'cache', 'spool');
  await fs.mkdir(spoolDir, { recursive: true });

  // Query real-time printer status
  fastify.get('/api/operator/print/status', async (req, reply) => {
    const status = await cupsDriver.getPrinterStatus();
    return reply.send({ status });
  });

  // Execute print pipeline via Graph Engine (Ingest -> Validate -> Convert -> Freeze -> Composite -> Preflight -> CUPS)
  fastify.post('/api/operator/print/dispatch', async (req, reply) => {
    const { jobId, state } = req.body as { jobId: string; state: any };

    if (!jobId || !state) {
      return reply.status(400).send({
        success: false,
        error: 'Job ID and layout state are required.',
      });
    }

    try {
      const printerStatus = await cupsDriver.getPrinterStatus();

      // Check physical hardware connectivity
      if (!printerStatus.isOnline) {
        return reply.send({
          success: false,
          isOffline: true,
          error: `Target printer "${printerStatus.activePrinterName}" is Offline or Disconnected. Please ensure the printer is turned ON and plugged into the USB port or connected to Wi-Fi.`,
        });
      }

      // Populate input files from database if not present in payload
      const inputFiles = state.inputFiles && state.inputFiles.length > 0
        ? state.inputFiles
        : (db.prepare('SELECT id as fileId, original_filename as originalName, stored_path as filePath, mime_type as mimeType FROM job_files WHERE job_id = ?').all(jobId) as any[]);

      // Build SharedPrintJobState
      const graphState: SharedPrintJobState = {
        jobId,
        createdAt: new Date().toISOString(),
        source: state.source || 'MANUAL_UI',
        customer: {
          name: state.customer?.name || 'Customer',
          phone: state.customer?.phone || '',
        },
        inputFiles: inputFiles.map((f: any) => ({
          fileId: f.fileId || f.id || `file_${Date.now()}`,
          originalName: f.originalName || f.original_filename || 'image.jpg',
          mimeType: f.mimeType || f.mime_type || 'image/jpeg',
          filePath: f.filePath || f.stored_path,
        })),
        product: {
          productId: state.product?.productId || 'prod_rush_id_4r',
          name: state.product?.name || '4R Rush ID',
          category: state.product?.category || 'RUSH_ID',
          paperSize: state.product?.paperSize || '4R',
          paperType: state.product?.paperType || 'GLOSSY_PHOTO',
          isDuplex: !!state.product?.isDuplex,
        },
        layout: {
          presetId: state.options?.preset || state.layout?.presetId || 'SET_1',
          copies: state.options?.copies || state.layout?.copies || 1,
          pageRange: state.options?.pageRange || state.layout?.pageRange || 'all',
          showCutLines: state.options?.showCutLines ?? state.layout?.showCutLines ?? true,
          zeroGap: state.options?.zeroGap ?? state.layout?.zeroGap ?? true,
          mirrorFlip: state.options?.mirror ?? state.layout?.mirrorFlip ?? false,
          cropTransform: state.layout?.cropTransform || { scale: 1.0, offsetX: 0, offsetY: 0 },
          boxes: state.layout?.boxes,
        },
        costing: {
          materialCost: state.costing?.materialCost || 3.5,
          operationCost: state.costing?.operationCost || 6.5,
          laborCost: state.costing?.laborCost || 7.5,
          totalBaseCost: state.costing?.totalBaseCost || 17.5,
          targetMarginPercent: state.costing?.targetMarginPercent || 50,
          calculatedPrice: state.costing?.calculatedPrice || 40.0,
          discount: state.costing?.discount || 0,
          finalPrice: state.costing?.finalPrice || 40.0,
        },
        preflightVerdict: {
          passed: true,
          warnings: [],
          errors: [],
        },
        hardwareState: {
          printerReady: printerStatus.isOnline,
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

      // Execute through the Graph Engine
      const executionResult = await printGraph.run(graphState);

      if (!executionResult.success) {
        return reply.status(400).send({
          success: false,
          error: executionResult.error || 'Print pipeline preflight failed.',
          trace: executionResult.trace,
        });
      }

      wsHub.broadcast('JOB_STATE_CHANGED', {
        jobId,
        status: 'PRINTING',
        cupsJobId: executionResult.cupsJobId,
      });

      return reply.send({
        success: true,
        cupsJobId: executionResult.cupsJobId,
        pdfPath: executionResult.pdfPath,
        trace: executionResult.trace,
        message: `Job spooled directly to ${printerStatus.activePrinterName}!`,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: `Print graph pipeline failed: ${err.message}`,
      });
    }
  });

  // 1-Click Driver Swatch Calibration Test
  fastify.post('/api/operator/print/test-swatch', async (req, reply) => {
    try {
      const res = await cupsDriver.printCalibrationSwatch();
      return reply.send(res);
    } catch (err: any) {
      return reply.status(500).send({ error: `Calibration test failed: ${err.message}` });
    }
  });
};

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getDatabase } from '../db/database';
import { CupsDriverService } from '../services/cups-driver.service';
import { PdfBuilderService } from '../services/pdf-builder.service';
import { PpdDiscoveryService } from '../services/ppd-discovery.service';
import { wsHub } from './ws';
import path from 'path';
import fs from 'fs/promises';

export const operatorPrintRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const db = getDatabase();
  const cupsDriver = new CupsDriverService();
  const pdfBuilder = new PdfBuilderService();
  const ppdDiscovery = new PpdDiscoveryService();

  const spoolDir = path.join(process.cwd(), 'cache', 'spool');
  await fs.mkdir(spoolDir, { recursive: true });

  // Query real-time printer status
  fastify.get('/api/operator/print/status', async (req, reply) => {
    const status = await cupsDriver.getPrinterStatus();
    return reply.send({ status });
  });

  // Execute print pipeline (PDF compilation + CUPS spooling)
  fastify.post('/api/operator/print/dispatch', async (req, reply) => {
    const { jobId, state } = req.body as any;

    if (!jobId || !state) {
      return reply.status(400).send({ error: 'Job ID and layout state are required.' });
    }

    try {
      const pdfPath = path.join(spoolDir, `${jobId}_rendered.pdf`);
      await pdfBuilder.buildLayoutPdf(state, pdfPath);

      // Save generated PDF path to database
      db.prepare('UPDATE job_orders SET pdf_path = ?, status = ? WHERE id = ?').run(pdfPath, 'PRINTING', jobId);

      // Dispatch to CUPS
      const { cupsJobId } = await cupsDriver.dispatchJob(pdfPath, {
        paperSize: state.product.paperSize || '4R',
        paperType: state.product.paperType || 'GLOSSY_PHOTO',
        copies: state.layout.copies || 1,
        isDuplex: state.product.isDuplex || false,
      });

      wsHub.broadcast('JOB_STATE_CHANGED', { jobId, status: 'PRINTING', cupsJobId });

      return reply.send({
        success: true,
        cupsJobId,
        message: 'Job spooled directly to HP Smart Tank 670.',
      });
    } catch (err: any) {
      return reply.status(500).send({ error: `Print dispatch failed: ${err.message}` });
    }
  });

  // 1-Click Reprint Cached PDF
  fastify.post('/api/operator/print/reprint/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = db.prepare('SELECT * FROM job_orders WHERE id = ?').get(id) as any;

    if (!job || !job.pdf_path) {
      return reply.status(404).send({ error: 'No cached PDF available for reprint.' });
    }

    try {
      const { cupsJobId } = await cupsDriver.dispatchJob(job.pdf_path, {
        paperSize: '4R',
        paperType: 'GLOSSY_PHOTO',
        copies: 1,
      });

      wsHub.broadcast('JOB_STATE_CHANGED', { jobId: id, status: 'PRINTING', cupsJobId, isReprint: true });
      return reply.send({ success: true, cupsJobId, message: 'Reprint job dispatched successfully.' });
    } catch (err: any) {
      return reply.status(500).send({ error: `Reprint failed: ${err.message}` });
    }
  });

  // 1-Click Driver Swatch Calibration Test
  fastify.post('/api/operator/print/test-swatch', async (req, reply) => {
    try {
      const testPdfPath = path.join(spoolDir, `calibration_swatch_${Date.now()}.pdf`);
      // Build a minimalist calibration PDF with a 1-inch B&W swatch
      const dummyState: any = {
        product: { paperSize: 'A4', paperType: 'PLAIN_PAPER', isDuplex: false },
        inputFiles: [],
        layout: { presetId: 'FREE', copies: 1, showCutLines: true, boxes: [{ xMm: 20, yMm: 20, widthMm: 25.4, heightMm: 25.4 }] },
      };
      await pdfBuilder.buildLayoutPdf(dummyState, testPdfPath);
      await cupsDriver.dispatchJob(testPdfPath, { paperSize: 'A4', paperType: 'PLAIN_PAPER', copies: 1 });

      return reply.send({ success: true, message: 'Calibration swatch dispatched to printer.' });
    } catch (err: any) {
      return reply.status(500).send({ error: `Calibration test failed: ${err.message}` });
    }
  });
};

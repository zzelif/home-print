import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { getDatabase } from '../db/database';
import { wsHub } from './ws';

export const publicDropRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });

  // Public batch upload endpoint for multiple files dropped by customer at /drop
  fastify.post('/api/public/upload-batch', async (req, reply) => {
    const parts = req.files();
    const uploadedFiles: Array<{ filename: string; storedPath: string; mimeType: string; size: number }> = [];
    let customerName = 'Anonymous Customer';
    let customerPhone = '';
    let serviceRequested = 'DOCUMENT';

    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    for await (const part of parts) {
      const p = part as any;
      if (p.type === 'field') {
        if (p.fieldname === 'customerName') customerName = (p.value as string) || customerName;
        if (p.fieldname === 'customerPhone') customerPhone = (p.value as string) || customerPhone;
        if (p.fieldname === 'service') serviceRequested = (p.value as string) || serviceRequested;
      } else if (p.file) {
        const fileId = `file_${crypto.randomBytes(4).toString('hex')}`;
        const ext = path.extname(p.filename) || '.jpg';
        const storedPath = path.join(uploadDir, `${fileId}${ext}`);
        const buffer = await p.toBuffer();
        await fs.writeFile(storedPath, buffer);
        uploadedFiles.push({
          filename: p.filename,
          storedPath,
          mimeType: p.mimetype,
          size: buffer.length,
        });
      }
    }

    if (uploadedFiles.length === 0) {
      return reply.status(400).send({ error: 'No files uploaded.' });
    }

    const pageCount = uploadedFiles.length;
    const db = getDatabase();
    const initialPrice = serviceRequested === 'DOCUMENT' ? pageCount * 3.0 : 40.0;

    // Create single job order for all files in this batch
    db.prepare(`
      INSERT INTO job_orders (id, customer_name, customer_phone, source, status, copies, selling_price, final_amount)
      VALUES (?, ?, ?, 'QR_DROP', 'UPLOADED', 1, ?, ?)
    `).run(jobId, customerName, customerPhone, initialPrice, initialPrice);

    for (const file of uploadedFiles) {
      const fileId = `file_${crypto.randomBytes(4).toString('hex')}`;
      db.prepare(`
        INSERT INTO job_files (id, job_id, original_filename, stored_path, mime_type, file_size_bytes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(fileId, jobId, file.filename, file.storedPath, file.mimeType, file.size);
    }

    // Broadcast to Counter Operator
    wsHub.broadcast('NEW_JOB_INGESTED', {
      jobId,
      customerName,
      source: 'QR_DROP',
      filename: `${uploadedFiles[0].filename}${uploadedFiles.length > 1 ? ` (+${uploadedFiles.length - 1} more)` : ''}`,
      fileSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
      pageCount,
      createdAt: new Date().toISOString(),
    });

    return reply.send({
      success: true,
      jobId,
      trackingCode: jobId.replace('job_', ''),
      pageCount,
      fileCount: uploadedFiles.length,
      message: `${uploadedFiles.length} file(s) received successfully. Please inform the shop operator.`,
    });
  });

  // Public upload endpoint for single file at /drop
  fastify.post('/api/public/upload', async (req, reply) => {
    const data = await req.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded.' });
    }

    const customerName = (data.fields.customerName as any)?.value || 'Anonymous Customer';
    const customerPhone = (data.fields.customerPhone as any)?.value || '';
    const serviceRequested = (data.fields.service as any)?.value || 'RUSH_ID';

    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const fileId = `file_${crypto.randomBytes(4).toString('hex')}`;
    const ext = path.extname(data.filename) || '.jpg';
    const storedPath = path.join(uploadDir, `${fileId}${ext}`);

    // Stream buffer to disk
    const buffer = await data.toBuffer();
    await fs.writeFile(storedPath, buffer);

    // Detect real page count for PDF documents
    let pageCount = 1;
    if (data.mimetype === 'application/pdf' || ext.toLowerCase() === '.pdf') {
      try {
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        pageCount = pdfDoc.getPageCount();
      } catch (err) {
        console.warn('Could not parse PDF page count with pdf-lib, defaulting to 1:', err);
        pageCount = 1;
      }
    }

    const db = getDatabase();
    
    // Create Job Order with initial price calculation
    const initialPrice = serviceRequested === 'DOCUMENT' ? pageCount * 3.0 : 40.0;

    const insertJob = db.prepare(`
      INSERT INTO job_orders (id, customer_name, customer_phone, source, status, copies, selling_price, final_amount)
      VALUES (?, ?, ?, 'QR_DROP', 'UPLOADED', 1, ?, ?)
    `);
    insertJob.run(jobId, customerName, customerPhone, initialPrice, initialPrice);

    // Record File with real page count
    const insertFile = db.prepare(`
      INSERT INTO job_files (id, job_id, original_filename, stored_path, mime_type, file_size_bytes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertFile.run(fileId, jobId, data.filename, storedPath, data.mimetype, buffer.length);

    // Notify Operator Screen via WebSocket
    wsHub.broadcast('NEW_JOB_INGESTED', {
      jobId,
      customerName,
      source: 'QR_DROP',
      filename: data.filename,
      fileSize: buffer.length,
      pageCount,
      createdAt: new Date().toISOString(),
    });

    return reply.send({
      success: true,
      jobId,
      trackingCode: jobId.replace('job_', ''),
      pageCount,
      message: 'File received successfully. Please inform the shop operator.',
    });
  });

  // Public status check
  fastify.get('/api/public/status/:jobId', async (req, reply) => {
    const { jobId } = req.params as { jobId: string };
    const db = getDatabase();
    const job = db.prepare('SELECT id, status, customer_name, created_at FROM job_orders WHERE id = ?').get(jobId);

    if (!job) {
      return reply.status(404).send({ error: 'Job order not found.' });
    }
    return reply.send({ job });
  });
};

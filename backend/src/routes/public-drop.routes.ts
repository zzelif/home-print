import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { getDatabase } from '../db/database';
import { wsHub } from './ws';

export const publicDropRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });

  // Public upload endpoint for customers at /drop
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

    const db = getDatabase();
    
    // Create Job Order
    const insertJob = db.prepare(`
      INSERT INTO job_orders (id, customer_name, customer_phone, source, status, copies)
      VALUES (?, ?, ?, 'QR_DROP', 'UPLOADED', 1)
    `);
    insertJob.run(jobId, customerName, customerPhone);

    // Record File
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
      createdAt: new Date().toISOString(),
    });

    return reply.send({
      success: true,
      jobId,
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

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getDatabase } from '../db/database';
import { wsHub } from './ws';
import crypto from 'crypto';

export const operatorJobsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const db = getDatabase();

  // Get active queue & inbox
  fastify.get('/api/operator/jobs', async (req, reply) => {
    const jobs = db.prepare(`
      SELECT j.*, 
        json_group_array(json_object(
          'id', f.id, 
          'originalName', f.original_filename, 
          'filePath', f.stored_path, 
          'mimeType', f.mime_type, 
          'fileSize', f.file_size_bytes
        )) as files
      FROM job_orders j
      LEFT JOIN job_files f ON j.id = f.job_id
      GROUP BY j.id
      ORDER BY j.created_at DESC
      LIMIT 100
    `).all();

    const formattedJobs = jobs.map((job: any) => ({
      ...job,
      files: JSON.parse(job.files || '[]').filter((f: any) => f.id !== null),
    }));

    return reply.send({ jobs: formattedJobs });
  });

  // Get single job details
  fastify.get('/api/operator/jobs/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = db.prepare('SELECT * FROM job_orders WHERE id = ?').get(id);
    if (!job) return reply.status(404).send({ error: 'Job not found.' });

    const files = db.prepare('SELECT * FROM job_files WHERE job_id = ?').all(id);
    return reply.send({ job: { ...job, files } });
  });

  // Create manual job (e.g. walk-in customer with USB or hardcopy)
  fastify.post('/api/operator/jobs', async (req, reply) => {
    const body = req.body as any;
    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const customerName = body.customerName || 'Walk-in Customer';
    const source = body.source || 'MANUAL_UI'; // MANUAL_UI | MESSENGER | GMAIL | USB_SANDBOX

    const insert = db.prepare(`
      INSERT INTO job_orders (id, customer_name, source, product_id, status, copies, selling_price, final_amount)
      VALUES (?, ?, ?, ?, 'IN_LAYOUT', ?, ?, ?)
    `);
    insert.run(jobId, customerName, source, body.productId || null, body.copies || 1, body.sellingPrice || 0, body.finalAmount || 0);

    wsHub.broadcast('JOB_STATE_CHANGED', { jobId, status: 'IN_LAYOUT' });
    return reply.send({ success: true, jobId });
  });

  // Update status (e.g. IN_LAYOUT, READY_TO_PRINT, CANCELLED)
  fastify.patch('/api/operator/jobs/:id/status', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: string };

    const update = db.prepare('UPDATE job_orders SET status = ? WHERE id = ?');
    update.run(status, id);

    wsHub.broadcast('JOB_STATE_CHANGED', { jobId: id, status });
    return reply.send({ success: true });
  });

  // Complete checkout & record cash change
  fastify.post('/api/operator/jobs/:id/complete', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { cashTendered, changeGiven, paymentMethod } = req.body as {
      cashTendered: number;
      changeGiven: number;
      paymentMethod?: 'CASH' | 'GCASH';
    };

    const update = db.prepare(`
      UPDATE job_orders 
      SET status = 'COMPLETED', 
          payment_status = 'PAID', 
          cash_tendered = ?, 
          change_given = ?, 
          payment_method = ?,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    update.run(cashTendered, changeGiven, paymentMethod || 'CASH', id);

    wsHub.broadcast('JOB_STATE_CHANGED', { jobId: id, status: 'COMPLETED', paymentStatus: 'PAID' });
    return reply.send({ success: true, message: 'Job completed and payment recorded.' });
  });
};

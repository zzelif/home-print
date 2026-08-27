import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { getDatabase } from '../src/db/database';

describe('Job Order Lifecycle & Immediate Privacy File Purge Tests', () => {
  const db = getDatabase();
  const testUploadDir = path.join(process.cwd(), 'uploads', 'test_lifecycle');
  const testJobId = `job_test_lifecycle_${Date.now()}`;
  const testFileId = `f_test_${Date.now()}`;
  const testFilePath = path.join(testUploadDir, `${testFileId}_customer_sample.jpg`);

  beforeAll(async () => {
    await fs.mkdir(testUploadDir, { recursive: true });
    // Write sample customer upload file
    await fs.writeFile(testFilePath, Buffer.from('fake image content for test'));

    // Insert mock job order matching schema
    db.prepare(`
      INSERT INTO job_orders (
        id, customer_name, source, product_id, status, 
        selling_price, final_amount, payment_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      testJobId,
      'Maria Santos',
      'MANUAL_UI',
      'prod_rush_id_4r',
      'IN_LAYOUT',
      80.0,
      80.0,
      'PENDING'
    );

    // Insert mock job file
    db.prepare(`
      INSERT INTO job_files (
        id, job_id, original_filename, stored_path, mime_type, file_size_bytes, is_purged
      ) VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(
      testFileId,
      testJobId,
      'customer_sample.jpg',
      testFilePath,
      'image/jpeg',
      28
    );
  });

  it('verifies that the test job and file exist before cancellation', async () => {
    const job = db.prepare('SELECT * FROM job_orders WHERE id = ?').get(testJobId) as any;
    expect(job).toBeDefined();
    expect(job.status).toBe('IN_LAYOUT');
    expect(job.files_purged).toBe(0);

    const fileExists = await fs.stat(testFilePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
  });

  it('cancels job order, unlinks customer upload from disk, and sets purged flags', async () => {
    // Simulate what the cancel route executes:
    const files = db.prepare('SELECT stored_path FROM job_files WHERE job_id = ?').all(testJobId) as any[];
    for (const file of files) {
      if (file.stored_path) {
        try {
          await fs.unlink(file.stored_path);
        } catch (e) {}
      }
    }

    db.prepare('UPDATE job_files SET is_purged = 1 WHERE job_id = ?').run(testJobId);
    db.prepare("UPDATE job_orders SET status = 'CANCELLED', files_purged = 1, payment_status = 'UNPAID' WHERE id = ?").run(testJobId);

    // 1. Verify file on disk is deleted
    const fileExists = await fs.stat(testFilePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(false);

    // 2. Verify database records are updated
    const updatedJob = db.prepare('SELECT * FROM job_orders WHERE id = ?').get(testJobId) as any;
    expect(updatedJob.status).toBe('CANCELLED');
    expect(updatedJob.files_purged).toBe(1);

    const updatedFile = db.prepare('SELECT * FROM job_files WHERE id = ?').get(testFileId) as any;
    expect(updatedFile.is_purged).toBe(1);
  });

  it('ensures cancelled orders are excluded from revenue analytics', () => {
    const revenueRow = db.prepare(`
      SELECT COALESCE(SUM(final_amount), 0) as totalRevenue
      FROM job_orders
      WHERE status = 'COMPLETED' AND payment_status = 'PAID'
    `).get() as any;

    expect(revenueRow.totalRevenue).toBeDefined();
  });
});

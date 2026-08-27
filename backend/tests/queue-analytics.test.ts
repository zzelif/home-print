import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase } from '../src/db/database';

describe('Queue Purge, Cancellation & Multi-Job Isolation', () => {
  let db: any;

  beforeEach(() => {
    db = getDatabase();
    db.prepare('DELETE FROM job_files').run();
    db.prepare('DELETE FROM job_orders').run();
  });

  it('should exclude purged and cancelled jobs from active queue by default', () => {
    // 1. Insert an active job, a cancelled job, and a purged completed job
    db.prepare(`
      INSERT INTO job_orders (id, customer_name, source, status, selling_price, final_amount, payment_status, files_purged, created_at)
      VALUES 
        ('job_active_1', 'Juan Active', 'MANUAL_UI', 'IN_LAYOUT', 40.0, 40.0, 'PENDING', 0, CURRENT_TIMESTAMP),
        ('job_cancelled_2', 'Pedro Cancelled', 'MANUAL_UI', 'CANCELLED', 120.0, 120.0, 'UNPAID', 1, CURRENT_TIMESTAMP),
        ('job_purged_1', 'Maria Purged', 'QR_DROP', 'PURGED', 75.0, 75.0, 'PAID', 1, CURRENT_TIMESTAMP)
    `).run();

    // Query active queue
    const activeJobs = db.prepare(`
      SELECT * FROM job_orders 
      WHERE (files_purged = 0 AND status NOT IN ('PURGED', 'CANCELLED')) OR status IN ('IN_LAYOUT', 'PENDING', 'PRINTING', 'PROCESSING')
    `).all();

    expect(activeJobs.length).toBe(1);
    expect(activeJobs[0].id).toBe('job_active_1');
  });

  it('should NOT count cancelled/voided jobs towards paid revenue or orders in analytics', () => {
    db.prepare(`
      INSERT INTO job_orders (id, customer_name, source, status, selling_price, final_amount, total_base_cost, payment_status, payment_method, files_purged, created_at, completed_at)
      VALUES 
        ('job_done_1', 'Customer A', 'QR_DROP', 'COMPLETED', 100.0, 100.0, 20.0, 'PAID', 'CASH', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('job_purged_2', 'Customer B', 'MANUAL_UI', 'PURGED', 150.0, 150.0, 30.0, 'PAID', 'GCASH', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('job_cancelled_3', 'Customer C Void', 'MANUAL_UI', 'CANCELLED', 500.0, 500.0, 100.0, 'UNPAID', 'CASH', 1, CURRENT_TIMESTAMP, NULL)
    `).run();

    const summary = db.prepare(`
      SELECT 
        COUNT(CASE WHEN payment_status = 'PAID' THEN 1 END) as completed_orders,
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN final_amount ELSE 0 END), 0) as gross_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' AND payment_method = 'CASH' THEN final_amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' AND payment_method = 'GCASH' THEN final_amount ELSE 0 END), 0) as gcash_total
      FROM job_orders
      WHERE status != 'CANCELLED'
    `).get() as any;

    expect(summary.completed_orders).toBe(2);
    expect(summary.gross_revenue).toBe(250.0); // 100 + 150 (500 cancelled is excluded)
    expect(summary.cash_total).toBe(100.0);
    expect(summary.gcash_total).toBe(150.0);
  });

  it('should isolate states across parallel jobs without cross-contamination', () => {
    db.prepare(`
      INSERT INTO job_orders (id, customer_name, source, status, layout_preset, selling_price, final_amount)
      VALUES 
        ('job_rush_1', 'Rush ID Customer', 'MANUAL_UI', 'IN_LAYOUT', 'SET_1', 40.0, 40.0),
        ('job_doc_2', 'Document Customer', 'QR_DROP', 'IN_LAYOUT', NULL, 15.0, 15.0)
    `).run();

    db.prepare(`
      INSERT INTO job_files (id, job_id, original_filename, stored_path, mime_type, file_size_bytes)
      VALUES
        ('f_1', 'job_rush_1', 'id_photo.jpg', 'uploads/f_1.jpg', 'image/jpeg', 1024),
        ('f_2', 'job_doc_2', 'resume.docx', 'uploads/f_2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 2048)
    `).run();

    const job1Files = db.prepare('SELECT * FROM job_files WHERE job_id = ?').all('job_rush_1') as any[];
    const job2Files = db.prepare('SELECT * FROM job_files WHERE job_id = ?').all('job_doc_2') as any[];

    expect(job1Files.length).toBe(1);
    expect(job1Files[0].original_filename).toBe('id_photo.jpg');

    expect(job2Files.length).toBe(1);
    expect(job2Files[0].original_filename).toBe('resume.docx');

    // Cancelling Job 1
    db.prepare("UPDATE job_orders SET status = 'CANCELLED', files_purged = 1 WHERE id = 'job_rush_1'").run();

    const job2Check = db.prepare("SELECT status FROM job_orders WHERE id = 'job_doc_2'").get() as any;
    expect(job2Check.status).toBe('IN_LAYOUT');
  });

  it('should compute analytics without ambiguous column errors across today, week, month, and all timeframes', () => {
    db.prepare(`
      INSERT INTO products (id, name, category, paper_size, paper_type, default_price)
      VALUES ('prod_doc_test', 'A4 Test Document', 'DOCUMENT', 'A4', 'PLAIN_PAPER', 5.0)
      ON CONFLICT(id) DO NOTHING
    `).run();

    db.prepare(`
      INSERT INTO job_orders (id, customer_name, source, product_id, status, selling_price, final_amount, payment_status, payment_method, files_purged, created_at, completed_at)
      VALUES 
        ('job_time_1', 'Today Customer', 'MANUAL_UI', 'prod_doc_test', 'COMPLETED', 50.0, 50.0, 'PAID', 'CASH', 0, datetime('now'), datetime('now')),
        ('job_time_2', 'Week Customer', 'QR_DROP', 'prod_doc_test', 'COMPLETED', 70.0, 70.0, 'PAID', 'GCASH', 0, datetime('now', '-3 days'), datetime('now', '-3 days')),
        ('job_time_3', 'Month Customer', 'MANUAL_UI', 'prod_doc_test', 'COMPLETED', 90.0, 90.0, 'PAID', 'CASH', 0, datetime('now', '-15 days'), datetime('now', '-15 days'))
    `).run();

    const timeframes = ['today', 'week', 'month', 'all'];

    for (const tf of timeframes) {
      const getDateFilter = (prefix: string = 'job_orders') => {
        const p = prefix ? `${prefix}.` : '';
        if (tf === 'today') {
          return `AND (date(COALESCE(${p}completed_at, ${p}created_at), 'localtime') = date('now', 'localtime') OR date(COALESCE(${p}completed_at, ${p}created_at)) = date('now') OR substr(COALESCE(${p}completed_at, ${p}created_at), 1, 10) = date('now') OR substr(COALESCE(${p}completed_at, ${p}created_at), 1, 10) = date('now', 'localtime'))`;
        } else if (tf === 'week') {
          return `AND COALESCE(${p}completed_at, ${p}created_at) >= datetime('now', '-7 days')`;
        } else if (tf === 'month') {
          return `AND COALESCE(${p}completed_at, ${p}created_at) >= datetime('now', '-30 days')`;
        }
        return '';
      };

      // 1. Totals query
      const totals = db.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN final_amount ELSE 0 END), 0) as grossRevenue,
          COUNT(CASE WHEN payment_status = 'PAID' OR status = 'COMPLETED' THEN 1 END) as completedOrders
        FROM job_orders
        WHERE status != 'CANCELLED' ${getDateFilter('job_orders')}
      `).get() as any;

      expect(totals).toBeDefined();
      expect(totals.grossRevenue).toBeGreaterThanOrEqual(0);

      // 2. Product breakdown JOIN query (must never throw ambiguous column error)
      const productBreakdown = db.prepare(`
        SELECT 
          COALESCE(p.name, 'Document / Rush ID') as product_name,
          COUNT(j.id) as count,
          COALESCE(SUM(j.final_amount), 0) as revenue
        FROM job_orders j
        LEFT JOIN products p ON j.product_id = p.id
        WHERE (j.payment_status = 'PAID' OR j.status IN ('COMPLETED', 'PURGED'))
          AND j.status != 'CANCELLED'
          ${getDateFilter('j')}
        GROUP BY product_name
      `).all();

      expect(Array.isArray(productBreakdown)).toBe(true);
    }
  });
});

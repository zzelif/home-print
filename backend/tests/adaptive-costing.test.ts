import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CostingCalculatorService } from '../src/services/costing-calculator.service';
import { DocumentConverterService, PageColorAnalysis } from '../src/services/document-converter.service';
import { getDatabase } from '../src/db/database';
import fs from 'fs';
import path from 'path';

describe('2026 Adaptive Ink-Coverage Pricing & Unit Economics', () => {
  const costingService = new CostingCalculatorService();
  const converterService = new DocumentConverterService();

  it('correctly calculates adaptive mixed-page pricing for a 20-page document', () => {
    // 18 pages B&W, 1 page accent color logo, 1 page full color photo
    const pages: PageColorAnalysis[] = [];
    for (let i = 1; i <= 18; i++) {
      pages.push({
        pageNumber: i,
        tier: 0,
        tierName: 'Monochrome (B&W)',
        unitPrice: 3.00,
        estimatedCoverage: '0% Color',
      });
    }
    pages.push({
      pageNumber: 19,
      tier: 1,
      tierName: 'Accent / Logo Color',
      unitPrice: 5.00,
      estimatedCoverage: '<5% Logo',
    });
    pages.push({
      pageNumber: 20,
      tier: 3,
      tierName: 'Heavy / Full Photo Color',
      unitPrice: 10.00,
      estimatedCoverage: '>25% Full Color',
    });

    const result = costingService.calculateAdaptiveDocumentPrice(pages, 1, 0);

    // 18 * 3 = 54 + 5 + 10 = 69.00
    expect(result.finalTotal).toBe(69.00);
    expect(result.monochromeCount).toBe(18);
    expect(result.accentColorCount).toBe(1);
    expect(result.heavyColorCount).toBe(1);
    expect(result.flatColorTotal).toBe(400.00); // 20 * 20.00
    expect(result.customerSavings).toBe(331.00); // 400 - 69
  });

  it('calculates multiple copies accurately with discounts', () => {
    const pages: PageColorAnalysis[] = [
      { pageNumber: 1, tier: 0, tierName: 'B&W', unitPrice: 3.00, estimatedCoverage: '0%' },
      { pageNumber: 2, tier: 2, tierName: 'Medium Color', unitPrice: 7.50, estimatedCoverage: '15%' },
    ];

    const result = costingService.calculateAdaptiveDocumentPrice(pages, 3, 5.00);
    // (3 + 7.50) * 3 = 10.50 * 3 = 31.50 - 5.00 = 26.50
    expect(result.subtotal).toBe(31.50);
    expect(result.discount).toBe(5.00);
    expect(result.finalTotal).toBe(26.50);
  });
});

describe('Non-Destructive Privacy Purge & Permanent Accounting Ledger', () => {
  const db = getDatabase();
  const testJobId = `job_test_audit_${Date.now()}`;
  const testFileId = `f_test_${Date.now()}`;
  const testFilePath = path.resolve(process.cwd(), `uploads/test_purge_${Date.now()}.tmp`);

  beforeEach(async () => {
    await fs.promises.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.promises.writeFile(testFilePath, 'dummy customer data');

    db.prepare(`
      INSERT INTO job_orders (id, customer_name, source, status, selling_price, final_amount, payment_status)
      VALUES (?, 'Jane Doe', 'MANUAL_UI', 'COMPLETED', 60.0, 60.0, 'PAID')
    `).run(testJobId);

    db.prepare(`
      INSERT INTO job_files (id, job_id, original_filename, stored_path, mime_type, file_size_bytes)
      VALUES (?, ?, 'Jane_Passport.jpg', ?, 'image/jpeg', 1024)
    `).run(testFileId, testJobId, testFilePath);
  });

  afterEach(async () => {
    if (fs.existsSync(testFilePath)) {
      try {
        await fs.promises.unlink(testFilePath);
      } catch {}
    }
    db.prepare('DELETE FROM job_files WHERE job_id = ?').run(testJobId);
    db.prepare('DELETE FROM job_orders WHERE id = ?').run(testJobId);
  });

  it('unlinks binary files from disk but preserves the financial sales record', async () => {
    expect(fs.existsSync(testFilePath)).toBe(true);

    // Simulate purge logic
    const files = db.prepare('SELECT stored_path FROM job_files WHERE job_id = ?').all(testJobId) as any[];
    for (const f of files) {
      if (fs.existsSync(f.stored_path)) {
        await fs.promises.unlink(f.stored_path);
      }
    }
    db.prepare('UPDATE job_files SET is_purged = 1 WHERE job_id = ?').run(testJobId);
    db.prepare("UPDATE job_orders SET files_purged = 1, customer_name = 'Walk-in Customer (Purged)' WHERE id = ?").run(testJobId);

    // 1. File on disk MUST be deleted
    expect(fs.existsSync(testFilePath)).toBe(false);

    // 2. File record marked as purged
    const fileRecord = db.prepare('SELECT is_purged FROM job_files WHERE id = ?').get(testFileId) as any;
    expect(fileRecord.is_purged).toBe(1);

    // 3. Sales ledger record in job_orders MUST STILL EXIST for shop analytics
    const orderRecord = db.prepare('SELECT * FROM job_orders WHERE id = ?').get(testJobId) as any;
    expect(orderRecord).toBeDefined();
    expect(orderRecord.final_amount).toBe(60.0);
    expect(orderRecord.files_purged).toBe(1);
    expect(orderRecord.status).toBe('COMPLETED');
  });
});

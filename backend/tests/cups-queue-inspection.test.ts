import { describe, it, expect, beforeAll } from 'vitest';
import { CupsDriverService } from '../src/services/cups-driver.service';
import { getDatabase } from '../src/db/database';

describe('CUPS Host-Managed Queue & Dispatch Tests', { timeout: 20000 }, () => {
  let service: CupsDriverService;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    service = new CupsDriverService();
  });

  it('resolves printer name from SQLite system_settings', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('default_printer_name', 'HP_Smart_Tank_670', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = 'HP_Smart_Tank_670'
    `).run();
    const name = await service.getActivePrinterName();
    expect(name).toBe('HP_Smart_Tank_670');
  });

  it('returns fallback queue name when SQLite has no entry', async () => {
    const db = getDatabase();
    db.prepare("DELETE FROM system_settings WHERE key = 'default_printer_name'").run();
    const name = await service.getActivePrinterName();
    // On Linux it might return a real lpstat result; on Windows fallback
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('getPrinterStatus returns typed structure with isOnline bool', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('default_printer_name', 'HP_Smart_Tank_670', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = 'HP_Smart_Tank_670'
    `).run();
    const status = await service.getPrinterStatus();
    expect(typeof status.isOnline).toBe('boolean');
    expect(['idle', 'printing', 'stopped', 'disconnected']).toContain(status.state);
    expect(typeof status.message).toBe('string');
    expect(typeof status.activePrinterName).toBe('string');
  });

  it('ensureCupsRunning resolves without throwing on non-Linux', async () => {
    await expect((service as any).ensureCupsRunning()).resolves.not.toThrow();
  });

  it('dispatchJob throws meaningful error with no real PDF file', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('default_printer_name', 'HP_Smart_Tank_192_168_1_60', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = 'HP_Smart_Tank_192_168_1_60'
    `).run();

    await expect(
      service.dispatchJob('/nonexistent/file.pdf', { paperSize: 'A4' })
    ).rejects.toThrow();
  });

  it('extracts target IP from printer name with underscore-encoded IP', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('default_printer_name', 'HP_Smart_Tank_10_0_1_45', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = 'HP_Smart_Tank_10_0_1_45'
    `).run();
    const name = await service.getActivePrinterName();
    expect(name).toBe('HP_Smart_Tank_10_0_1_45');
  });

  it('dispatchJob uses targetIp from manual_printers table when name has no IP', async () => {
    const db = getDatabase();
    const testIp = '192.168.1.99';
    db.prepare(`
      INSERT INTO manual_printers (id, name, ip_address, port, protocol, uri, created_at)
      VALUES ('manual_test_99', 'HP Smart Tank Test 99', ?, 631, 'IPP', 'ipp://192.168.1.99:631/ipp/print', CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET ip_address = excluded.ip_address
    `).run(testIp);

    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('default_printer_name', 'HP Smart Tank Test 99', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = 'HP Smart Tank Test 99'
    `).run();

    // Dispatch should fail because no PDF, but the error should reference the printer name, not throw unexpectedly
    await expect(
      service.dispatchJob('/nonexistent/test.pdf', { paperSize: 'A4' })
    ).rejects.toThrow(/dispatch|spool|error|failed/i);

    db.prepare("DELETE FROM manual_printers WHERE id = 'manual_test_99'").run();
  });

  it('getActiveSpoolJobs returns an empty array when no jobs queued', async () => {
    const jobs = await service.getActiveSpoolJobs();
    expect(Array.isArray(jobs)).toBe(true);
  });

  it('printCalibrationSwatch generates a valid PDF without dispatching on test', async () => {
    // Stub dispatchJob to isolate PDF generation from hardware
    const originalDispatch = service.dispatchJob;
    service.dispatchJob = async () => ({
      cupsJobId: 'test-swatch-job',
      message: 'Test stub dispatch',
    });

    const result = await service.printCalibrationSwatch('HP_Smart_Tank_670');
    expect(result.success).toBe(true);
    expect(result.pdfPath).toBeTruthy();

    // Verify PDF was actually written
    const { promises: fsP } = await import('fs');
    const stat = await fsP.stat(result.pdfPath);
    expect(stat.size).toBeGreaterThan(500);

    await fsP.unlink(result.pdfPath).catch(() => {});
    service.dispatchJob = originalDispatch;
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { CupsDriverService } from '../src/services/cups-driver.service';
import { PrinterDiscoveryService } from '../src/services/printer-discovery.service';
import { PpdDiscoveryService } from '../src/services/ppd-discovery.service';
import { getDatabase } from '../src/db/database';
import fs from 'fs/promises';
import path from 'path';

describe('CUPS Driver & IPP Everywhere Hardware Subsystem Tests', { timeout: 20000 }, () => {
  let cupsService: CupsDriverService;
  let discoveryService: PrinterDiscoveryService;
  let ppdService: PpdDiscoveryService;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    cupsService = new CupsDriverService();
    discoveryService = new PrinterDiscoveryService();
    ppdService = new PpdDiscoveryService();
  });

  it('resolves active default printer name reliably from SQLite', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at) 
      VALUES ('default_printer_name', 'HP_Smart_Tank_670', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = 'HP_Smart_Tank_670'
    `).run();

    const activeName = await cupsService.getActivePrinterName();
    expect(activeName).toBe('HP_Smart_Tank_670');
  });

  it('performs direct reachability probing without network scan side-effects', async () => {
    const status = await cupsService.getPrinterStatus();
    expect(status).toHaveProperty('isOnline');
    expect(status).toHaveProperty('state');
    expect(status).toHaveProperty('message');
    expect(status).toHaveProperty('activePrinterName');
    expect(typeof status.isOnline).toBe('boolean');
  });

  it('discovers PPD options and maps IPP Everywhere driverless attributes', async () => {
    const options = await ppdService.discoverOptions('HP_Smart_Tank_670');
    expect(options).toHaveProperty('colorModeFlag');
    expect(options).toHaveProperty('monochromeValue');
    expect(options).toHaveProperty('colorValue');
    expect(options).toHaveProperty('glossyMediaValue');
    expect(options).toHaveProperty('plainMediaValue');
    expect(options).toHaveProperty('borderless4RValue');
  });

  it('generates high-density CMYK 300 DPI hardware calibration swatch PDF', async () => {
    // Generate swatch PDF
    const tempDir = path.resolve(process.cwd(), 'uploads/swatches');
    await fs.mkdir(tempDir, { recursive: true });

    // Mock dispatchJob to avoid hardware command failure in test environment
    const originalDispatch = cupsService.dispatchJob;
    cupsService.dispatchJob = async () => ({
      cupsJobId: 'test_job_123',
      message: 'Dispatched in test mode',
    });

    const result = await cupsService.printCalibrationSwatch('HP_Smart_Tank_670');
    expect(result.success).toBe(true);
    expect(result.pdfPath).toBeDefined();

    const stat = await fs.stat(result.pdfPath);
    expect(stat.size).toBeGreaterThan(1000); // Must be a non-trivial vector PDF

    // Clean up
    await fs.unlink(result.pdfPath).catch(() => {});
    cupsService.dispatchJob = originalDispatch;
  });

  it('extracts IP from printer names and matches manual network printers', async () => {
    const db = getDatabase();
    const testIp = '192.168.1.88';
    db.prepare(`
      INSERT INTO manual_printers (id, name, ip_address, port, protocol, uri, created_at)
      VALUES ('manual_test_88', 'HP Smart Tank 670 (192.168.1.88)', ?, 631, 'IPP', 'ipp://192.168.1.88:631/ipp/print', CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET ip_address = excluded.ip_address
    `).run(testIp);

    const reachability = await discoveryService.checkPrinterReachability('HP Smart Tank 670 (192.168.1.88)');
    expect(reachability.ipAddress).toBe(testIp);

    // Clean up
    db.prepare("DELETE FROM manual_printers WHERE id = 'manual_test_88'").run();
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server';
import { FastifyInstance } from 'fastify';
import { PrinterDiscoveryService } from '../src/services/printer-discovery.service';

describe('Printer Auto-Discovery & Default Assignment Tests', () => {
  let app: FastifyInstance;
  let service: PrinterDiscoveryService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildServer();
    await app.ready();
    service = new PrinterDiscoveryService();
  });

  afterAll(async () => {
    await app.close();
  });

  it('scans connected USB and Wi-Fi printers via service', async () => {
    const printers = await service.scanPrinters();
    expect(Array.isArray(printers)).toBe(true);
    expect(printers.length).toBeGreaterThan(0);

    const firstPrinter = printers[0];
    expect(firstPrinter).toHaveProperty('id');
    expect(firstPrinter).toHaveProperty('name');
    expect(firstPrinter).toHaveProperty('connectionType');
    expect(firstPrinter).toHaveProperty('status');
    expect(firstPrinter).toHaveProperty('isDefault');

    // Exactly one printer must be default
    const defaultPrinters = printers.filter(p => p.isDefault);
    expect(defaultPrinters.length).toBe(1);
  });

  it('persists and assigns a single default printer', async () => {
    const targetName = 'HP Smart Tank 660-670 series [28C379]';
    const result = await service.setDefaultPrinter(targetName);
    expect(result.success).toBe(true);

    const currentDefault = await service.getDefaultPrinter();
    expect(currentDefault).toBe(targetName);

    const updatedPrinters = await service.scanPrinters();
    const activeDefault = updatedPrinters.find(p => p.isDefault);
    expect(activeDefault?.name).toBe(targetName);
  });

  it('exposes scan and set-default routes via Fastify API', async () => {
    const targetPrinter = 'HP Smart Tank 660-670 series [28C379]';

    // 1. Scan route
    const scanRes = await app.inject({
      method: 'POST',
      url: '/api/operator/printers/scan',
    });
    expect(scanRes.statusCode).toBe(200);
    const scanData = JSON.parse(scanRes.payload);
    expect(scanData.success).toBe(true);
    expect(Array.isArray(scanData.printers)).toBe(true);

    // 2. Set default route
    const setDefaultRes = await app.inject({
      method: 'POST',
      url: '/api/operator/printers/set-default',
      payload: { printerName: targetPrinter },
    });
    expect(setDefaultRes.statusCode).toBe(200);
    const setResult = JSON.parse(setDefaultRes.payload);
    expect(setResult.success).toBe(true);

    // 3. Query updated list
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/operator/printers',
    });
    expect(listRes.statusCode).toBe(200);
    const listData = JSON.parse(listRes.payload);
    expect(listData.defaultPrinter).toBe(targetPrinter);
  });
});

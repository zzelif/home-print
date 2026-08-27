import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server';
import { FastifyInstance } from 'fastify';
import { PrinterDiscoveryService } from '../src/services/printer-discovery.service';

describe('Printer Auto-Discovery & Default Assignment Tests', { timeout: 20000 }, () => {
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

  it('scans connected USB and Wi-Fi printers via service without throwing', async () => {
    const printers = await service.scanPrinters(true);
    expect(Array.isArray(printers)).toBe(true);

    // If printers are detected in the environment, validate their shape
    if (printers.length > 0) {
      const firstPrinter = printers[0];
      expect(firstPrinter).toHaveProperty('id');
      expect(firstPrinter).toHaveProperty('name');
      expect(firstPrinter).toHaveProperty('connectionType');
      expect(firstPrinter).toHaveProperty('status');
      expect(firstPrinter).toHaveProperty('isDefault');

      const defaultPrinters = printers.filter(p => p.isDefault);
      expect(defaultPrinters.length).toBeLessThanOrEqual(1);
    }
  });

  it('persists and retrieves default printer configuration in database', async () => {
    const targetName = 'HP_Smart_Tank_670';
    const result = await service.setDefaultPrinter(targetName);
    expect(result.success).toBe(true);

    const currentDefault = await service.getDefaultPrinter();
    expect(currentDefault).toBe(targetName);
  });

  it('exposes scan and set-default routes via Fastify API', async () => {
    const targetPrinter = 'HP_Smart_Tank_670';

    // 0. Authenticate operator
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/operator/login',
      payload: { pin: '1234' },
    });
    expect(loginRes.statusCode).toBe(200);
    const cookies = { hp_session: loginRes.cookies[0].value };

    // 1. Scan route
    const scanRes = await app.inject({
      method: 'POST',
      url: '/api/operator/printers/scan',
      cookies,
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
      cookies,
    });
    expect(setDefaultRes.statusCode).toBe(200);
    const setResult = JSON.parse(setDefaultRes.payload);
    expect(setResult.success).toBe(true);

    // 3. Query updated list
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/operator/printers',
      cookies,
    });
    expect(listRes.statusCode).toBe(200);
    const listData = JSON.parse(listRes.payload);
    expect(listData.defaultPrinter).toBe(targetPrinter);
  });
});


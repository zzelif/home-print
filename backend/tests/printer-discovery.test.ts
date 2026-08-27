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
  });

  it('strictly rejects Docker bridges, gateway IPs, loopback, and broadcast in isIgnoredIp', () => {
    expect(service.isIgnoredIp('127.0.0.1')).toBe(true);
    expect(service.isIgnoredIp('localhost')).toBe(true);
    expect(service.isIgnoredIp('172.18.0.5')).toBe(true);
    expect(service.isIgnoredIp('172.17.0.1')).toBe(true);
    expect(service.isIgnoredIp('172.20.0.1')).toBe(true);
    expect(service.isIgnoredIp('192.168.1.1')).toBe(true);
    expect(service.isIgnoredIp('192.168.1.255')).toBe(true);
    expect(service.isIgnoredIp('192.168.1.0')).toBe(true);

    // Valid physical printer IP should pass
    expect(service.isIgnoredIp('192.168.1.60')).toBe(false);
    expect(service.isIgnoredIp('192.168.1.150')).toBe(false);
  });

  it('adds and persists manual network printer with truthful reachability structure', async () => {
    const testIp = '192.168.1.60';
    const addResult = await service.addManualPrinter(testIp, 'HP Smart Tank 670 (Test)');
    expect(addResult.success).toBe(true);
    expect(addResult.printer.ipAddress).toBe(testIp);
    expect(addResult.printer.name).toBe('HP Smart Tank 670 (Test)');

    const printers = await service.scanPrinters(true);
    const found = printers.find(p => p.ipAddress === testIp);
    expect(found).toBeDefined();

    // Clean up
    await service.removeManualPrinter(addResult.printer.id);
    const updatedPrinters = await service.scanPrinters(true);
    expect(updatedPrinters.find(p => p.id === addResult.printer.id)).toBeUndefined();
  });
});


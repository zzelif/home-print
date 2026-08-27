import { FastifyPluginAsync } from 'fastify';
import { PrinterDiscoveryService } from '../services/printer-discovery.service';
import { CupsDriverService } from '../services/cups-driver.service';

export const operatorPrintersRoutes: FastifyPluginAsync = async (fastify) => {
  const discoveryService = new PrinterDiscoveryService();
  const cupsService = new CupsDriverService();

  // 1-Click Active Scan for all USB and Wi-Fi printers
  fastify.get('/api/operator/printers/scan', async (_request, reply) => {
    try {
      const printers = await discoveryService.scanPrinters();
      return reply.send({
        success: true,
        scannedAt: new Date().toISOString(),
        totalFound: printers.length,
        printers,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to scan printers: ${err.message}` });
    }
  });

  fastify.post('/api/operator/printers/scan', async (_request, reply) => {
    try {
      const printers = await discoveryService.scanPrinters();
      return reply.send({
        success: true,
        scannedAt: new Date().toISOString(),
        totalFound: printers.length,
        printers,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to scan printers: ${err.message}` });
    }
  });

  // Get current printers list
  fastify.get('/api/operator/printers', async (_request, reply) => {
    const printers = await discoveryService.scanPrinters();
    const defaultPrinter = await discoveryService.getDefaultPrinter();
    return reply.send({
      defaultPrinter,
      printers,
    });
  });

  // Assign and set default printer
  fastify.post<{
    Body: { printerName: string };
  }>('/api/operator/printers/set-default', async (request, reply) => {
    const { printerName } = request.body || {};
    if (!printerName) {
      return reply.status(400).send({ error: 'printerName is required' });
    }

    const result = await discoveryService.setDefaultPrinter(printerName);
    return reply.send(result);
  });

  // Add manual Wi-Fi / IP printer with truthful reachability check & DB persistence
  fastify.post<{
    Body: { ipAddress: string; printerName?: string };
  }>('/api/operator/printers/add-manual', async (request, reply) => {
    const { ipAddress, printerName } = request.body || {};
    if (!ipAddress) {
      return reply.status(400).send({ error: 'ipAddress is required' });
    }
    try {
      const result = await discoveryService.addManualPrinter(ipAddress, printerName);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Delete manual printer
  fastify.delete<{
    Params: { id: string };
  }>('/api/operator/printers/manual/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const result = await discoveryService.removeManualPrinter(id);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // 1-Click Hardware Calibration Swatch Print
  fastify.post<{
    Body?: { printerName?: string };
  }>('/api/operator/printers/test-swatch', async (request, reply) => {
    try {
      const { printerName } = request.body || {};
      const result = await cupsService.printCalibrationSwatch(printerName);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to print swatch: ${err.message}` });
    }
  });

  // Query live print spool queue
  fastify.get('/api/operator/print/spool', async (_request, reply) => {
    try {
      const spoolJobs = await cupsService.getActiveSpoolJobs();
      return reply.send({
        success: true,
        spoolJobs,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: `Failed to query spool: ${err.message}` });
    }
  });
};

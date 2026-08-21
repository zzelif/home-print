import { FastifyPluginAsync } from 'fastify';
import { PrinterDiscoveryService } from '../services/printer-discovery.service';

export const operatorPrintersRoutes: FastifyPluginAsync = async (fastify) => {
  const discoveryService = new PrinterDiscoveryService();

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

  // Alias POST for 1-click scan action
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
};

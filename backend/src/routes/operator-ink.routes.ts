import { FastifyPluginAsync } from 'fastify';
import { InkLevelService } from '../services/ink-level.service';

export const operatorInkRoutes: FastifyPluginAsync = async (fastify) => {
  const inkService = new InkLevelService();

  /**
   * GET /api/operator/printers/ink-levels
   * Returns current ink tank percentages for the requested or default printer.
   * Reads from HPLIP → IPP → SQLite cache in priority order.
   */
  fastify.get<{
    Querystring: { ip?: string; printerName?: string; name?: string };
  }>('/api/operator/printers/ink-levels', async (request, reply) => {
    try {
      const { ip, printerName, name } = request.query;
      const targetPrinter = printerName || name;
      const levels = await inkService.getInkLevels(targetPrinter, ip);
      return reply.send({
        success: true,
        inkLevels: levels,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: `Failed to read ink levels: ${err.message}`,
      });
    }
  });

  /**
   * POST /api/operator/printers/nozzle-check
   * Triggers an HP nozzle check / test page on the active printer.
   * Body: { printerName?: string; printerIp?: string }
   */
  fastify.post<{
    Body?: { printerName?: string; printerIp?: string };
  }>('/api/operator/printers/nozzle-check', async (request, reply) => {
    try {
      const { printerName, printerIp } = request.body ?? {};
      const result = await inkService.printNozzleCheck(printerName, printerIp);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        message: `Nozzle check failed: ${err.message}`,
      });
    }
  });

  /**
   * GET /api/operator/printers/queue
   * Returns real-time CUPS queue state and active jobs via lpstat.
   */
  fastify.get<{
    Querystring: { queue?: string };
  }>('/api/operator/printers/queue', async (request, reply) => {
    try {
      const { queue } = request.query;
      const status = await inkService.getCupsQueueStatus(queue);
      return reply.send({
        success: true,
        queue: status,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: `Failed to read queue: ${err.message}`,
      });
    }
  });

  /**
   * DELETE /api/operator/printers/queue/jobs/:jobId
   * Cancels a specific CUPS job by job ID.
   */
  fastify.delete<{
    Params: { jobId: string };
  }>('/api/operator/printers/queue/jobs/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params;
      const result = await inkService.cancelJob(jobId);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        message: `Cancel job failed: ${err.message}`,
      });
    }
  });
};

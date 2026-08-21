import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import path from 'path';
import fs from 'fs';
import { getDatabase } from './db/database';
import { authService } from './services/auth.service';
import { PpdDiscoveryService } from './services/ppd-discovery.service';
import { websocketRoutes } from './routes/ws';
import { publicDropRoutes } from './routes/public-drop.routes';
import { operatorAuthRoutes } from './routes/operator-auth.routes';
import { operatorJobsRoutes } from './routes/operator-jobs.routes';
import { operatorCostingRoutes } from './routes/operator-costing.routes';
import { operatorPrintRoutes } from './routes/operator-print.routes';

export async function buildServer() {
  const fastify = Fastify({
    logger: process.env.NODE_ENV !== 'production' ? { level: 'info' } : false,
    bodyLimit: 52428800, // 50 MB file upload limit
  });

  // Core Plugins
  await fastify.register(cors, { origin: true, credentials: true });
  await fastify.register(cookie);
  await fastify.register(multipart, { limits: { fileSize: 52428800 } });
  await fastify.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await fastify.register(websocket);

  // Initialize Database
  getDatabase();

  // Introspect CUPS PPD Options on startup
  const ppdDiscovery = new PpdDiscoveryService();
  ppdDiscovery.discoverOptions().then((opts) => {
    fastify.log.info({ discoveredDriverOptions: opts }, 'Discovered CUPS Driver Settings');
  }).catch(() => {});

  // Security Pre-handler Hook for Route Separation
  fastify.addHook('preHandler', async (request, reply) => {
    const url = request.url;
    // Allow public assets and public upload routes
    const isPublic = 
      url.startsWith('/drop') || 
      url.startsWith('/api/public/') || 
      url.startsWith('/api/operator/login') ||
      url.startsWith('/assets/') ||
      url.startsWith('/favicon.ico');

    if (!isPublic && url.startsWith('/api/operator/')) {
      const sessionCookie = request.cookies['hp_session'];
      if (!authService.validateSession(sessionCookie)) {
        return reply.status(401).send({ error: 'Operator authentication required.' });
      }
    }
  });

  // Register Routes
  await fastify.register(websocketRoutes);
  await fastify.register(publicDropRoutes);
  await fastify.register(operatorAuthRoutes);
  await fastify.register(operatorJobsRoutes);
  await fastify.register(operatorCostingRoutes);
  await fastify.register(operatorPrintRoutes);

  // Serve static frontend build if it exists
  const publicDir = path.join(process.cwd(), 'dist', 'public');
  if (fs.existsSync(publicDir)) {
    await fastify.register(fastifyStatic, {
      root: publicDir,
      prefix: '/',
    });

    fastify.setNotFoundHandler((req, reply) => {
      reply.sendFile('index.html');
    });
  }

  return fastify;
}

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 5000;
  buildServer().then((server) => {
    server.listen({ port, host: '0.0.0.0' }, (err, address) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`=======================================================`);
      console.log(` HomePrint OS Server Running on ${address}`);
      console.log(` • Operator Station: ${address}`);
      console.log(` • Customer QR Drop: ${address}/drop`);
      console.log(`=======================================================`);
    });
  });
}

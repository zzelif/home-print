import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authService } from '../services/auth.service';

export const operatorAuthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/api/operator/login', async (req, reply) => {
    const { pin } = req.body as { pin: string };

    if (!pin) {
      return reply.status(400).send({ error: 'PIN is required.' });
    }

    const result = authService.verifyPin(pin);
    if (!result.success || !result.token) {
      return reply.status(401).send({ error: 'Invalid PIN. Access denied.' });
    }

    // Set secure HTTP-only session cookie
    reply.setCookie('hp_session', result.token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days persistent cookie for mother's device
    });

    return reply.send({ success: true, message: 'Operator authenticated successfully.' });
  });

  fastify.post('/api/operator/logout', async (req, reply) => {
    const sessionToken = req.cookies['hp_session'];
    if (sessionToken) {
      authService.revokeSession(sessionToken);
    }
    reply.clearCookie('hp_session', { path: '/' });
    return reply.send({ success: true, message: 'Logged out successfully.' });
  });

  fastify.get('/api/operator/me', async (req, reply) => {
    const sessionToken = req.cookies['hp_session'];
    const isValid = authService.validateSession(sessionToken);
    return reply.send({ authenticated: isValid });
  });
};

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { WebSocket } from 'ws';

export interface WebSocketEvent {
  type: 'NEW_JOB_INGESTED' | 'CUPS_STATUS_UPDATE' | 'JOB_STATE_CHANGED' | 'SYNC_RESPONSE';
  payload: any;
  timestamp: string;
}

export class WebSocketHub {
  private clients: Set<WebSocket> = new Set();

  register(ws: WebSocket) {
    this.clients.add(ws);
    ws.on('close', () => this.clients.delete(ws));
  }

  broadcast(type: WebSocketEvent['type'], payload: any) {
    const event: WebSocketEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    const message = JSON.stringify(event);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}

export const wsHub = new WebSocketHub();

export const websocketRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/ws/operator', { websocket: true }, (connection, req) => {
    wsHub.register(connection.socket);

    connection.socket.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'SYNC_REQUEST') {
          // Send back sync snapshot
          connection.socket.send(
            JSON.stringify({
              type: 'SYNC_RESPONSE',
              payload: { serverTime: new Date().toISOString(), status: 'CONNECTED' },
              timestamp: new Date().toISOString(),
            })
          );
        }
      } catch (err) {
        // Ignore malformed messages
      }
    });
  });
};

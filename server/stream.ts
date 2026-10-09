import type { Request, Response } from 'express';

export interface Stream {
  handler: (req: Request, res: Response) => void;
  broadcast: (event: string, data: unknown) => void;
  clientCount: () => number;
  close: () => void;
}

export function createStream(heartbeatMs = 25_000): Stream {
  const clients = new Set<Response>();

  // Comment lines keep proxies and mobile networks from closing idle connections
  const heartbeat = setInterval(() => {
    for (const client of clients) client.write(': ping\n\n');
  }, heartbeatMs);
  heartbeat.unref();

  return {
    handler(req, res) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
    },
    broadcast(event, data) {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      for (const client of clients) client.write(message);
    },
    clientCount: () => clients.size,
    close() {
      clearInterval(heartbeat);
      for (const client of clients) client.end();
      clients.clear();
    },
  };
}

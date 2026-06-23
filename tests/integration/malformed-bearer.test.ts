import { describe, it, expect } from 'vitest';
import http from 'node:http';

function startTestServer() {
  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 404;
      res.end();
      return;
    }

    if (req.url === '/protected') {
      const auth = req.headers['authorization'] || '';
      if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
        res.statusCode = 401;
        res.end('Unauthorized');
        return;
      }

      const token = auth.slice('Bearer '.length).trim();
      // Very small validation: JWTs have three dot-separated parts
      if (token.split('.').length !== 3) {
        res.statusCode = 401;
        res.end('Unauthorized');
        return;
      }

      res.statusCode = 200;
      res.end('OK');
      return;
    }

    res.statusCode = 404;
    res.end();
  });

  return new Promise<http.Server>((resolve, reject) => {
    server.listen(0, () => resolve(server));
    server.on('error', reject);
  });
}

function httpRequest(port: number, opts: { method?: string; path?: string; headers?: Record<string, string> }) {
  return new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
    const request = http.request(
      { port, method: opts.method || 'GET', path: opts.path || '/', headers: opts.headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.from(c)));
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: Buffer.concat(chunks).toString() }));
      },
    );

    request.on('error', reject);
    request.end();
  });
}

describe('Integration: malformed bearer token', () => {
  it('rejects a non-JWT Authorization: Bearer header with 401', async () => {
    const server = await startTestServer();
    // @ts-ignore - address can be string or object depending on platform
    const addr: any = server.address();
    const port = typeof addr === 'object' ? addr.port : addr;

    try {
      const res = await httpRequest(port, { path: '/protected', headers: { Authorization: 'Bearer not-a-jwt' } });
      expect(res.statusCode).toBe(401);
    } finally {
      server.close();
    }
  });

  it('allows a well-formed (dot-separated) token with 200', async () => {
    const server = await startTestServer();
    // @ts-ignore
    const addr: any = server.address();
    const port = typeof addr === 'object' ? addr.port : addr;

    try {
      const res = await httpRequest(port, { path: '/protected', headers: { Authorization: 'Bearer a.b.c' } });
      expect(res.statusCode).toBe(200);
    } finally {
      server.close();
    }
  });
});

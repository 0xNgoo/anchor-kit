import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { Readable } from 'node:stream';
import { unlinkSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Keypair, Transaction } from '@stellar/stellar-sdk';
import { createExampleApp } from '../example/express-app.ts';

interface ExampleAppRuntime {
  app: Express;
  anchor: {
    config: {
      get: (key: 'framework') => {
        watchers?: {
          enabled?: boolean;
        };
      };
    };
  };
  shutdown: () => Promise<void>;
}

interface InvokeOptions {
  method?: string;
  path: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

interface InvokeResponse {
  status: number;
  body: Record<string, unknown>;
}

async function invokeExpress(app: Express, options: InvokeOptions): Promise<InvokeResponse> {
  const serializedBody = options.body ? JSON.stringify(options.body) : '';

  const req = Readable.from(serializedBody ? [serializedBody] : []) as IncomingMessage & {
    method: string;
    url: string;
    headers: Record<string, string>;
  };

  req.method = options.method ?? 'GET';
  req.url = options.path;
  req.headers = Object.fromEntries(
    Object.entries(options.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );

  const responseHeaders: Record<string, string> = {};

  return new Promise<InvokeResponse>((resolve) => {
    let statusCode = 200;

    const res = {
      get statusCode(): number {
        return statusCode;
      },
      set statusCode(value: number) {
        statusCode = value;
      },
      setHeader(name: string, value: string): void {
        responseHeaders[name.toLowerCase()] = value;
      },
      end(payload?: string): void {
        const contentType = responseHeaders['content-type'] ?? '';
        const bodyText = typeof payload === 'string' ? payload : '';
        const body =
          contentType.includes('application/json') && bodyText
            ? (JSON.parse(bodyText) as Record<string, unknown>)
            : {};

        resolve({
          status: statusCode,
          body,
        });
      },
    } as unknown as ServerResponse;

    app(req, res);
  });
}

async function createExampleAppHarness(
  watchersEnabled?: string,
): Promise<{ runtime: ExampleAppRuntime; cleanup: () => Promise<void> }> {
  const sep10ServerKeypair = Keypair.random();
  const dbPath = `/tmp/anchor-kit-example-test-${Date.now()}-${Math.random()}.sqlite`;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalSep10SigningKey = process.env.SEP10_SIGNING_KEY;
  const originalWatchersEnabled = process.env.WATCHERS_ENABLED;

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.SEP10_SIGNING_KEY = sep10ServerKeypair.secret();

  if (watchersEnabled === undefined) {
    delete process.env.WATCHERS_ENABLED;
  } else {
    process.env.WATCHERS_ENABLED = watchersEnabled;
  }

  const runtime = await createExampleApp();

  return {
    runtime,
    cleanup: async () => {
      await runtime.shutdown();

      if (originalDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = originalDatabaseUrl;
      }

      if (originalSep10SigningKey === undefined) {
        delete process.env.SEP10_SIGNING_KEY;
      } else {
        process.env.SEP10_SIGNING_KEY = originalSep10SigningKey;
      }

      if (originalWatchersEnabled === undefined) {
        delete process.env.WATCHERS_ENABLED;
      } else {
        process.env.WATCHERS_ENABLED = originalWatchersEnabled;
      }

      try {
        unlinkSync(dbPath);
      } catch {
        // ignore cleanup errors
      }
    },
  };
}

describe('example/express-app', () => {
  const clientKeypair = Keypair.random();
  let harness: { runtime: ExampleAppRuntime; cleanup: () => Promise<void> };

  beforeAll(async () => {
    harness = await createExampleAppHarness();
  });

  afterAll(async () => {
    await harness.cleanup();
  });

  it('mounts /anchor and serves /health', async () => {
    const response = await invokeExpress(harness.runtime.app, { path: '/anchor/health' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('runs challenge -> token flow', async () => {
    const account = clientKeypair.publicKey();

    const challengeResponse = await invokeExpress(harness.runtime.app, {
      path: `/anchor/auth/challenge?account=${account}`,
    });
    expect(challengeResponse.status).toBe(200);
    const networkPassphrase = String(challengeResponse.body.network_passphrase ?? '');
    const challengeXdr = String(challengeResponse.body.challenge ?? '');
    const challengeTx = new Transaction(challengeXdr, networkPassphrase);
    challengeTx.sign(clientKeypair);
    const signedChallengeXdr = challengeTx.toXDR();

    const tokenResponse = await invokeExpress(harness.runtime.app, {
      method: 'POST',
      path: '/anchor/auth/token',
      headers: { 'content-type': 'application/json' },
      body: {
        account,
        challenge: signedChallengeXdr,
      },
    });

    expect(tokenResponse.status).toBe(200);
    expect(typeof tokenResponse.body.token).toBe('string');
    expect(String(tokenResponse.body.token).length).toBeGreaterThan(0);
  });

  it('keeps watchers enabled when the env var is absent', () => {
    expect(harness.runtime.anchor.config.get('framework').watchers?.enabled).toBe(true);
  });
});

describe('example/express-app WATCHERS_ENABLED', () => {
  let harness: { runtime: ExampleAppRuntime; cleanup: () => Promise<void> };

  beforeAll(async () => {
    harness = await createExampleAppHarness('false');
  });

  afterAll(async () => {
    await harness.cleanup();
  });

  it('disables watchers when configured through the environment', () => {
    expect(harness.runtime.anchor.config.get('framework').watchers?.enabled).toBe(false);
  });
});

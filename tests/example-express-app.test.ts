import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { Readable } from 'node:stream';
import { unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

interface ExampleAppHarness {
  runtime: ExampleAppRuntime;
  cleanup: () => Promise<void>;
}

function setOptionalEnvVar(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

function removeFileIfPresent(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    // ignore cleanup errors
  }
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
          headers: responseHeaders,
          body,
        });
      },
    } as unknown as ServerResponse;

    app(req, res);
  });
}

async function createExampleAppHarness(watchersEnabled?: string): Promise<ExampleAppHarness> {
  const sep10ServerKeypair = Keypair.random();
  const dbPath = `/tmp/anchor-kit-example-test-${Date.now()}-${Math.random()}.sqlite`;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalSep10SigningKey = process.env.SEP10_SIGNING_KEY;
  const originalWatchersEnabled = process.env.WATCHERS_ENABLED;

  setOptionalEnvVar('DATABASE_URL', `file:${dbPath}`);
  setOptionalEnvVar('SEP10_SIGNING_KEY', sep10ServerKeypair.secret());
  setOptionalEnvVar('WATCHERS_ENABLED', watchersEnabled);

  const runtime = await createExampleApp();

  return {
    runtime,
    cleanup: async () => {
      await runtime.shutdown();

      setOptionalEnvVar('DATABASE_URL', originalDatabaseUrl);
      setOptionalEnvVar('SEP10_SIGNING_KEY', originalSep10SigningKey);
      setOptionalEnvVar('WATCHERS_ENABLED', originalWatchersEnabled);
      removeFileIfPresent(dbPath);
    },
  };
}

describe('example/express-app', () => {
  const clientKeypair = Keypair.random();
  let harness: ExampleAppHarness;

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
    expect(tokenResponse.headers['cache-control']).toBe('no-store');
    expect(typeof tokenResponse.body.token).toBe('string');
    expect(String(tokenResponse.body.token).length).toBeGreaterThan(0);
  });

  it('keeps watchers enabled when the env var is absent', () => {
    expect(harness.runtime.anchor.config.get('framework').watchers?.enabled).toBe(true);
  });
});

describe('example/express-app WATCHERS_ENABLED', () => {
  let harness: ExampleAppHarness;

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

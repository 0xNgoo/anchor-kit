import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { Readable } from 'node:stream';
import { unlinkSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Keypair, Transaction } from '@stellar/stellar-sdk';
import { createExampleApp } from '../example/express-app.ts';

interface ExampleAppRuntime {
  app: Express;
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

const DEFAULT_CHALLENGE_EXPIRATION_SECONDS = 300;

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

describe('example/express-app', () => {
  const sep10ServerKeypair = Keypair.random();
  const clientKeypair = Keypair.random();
  let runtime: ExampleAppRuntime;
  let dbPath = '';
  let originalDatabaseUrl: string | undefined;
  let originalSep10SigningKey: string | undefined;
  let originalChallengeExpirationSeconds: string | undefined;

  beforeAll(async () => {
    originalDatabaseUrl = process.env.DATABASE_URL;
    originalSep10SigningKey = process.env.SEP10_SIGNING_KEY;
    originalChallengeExpirationSeconds = process.env.CHALLENGE_EXPIRATION_SECONDS;
    dbPath = `/tmp/anchor-kit-example-test-${Date.now()}.sqlite`;
    process.env.DATABASE_URL = `file:${dbPath}`;
    process.env.SEP10_SIGNING_KEY = sep10ServerKeypair.secret();
    delete process.env.CHALLENGE_EXPIRATION_SECONDS;
    runtime = await createExampleApp();
  });

  afterAll(async () => {
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

    if (originalChallengeExpirationSeconds === undefined) {
      delete process.env.CHALLENGE_EXPIRATION_SECONDS;
    } else {
      process.env.CHALLENGE_EXPIRATION_SECONDS = originalChallengeExpirationSeconds;
    }

    try {
      unlinkSync(dbPath);
    } catch {
      // ignore cleanup errors
    }
  });

  it('mounts /anchor and serves /health', async () => {
    const response = await invokeExpress(runtime.app, { path: '/anchor/health' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('runs challenge -> token flow', async () => {
    const account = clientKeypair.publicKey();

    const challengeResponse = await invokeExpress(runtime.app, {
      path: `/anchor/auth/challenge?account=${account}`,
    });
    expect(challengeResponse.status).toBe(200);
    const networkPassphrase = String(challengeResponse.body.network_passphrase ?? '');
    const challengeXdr = String(challengeResponse.body.challenge ?? '');
    const challengeTx = new Transaction(challengeXdr, networkPassphrase);
    challengeTx.sign(clientKeypair);
    const signedChallengeXdr = challengeTx.toXDR();

    const tokenResponse = await invokeExpress(runtime.app, {
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

  it('uses the default challenge expiration when the env var is absent', async () => {
    const account = clientKeypair.publicKey();

    const challengeResponse = await invokeExpress(runtime.app, {
      path: `/anchor/auth/challenge?account=${account}`,
    });

    expect(challengeResponse.status).toBe(200);
    const networkPassphrase = String(challengeResponse.body.network_passphrase ?? '');
    const challengeXdr = String(challengeResponse.body.challenge ?? '');
    const challengeTx = new Transaction(challengeXdr, networkPassphrase);

    expect(Number(challengeTx.timeBounds.maxTime) - Number(challengeTx.timeBounds.minTime)).toBe(
      DEFAULT_CHALLENGE_EXPIRATION_SECONDS,
    );
  });
});

describe('example/express-app CHALLENGE_EXPIRATION_SECONDS', () => {
  const sep10ServerKeypair = Keypair.random();
  let runtime: ExampleAppRuntime;
  let dbPath = '';
  let originalDatabaseUrl: string | undefined;
  let originalSep10SigningKey: string | undefined;
  let originalChallengeExpirationSeconds: string | undefined;

  beforeAll(async () => {
    originalDatabaseUrl = process.env.DATABASE_URL;
    originalSep10SigningKey = process.env.SEP10_SIGNING_KEY;
    originalChallengeExpirationSeconds = process.env.CHALLENGE_EXPIRATION_SECONDS;

    dbPath = `/tmp/anchor-kit-example-expiration-test-${Date.now()}.sqlite`;
    process.env.DATABASE_URL = `file:${dbPath}`;
    process.env.SEP10_SIGNING_KEY = sep10ServerKeypair.secret();
    process.env.CHALLENGE_EXPIRATION_SECONDS = '45';
    runtime = await createExampleApp();
  });

  afterAll(async () => {
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

    if (originalChallengeExpirationSeconds === undefined) {
      delete process.env.CHALLENGE_EXPIRATION_SECONDS;
    } else {
      process.env.CHALLENGE_EXPIRATION_SECONDS = originalChallengeExpirationSeconds;
    }

    try {
      unlinkSync(dbPath);
    } catch {
      // ignore cleanup errors
    }
  });

  it('uses the configured challenge expiration from the environment', async () => {
    const clientKeypair = Keypair.random();
    const account = clientKeypair.publicKey();

    const challengeResponse = await invokeExpress(runtime.app, {
      path: `/anchor/auth/challenge?account=${account}`,
    });

    expect(challengeResponse.status).toBe(200);
    const networkPassphrase = String(challengeResponse.body.network_passphrase ?? '');
    const challengeXdr = String(challengeResponse.body.challenge ?? '');
    const challengeTx = new Transaction(challengeXdr, networkPassphrase);

    expect(Number(challengeTx.timeBounds.maxTime) - Number(challengeTx.timeBounds.minTime)).toBe(
      45,
    );
  });
});

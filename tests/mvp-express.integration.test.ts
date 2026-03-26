import { makeSqliteDbUrlForTests } from '@/core/factory.ts';
import { createAnchor, type AnchorInstance } from '@/index.ts';
import { Keypair, Transaction } from '@stellar/stellar-sdk';
import { createHmac } from 'node:crypto';
import { unlinkSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { version } from '../package.json';

interface TestResponse {
  status: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

interface TestRequestOptions {
  method?: string;
  path: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

function createMountedInvoker(anchor: AnchorInstance) {
  const middleware = anchor.getExpressRouter();

  return async (options: TestRequestOptions): Promise<TestResponse> => {
    const serializedBody = options.body ? JSON.stringify(options.body) : '';

    const req = Readable.from(serializedBody ? [serializedBody] : []) as IncomingMessage & {
      method: string;
      url: string;
      headers: Record<string, string>;
      body?: Record<string, unknown>;
    };

    req.method = options.method ?? 'GET';
    req.url = `/anchor${options.path}`;
    req.headers = Object.fromEntries(
      Object.entries(options.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
    );

    const responseHeaders: Record<string, string> = {};

    const response = await new Promise<TestResponse>((resolve) => {
      let statusCode = 200;
      let headersSent = false;
      const res = {
        get headersSent(): boolean {
          return headersSent;
        },
        set headersSent(value: boolean) {
          headersSent = value;
        },
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

      const rawUrl = req.url;
      if (!rawUrl.startsWith('/anchor')) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'not_found' }));
        return;
      }

      req.url = rawUrl.slice('/anchor'.length) || '/';
      middleware(req, res, () => {
        res.statusCode = 404;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: 'not_found' }));
      });
    });

    return response;
  };
}

describe('MVP Express-mounted integration', () => {
  const sep10ServerKeypair = Keypair.random();
  const clientKeypair = Keypair.random();
  const dbUrl = makeSqliteDbUrlForTests();
  const dbPath = dbUrl.startsWith('file:') ? dbUrl.slice('file:'.length) : dbUrl;

  let webhookCallbackCount = 0;
  let anchor: AnchorInstance;
  let invoke: (options: TestRequestOptions) => Promise<TestResponse>;
  let accessToken = '';
  let transactionId = '';
  let depositInteractiveUrl = '';

  beforeAll(async () => {
    anchor = createAnchor({
      network: { network: 'testnet' },
      server: { interactiveDomain: 'https://anchor.example.com' },
      security: {
        sep10SigningKey: sep10ServerKeypair.secret(),
        interactiveJwtSecret: 'jwt-test-secret',
        distributionAccountSecret: 'distribution-test-secret',
        webhookSecret: 'webhook-test-secret',
        verifyWebhookSignatures: true,
        challengeExpirationSeconds: 300,
      },
      assets: {
        assets: [
          {
            code: 'USDC',
            issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
            deposits_enabled: true,
            min_amount: 10,
            max_amount: 100,
          },
        ],
      },
      framework: {
        database: {
          provider: 'sqlite',
          url: dbUrl,
        },
        rateLimit: {
          windowMs: 60000,
          authChallengeMax: 2,
          authTokenMax: 5,
          webhookMax: 20,
          depositMax: 20,
        },
        queue: {
          backend: 'memory',
          concurrency: 2,
        },
        watchers: {
          enabled: true,
          pollIntervalMs: 50,
          transactionTimeoutMs: 50,
        },
      },
      webhooks: {
        onEvent: async () => {
          webhookCallbackCount += 1;
        },
      },
    });

    await anchor.init();
    await anchor.startBackgroundJobs();
    invoke = createMountedInvoker(anchor);
  });

  afterAll(async () => {
    await anchor.stopBackgroundJobs();
    await anchor.shutdown();

    try {
      unlinkSync(dbPath);
    } catch {
      // ignore cleanup errors in CI
    }
  });

  it('1) app mounts router and /health works', async () => {
    const response = await invoke({ path: '/health' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('2) /info returns configured assets and package version', async () => {
    const response = await invoke({ path: '/info' });
    expect(response.status).toBe(200);
    const assets = response.body.assets;
    expect(Array.isArray(assets)).toBe(true);
    expect((assets as Array<Record<string, unknown>>)[0]?.code).toBe('USDC');
    expect(response.body.version).toBe(version);
    expect(response.body.version).not.toBe('mvp');
    expect(response.body.interactive_domain).toBe('https://anchor.example.com');
  });

  it('2b) /info omits interactive_domain when not configured', async () => {
    const customDbUrl = makeSqliteDbUrlForTests();
    const customAnchor = createAnchor({
      network: { network: 'testnet' },
      server: { port: 3001 /* different port for safety */ },
      security: {
        sep10SigningKey: sep10ServerKeypair.secret(),
        interactiveJwtSecret: 'jwt-test-secret-no-domain',
        distributionAccountSecret: 'distribution-test-secret',
      },
      assets: {
        assets: [
          {
            code: 'USDC',
            issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
          },
        ],
      },
      framework: {
        database: {
          provider: 'sqlite',
          url: customDbUrl,
        },
      },
    });

    await customAnchor.init();
    const customInvoke = createMountedInvoker(customAnchor);
    const response = await customInvoke({ path: '/info' });
    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('interactive_domain');

    await customAnchor.shutdown();
    const customDbPath = customDbUrl.startsWith('file:')
      ? customDbUrl.slice('file:'.length)
      : customDbUrl;
    try {
      unlinkSync(customDbPath);
    } catch {
      // ignore
    }
  });

  it('3) challenge -> token happy path', async () => {
    const account = clientKeypair.publicKey();
    const challengeResponse = await invoke({
      path: `/auth/challenge?account=${account}`,
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(challengeResponse.status).toBe(200);
    expect(challengeResponse.headers['cache-control']).toBe('no-store');
    const challengeXdr = String(challengeResponse.body.challenge ?? '');
    expect(challengeXdr.length).toBeGreaterThan(0);
    const networkPassphrase = String(challengeResponse.body.network_passphrase ?? '');
    const challengeTx = new Transaction(challengeXdr, networkPassphrase);
    challengeTx.sign(clientKeypair);
    const signedChallengeXdr = challengeTx.toXDR();

    const tokenResponse = await invoke({
      method: 'POST',
      path: '/auth/token',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
      body: { account, challenge: signedChallengeXdr },
    });

    expect(tokenResponse.status).toBe(200);
    accessToken = String(tokenResponse.body.token ?? '');
    expect(accessToken.length).toBeGreaterThan(0);
    expect(tokenResponse.body.token_type).toBe('Bearer');
    expect(tokenResponse.headers['cache-control']).toBe('no-store');
    // Verify default TTL is used when not configured
    expect(tokenResponse.body.expires_in).toBe(3600);
  });

  it('3b) auth token with custom TTL returns correct expires_in', async () => {
    // Create a new anchor instance with custom TTL using a separate database
    const customDbUrl = makeSqliteDbUrlForTests();
    const customAnchor = createAnchor({
      network: { network: 'testnet' },
      server: { interactiveDomain: 'https://anchor.example.com' },
      security: {
        sep10SigningKey: sep10ServerKeypair.secret(),
        interactiveJwtSecret: 'jwt-test-secret-custom',
        distributionAccountSecret: 'distribution-test-secret',
        webhookSecret: 'webhook-test-secret',
        verifyWebhookSignatures: true,
        challengeExpirationSeconds: 300,
        authTokenLifetimeSeconds: 7200, // 2 hours
      },
      assets: {
        assets: [
          {
            code: 'USDC',
            issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
            deposits_enabled: true,
          },
        ],
      },
      framework: {
        database: {
          provider: 'sqlite',
          url: customDbUrl,
        },
      },
    });

    await customAnchor.init();
    const customInvoke = createMountedInvoker(customAnchor);
    const testAccount = clientKeypair.publicKey();

    // Get auth challenge
    const challengeResponse = await customInvoke({
      path: `/auth/challenge?account=${testAccount}`,
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });

    expect(challengeResponse.status).toBe(200);
    const challengeXdr = String(challengeResponse.body.challenge ?? '');
    const networkPassphrase = String(challengeResponse.body.network_passphrase ?? '');

    // Sign the challenge
    const challengeTx = new Transaction(challengeXdr, networkPassphrase);
    challengeTx.sign(clientKeypair);
    const signedChallengeXdr = challengeTx.toXDR();

    // Get token with custom TTL
    const tokenResponse = await customInvoke({
      method: 'POST',
      path: '/auth/token',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
      body: { account: testAccount, challenge: signedChallengeXdr },
    });

    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.body.expires_in).toBe(7200);
    expect(String(tokenResponse.body.token ?? '').length).toBeGreaterThan(0);

    // Cleanup
    await customAnchor.shutdown();
    const customDbPath = customDbUrl.startsWith('file:')
      ? customDbUrl.slice('file:'.length)
      : customDbUrl;
    try {
      unlinkSync(customDbPath);
    } catch {
      // ignore cleanup errors
    }
  });

  it('4) unauthorized deposit interactive rejected', async () => {
    const response = await invoke({
      method: 'POST',
      path: '/transactions/deposit/interactive',
      headers: { 'content-type': 'application/json' },
      body: { asset_code: 'USDC', amount: '10' },
    });

    expect(response.status).toBe(401);
  });

  it('5) deposit above max_amount is rejected', async () => {
    const response = await invoke({
      method: 'POST',
      path: '/transactions/deposit/interactive',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: { asset_code: 'USDC', amount: '101' },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_amount');
    expect(response.body.max_amount).toBe(100);
  });

  it('5d) deposit below min_amount is rejected with configured minimum', async () => {
    const response = await invoke({
      method: 'POST',
      path: '/transactions/deposit/interactive',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: { asset_code: 'USDC', amount: '9.9' },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_amount');
    expect(response.body.min_amount).toBe(10);
    expect(response.body.message).toContain('minimum allowed of 10');
  });

  it('5c) deposit with unknown asset_code is rejected', async () => {
    const response = await invoke({
      method: 'POST',
      path: '/transactions/deposit/interactive',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: { asset_code: 'XYZ', amount: '10' },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_asset');
    expect(response.body.id).toBeUndefined();
  });

  it('5b) deposit at max_amount boundary is accepted', async () => {
    const response = await invoke({
      method: 'POST',
      path: '/transactions/deposit/interactive',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
        'idempotency-key': 'deposit-boundary',
      },
      body: { asset_code: 'USDC', amount: '100' },
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('pending_user_transfer_start');
  });

  it('6) authorized deposit interactive creates persistent transaction', async () => {
    const response = await invoke({
      method: 'POST',
      path: '/transactions/deposit/interactive',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
        'idempotency-key': 'deposit-1',
      },
      body: { asset_code: 'USDC', amount: '25.5' },
    });

    expect(response.status).toBe(201);
    transactionId = String(response.body.id ?? '');
    depositInteractiveUrl = String(response.body.interactive_url ?? '');
    expect(transactionId.length).toBeGreaterThan(0);
    expect(response.body.status).toBe('pending_user_transfer_start');
    expect(response.body.asset_issuer).toBe(
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    );
    expect(response.body).not.toHaveProperty('idempotency_replay');
  });

  it('6b) deposit with SAME idempotency-key but DIFFERENT body is rejected', async () => {
    const response = await invoke({
      method: 'POST',
      path: '/transactions/deposit/interactive',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
        'idempotency-key': 'deposit-1', // reused key from test 6
      },
      body: { asset_code: 'USDC', amount: '100.0' }, // different amount
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('idempotency_conflict');
  });

  it('6c) idempotent replay returns cached deposit response with replay flag', async () => {
    const response = await invoke({
      method: 'POST',
      path: '/transactions/deposit/interactive',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
        'idempotency-key': 'deposit-1',
      },
      body: { asset_code: 'USDC', amount: '25.5' },
    });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(transactionId);
    expect(response.body.interactive_url).toBe(depositInteractiveUrl);
    expect(response.body.status).toBe('pending_user_transfer_start');
    expect(response.body.idempotency_replay).toBe(true);
  });

  it('7) transaction lookup fetches persisted data', async () => {
    const response = await invoke({
      method: 'GET',
      path: `/transactions/${transactionId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(transactionId);
    expect(response.body.asset_code).toBe('USDC');
    expect(response.body.asset_issuer).toBe(
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    );
    expect(response.body.interactive_url).toBe(depositInteractiveUrl);
    expect(response.body.interactive_url).toBe(
      `https://anchor.example.com/deposit/${transactionId}`,
    );
  });

  it('7b) transaction lookup returns 404 for non-existent ID', async () => {
    const response = await invoke({
      method: 'GET',
      path: '/transactions/non-existent-id-99999',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found', message: 'Transaction not found' });
  });

  it('8) webhook route stores event and invokes configured callback', async () => {
    const payload = {
      id: 'evt_1',
      type: 'deposit.completed',
      transaction_id: transactionId,
    };

    const signature = createHmac('sha256', 'webhook-test-secret')
      .update(JSON.stringify(payload))
      .digest('hex');

    const firstResponse = await invoke({
      method: 'POST',
      path: '/webhooks/events',
      headers: {
        'content-type': 'application/json',
        'x-webhook-provider': 'generic',
        'x-anchor-signature': signature,
      },
      body: payload,
    });

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.received).toBe(true);
    expect(firstResponse.body.duplicate).toBe(false);
    expect(firstResponse.body.event_id).toBe('evt_1');
    expect(firstResponse.body.provider).toBe('generic');
    expect(webhookCallbackCount).toBe(1);

    const duplicateResponse = await invoke({
      method: 'POST',
      path: '/webhooks/events',
      headers: {
        'content-type': 'application/json',
        'x-webhook-provider': 'generic',
        'x-anchor-signature': signature,
      },
      body: payload,
    });

    expect(duplicateResponse.status).toBe(200);
    expect(duplicateResponse.body.received).toBe(true);
    expect(duplicateResponse.body.duplicate).toBe(true);
    expect(duplicateResponse.body.event_id).toBe('evt_1');
    expect(duplicateResponse.body.provider).toBe('generic');
    expect(webhookCallbackCount).toBe(1);
  });

  it('8b) webhook route uses default provider when no header provided', async () => {
    const payload = {
      id: 'evt_2',
      type: 'deposit.completed',
      transaction_id: transactionId,
    };

    const signature = createHmac('sha256', 'webhook-test-secret')
      .update(JSON.stringify(payload))
      .digest('hex');

    const response = await invoke({
      method: 'POST',
      path: '/webhooks/events',
      headers: {
        'content-type': 'application/json',
        'x-anchor-signature': signature,
        // No x-webhook-provider header
      },
      body: payload,
    });

    expect(response.status).toBe(200);
    expect(response.body.received).toBe(true);
    expect(response.body.duplicate).toBe(false);
    expect(response.body.event_id).toBe('evt_2');
    expect(response.body.provider).toBe('generic'); // Should default to 'generic'
  });

  it('9) queue worker/watcher processes at least one watch task', async () => {
    await new Promise((resolve) => setTimeout(resolve, 125));
    const processed = await anchor.getProcessedWatcherTaskCount();
    expect(processed).toBeGreaterThan(0);
  });

  it('10) unsigned challenge is rejected', async () => {
    const account = clientKeypair.publicKey();
    const challengeResponse = await invoke({
      path: `/auth/challenge?account=${account}`,
      headers: { 'x-forwarded-for': '10.0.0.2' },
    });
    const challengeXdr = String(challengeResponse.body.challenge ?? '');

    const tokenResponse = await invoke({
      method: 'POST',
      path: '/auth/token',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.2' },
      body: { account, challenge: challengeXdr },
    });

    expect(tokenResponse.status).toBe(401);
    expect(tokenResponse.body.error).toBe('invalid_challenge');
  });

  it('10b) token with missing/incorrect scope is rejected', async () => {
    // Manually sign a token with a different scope to test the server's validation
    const jwt = (await import('jsonwebtoken')).default;
    const badToken = jwt.sign(
      {
        sub: clientKeypair.publicKey(),
        scope: 'wrong_api',
        typ: 'access_token',
      },
      'jwt-test-secret',
      { expiresIn: 3600 },
    );

    const response = await invoke({
      method: 'POST',
      path: '/transactions/deposit/interactive',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${badToken}`,
      },
      body: { asset_code: 'USDC', amount: '10' },
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('unauthorized');
  });

  it('10d) token with missing/incorrect typ is rejected', async () => {
    // Manually sign a token with a different scope to test the server's validation
    const jwt = (await import('jsonwebtoken')).default;
    const badToken = jwt.sign(
      {
        sub: clientKeypair.publicKey(),
        scope: 'anchor_api',
        // typ is missing
      },
      'jwt-test-secret',
      { expiresIn: 3600 },
    );

    const response = await invoke({
      method: 'POST',
      path: '/transactions/deposit/interactive',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${badToken}`,
      },
      body: { asset_code: 'USDC', amount: '10' },
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('unauthorized');
  });

  it('10c) malformed challenge XDR is rejected', async () => {
    const account = clientKeypair.publicKey();
    const invalidChallengeXdr = 'AAAAinvalid_xdr_string_that_is_not_a_valid_transaction';

    const tokenResponse = await invoke({
      method: 'POST',
      path: '/auth/token',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.3' },
      body: { account, challenge: invalidChallengeXdr },
    });

    expect(tokenResponse.status).toBe(401);
    expect(tokenResponse.body.error).toBe('invalid_challenge');
    expect(tokenResponse.body.message).toBe('Challenge transaction is invalid');
  });

  it('11) reused challenge rejection', async () => {
    const account = clientKeypair.publicKey();
    const challengeResponse = await invoke({
      path: `/auth/challenge?account=${account}`,
      headers: { 'x-forwarded-for': '10.0.0.4' },
    });
    expect(challengeResponse.status).toBe(200);
    const challengeXdr = String(challengeResponse.body.challenge ?? '');
    const networkPassphrase = String(challengeResponse.body.network_passphrase ?? '');
    const challengeTx = new Transaction(challengeXdr, networkPassphrase);
    challengeTx.sign(clientKeypair);
    const signedChallengeXdr = challengeTx.toXDR();

    // First exchange succeeds
    const firstResponse = await invoke({
      method: 'POST',
      path: '/auth/token',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.4' },
      body: { account, challenge: signedChallengeXdr },
    });
    expect(firstResponse.status).toBe(200);

    // Second exchange with same challenge fails
    const secondResponse = await invoke({
      method: 'POST',
      path: '/auth/token',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.4' },
      body: { account, challenge: signedChallengeXdr },
    });

    expect(secondResponse.status).toBe(401);
    expect(secondResponse.body.error).toBe('invalid_challenge');
    expect(secondResponse.body.message).toBe('Challenge already used');
  });

  it('12) deposit idempotency replay returns original response', async () => {
    const asset_code = 'USDC';
    const amount = '15.0';
    const firstResponse = await invoke({
      method: 'POST',
      path: '/transactions/deposit/interactive',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
        'idempotency-key': 'replay-test-key',
      },
      body: { asset_code, amount },
    });

    expect(firstResponse.status).toBe(201);
    const firstTxId = firstResponse.body.id;

    const secondResponse = await invoke({
      method: 'POST',
      path: '/transactions/deposit/interactive',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
        'idempotency-key': 'replay-test-key',
      },
      body: { asset_code, amount },
    });

    expect(secondResponse.status).toBe(201);
    expect(secondResponse.body.id).toBe(firstTxId);
  });

  it('13) cross-account transaction lookup is rejected', async () => {
    // Create a new account and get its token
    const otherAccountKeypair = Keypair.random();
    const account = otherAccountKeypair.publicKey();
    const challengeResponse = await invoke({
      path: `/auth/challenge?account=${account}`,
    });
    const challengeXdr = String(challengeResponse.body.challenge ?? '');
    const networkPassphrase = String(challengeResponse.body.network_passphrase ?? '');
    const challengeTx = new Transaction(challengeXdr, networkPassphrase);
    challengeTx.sign(otherAccountKeypair);
    const signedChallengeXdr = challengeTx.toXDR();

    const tokenResponse = await invoke({
      method: 'POST',
      path: '/auth/token',
      headers: { 'content-type': 'application/json' },
      body: { account, challenge: signedChallengeXdr },
    });
    const otherAccessToken = String(tokenResponse.body.token ?? '');

    // Now attempt to look up the transaction from another account
    // transactionId was created in test #6 and belongs to clientKeypair
    const response = await invoke({
      method: 'GET',
      path: `/transactions/${transactionId}`,
      headers: {
        authorization: `Bearer ${otherAccessToken}`,
      },
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('forbidden');
  });

  it('14) account mismatch during token exchange is rejected', async () => {
    const account = clientKeypair.publicKey();
    const otherAccountKeypair = Keypair.random();
    const otherAccount = otherAccountKeypair.publicKey();

    // Get challenge for 'account'
    const challengeResponse = await invoke({
      path: `/auth/challenge?account=${account}`,
    });
    expect(challengeResponse.status).toBe(200);
    const challengeXdr = String(challengeResponse.body.challenge ?? '');
    const networkPassphrase = String(challengeResponse.body.network_passphrase ?? '');

    // Sign with 'otherAccount' keypair (mismatched vs the challenge's DB entry)
    const challengeTx = new Transaction(challengeXdr, networkPassphrase);
    challengeTx.sign(otherAccountKeypair);
    const signedChallengeXdr = challengeTx.toXDR();

    // Submit with 'otherAccount' in the body
    const tokenResponse = await invoke({
      method: 'POST',
      path: '/auth/token',
      headers: { 'content-type': 'application/json' },
      body: { account: otherAccount, challenge: signedChallengeXdr },
    });

    // Should be rejected because the account in the body (and signature)
    // doesn't match the one the challenge was generated for in the DB.
    expect(tokenResponse.status).toBe(401);
    expect(tokenResponse.body.error).toBe('invalid_challenge');
    expect(tokenResponse.body.message).toBe('Challenge not found');
  });
});

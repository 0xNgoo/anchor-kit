import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('example README documents all env vars', () => {
  it('lists every environment variable read by the example app', () => {
    const readmePath = new URL('../example/README.md', import.meta.url);
    const readme = readFileSync(readmePath, 'utf8');

    const envVarsReadByExampleApp = [
      'PORT',
      'DATABASE_URL',
      'INTERACTIVE_DOMAIN',
      'SEP10_SIGNING_KEY',
      'INTERACTIVE_JWT_SECRET',
      'DISTRIBUTION_ACCOUNT_SECRET',
      'WEBHOOK_SECRET',
      'CHALLENGE_EXPIRATION_SECONDS',
      'ASSET_CODE',
      'ASSET_ISSUER',
      'WATCHERS_ENABLED',
      'DEBUG_WEBHOOKS',
    ];

    for (const envVar of envVarsReadByExampleApp) {
      expect(readme).toContain(`\`${envVar}\``);
    }

    // Table documents the default behavior for each variable.
    expect(readme).toContain('| `PORT` | `3000` |');
    expect(readme).toContain('| `CHALLENGE_EXPIRATION_SECONDS` | `300` |');
    expect(readme).toContain('| `WATCHERS_ENABLED` | enabled |');
  });
});

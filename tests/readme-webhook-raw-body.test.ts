import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('README webhook raw body guidance', () => {
  it('documents Express raw body capture for webhook signature verification', () => {
    const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8');

    expect(readme).toContain('Webhook raw body capture');
    expect(readme).toContain('express.json({');
    expect(readme).toContain('verify: (req, _res, buf)');
    expect(readme).toContain('rawBody');
    expect(readme).toContain('exact request body bytes');
    expect(readme).toContain('before `anchor.getExpressRouter()`');
  });
});

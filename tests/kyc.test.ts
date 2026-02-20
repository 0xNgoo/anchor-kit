import { describe, it, expectTypeOf } from 'vitest';
import type { KycData, KycStatus } from '../src/types';

describe('KycData Type Tests', () => {
  it('should export KycData from types barrel', () => {
    const sample: KycData = {
      id: 'cust-1',
      status: 'not_provided',
    };

    expectTypeOf(sample.id).toMatchTypeOf<string | undefined>();
    expectTypeOf(sample.status).toMatchTypeOf<KycStatus>();
  });

  it('should restrict status to allowed values', () => {
    type Allowed = 'not_provided' | 'pending' | 'approved' | 'rejected';
    expectTypeOf<KycData['status']>().toEqualTypeOf<Allowed>();
  });
});

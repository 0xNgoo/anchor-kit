import type { Customer, KycData } from '@/types/index.ts';

describe('Customer', () => {
  // -- required fields only --

  it('works with just the required fields', () => {
    const c: Customer = {
      id: 'abc-123',
      account_id: 'GABCD1234',
      created_at: Date.now(),
    };

    expect(c.id).toBe('abc-123');
    expect(c.account_id).toBe('GABCD1234');
    expect(c.created_at).toBeTypeOf('number');
  });

  // -- optional fields --

  it('accepts optional contact and kyc fields', () => {
    const c: Customer = {
      id: 'abc-123',
      account_id: 'GABCD1234',
      created_at: Date.now(),
      email_address: 'user@example.com',
      phone_number: '+2348012345678',
      kyc_data: { status: 'pending' },
    };

    expect(c.email_address).toBe('user@example.com');
    expect(c.phone_number).toBe('+2348012345678');
    expect(c.kyc_data?.status).toBe('pending');
  });

  it('allows kyc_data with SEP-12 identity fields', () => {
    const kyc: KycData = {
      status: 'approved',
      first_name: 'Ada',
      last_name: 'Lovelace',
      email_address: 'ada@example.com',
    };

    const c: Customer = {
      id: 'xyz-789',
      account_id: 'GXYZ9876',
      created_at: Date.now(),
      kyc_data: kyc,
    };

    expect(c.kyc_data?.first_name).toBe('Ada');
  });

  // -- compile-time: missing required fields --

  it('rejects missing required fields at compile time', () => {
    // @ts-expect-error — missing id, account_id, created_at
    const bad1: Customer = {};

    // @ts-expect-error — missing account_id and created_at
    const bad2: Customer = { id: 'abc' };

    expect(bad1).toBeDefined();
    expect(bad2).toBeDefined();
  });

  // -- compile-time: kyc_data shape enforcement --

  it('rejects wrong kyc_data shape at compile time', () => {
    const bad: Customer = {
      id: 'abc',
      account_id: 'GABCD',
      created_at: Date.now(),
      // @ts-expect-error — kyc_data must match KycData shape
      kyc_data: { wrong: true },
    };

    expect(bad).toBeDefined();
  });
});

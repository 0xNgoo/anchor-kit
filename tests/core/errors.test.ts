import { describe, it, expect } from 'vitest';
import { TransactionStateError, RailError } from '@/core/errors.ts';

describe('TransactionStateError', () => {
  it('maps statusCode and errorCode and exposes transition metadata', () => {
    const err = new TransactionStateError('invalid transition', 'pending', 'completed', {
      reason: 'test',
    });

    expect(err).toBeInstanceOf(TransactionStateError);
    expect(err.statusCode).toBe(400);
    expect(err.errorCode).toBe('INVALID_STATE_TRANSITION');
    expect(err.currentStatus).toBe('pending');
    expect(err.attemptedStatus).toBe('completed');
    expect(err.context).toEqual(
      expect.objectContaining({
        currentStatus: 'pending',
        attemptedStatus: 'completed',
        reason: 'test',
      }),
    );
  });
});

describe('RailError', () => {
  it('maps statusCode and errorCode and exposes rail metadata', () => {
    const err = new RailError('rail failure', 'ACH', { reason: 'network down' });

    expect(err).toBeInstanceOf(RailError);
    expect(err.statusCode).toBe(500);
    expect(err.errorCode).toBe('RAIL_ERROR');
    expect(err.railName).toBe('ACH');
    expect(err.context).toEqual(
      expect.objectContaining({
        railName: 'ACH',
        reason: 'network down',
      }),
    );
  });

  it('handles optional railName', () => {
    const err = new RailError('generic rail failure');

    expect(err).toBeInstanceOf(RailError);
    expect(err.statusCode).toBe(500);
    expect(err.errorCode).toBe('RAIL_ERROR');
    expect(err.railName).toBeUndefined();
  });
});

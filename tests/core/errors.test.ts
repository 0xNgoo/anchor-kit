import { describe, it, expect } from 'vitest';
import { TransactionStateError } from '../../src/core';

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

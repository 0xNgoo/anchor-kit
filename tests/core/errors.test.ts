import { describe, it, expect, afterEach } from 'vitest';
import { AnchorKitError } from '../../src/core/errors';
import { TransactionStateError } from '../../src/core';

// Test subclass since AnchorKitError is abstract
class TestError extends AnchorKitError {
  public readonly statusCode = 400;
  public readonly errorCode = 'TEST_ERROR';

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

describe('AnchorKitError', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should create an error with basic properties', () => {
    const error = new TestError('This is a test');

    expect(error.message).toBe('This is a test');
    expect(error.statusCode).toBe(400);
    expect(error.errorCode).toBe('TEST_ERROR');
    expect(error.context).toBeUndefined();
    expect(error.name).toBe('TestError');
  });

  it('should include context when provided', () => {
    const context = { details: 'More info' };
    const error = new TestError('Error with context', context);

    expect(error.context).toEqual(context);
  });

  describe('toJSON()', () => {
    it('should format output correctly in non-dev environment', () => {
      process.env.NODE_ENV = 'production';
      const error = new TestError('Production error', { secret: 'hidden' });

      const json = error.toJSON();

      expect(json).toEqual({
        error: 'TEST_ERROR',
        message: 'Production error',
      });
      // Context should not be exposed in production
      expect(json).not.toHaveProperty('context');
    });

    it('should include context in dev environment', () => {
      process.env.NODE_ENV = 'development';
      const context = { debugInfo: 'stuff' };
      const error = new TestError('Dev error', context);

      const json = error.toJSON();

      expect(json).toEqual({
        error: 'TEST_ERROR',
        message: 'Dev error',
        context: { debugInfo: 'stuff' },
      });
    });
  });
});

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

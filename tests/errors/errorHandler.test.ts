import { describe, it, expect } from 'vitest';
import {
  errorHandler,
  AnchorError,
  SepProtocolError,
  RailError,
  ValidationError,
  DatabaseError,
  NetworkError,
  ErrorType,
  asyncHandler,
  logError,
} from '../src/errors/errorHandler';

describe('errorHandler', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('SepProtocolError handling', () => {
    it('should return 400 status with SEP protocol error', () => {
      const error = new SepProtocolError('Invalid SEP-10 challenge', 'INVALID_CHALLENGE');
      const result = errorHandler(error);

      expect(result.statusCode).toBe(400);
      expect(result.response.error.type).toBe('SEP_PROTOCOL');
      expect(result.response.error.message).toBe('Invalid SEP-10 challenge');
      expect(result.response.error.code).toBe('INVALID_CHALLENGE');
    });

    it('should include details in SEP error response', () => {
      const error = new SepProtocolError('Invalid transaction', 'INVALID_TX', {
        field: 'memo',
        value: 'invalid-memo',
      });
      const result = errorHandler(error);

      expect(result.response.error.details).toEqual({
        field: 'memo',
        value: 'invalid-memo',
      });
    });
  });

  describe('RailError handling', () => {
    it('should return 502 status with masked message in production', () => {
      process.env.NODE_ENV = 'production';
      const originalError = new Error('Payment gateway failed');
      const error = new RailError('Payment failed', originalError);
      const result = errorHandler(error);

      expect(result.statusCode).toBe(502);
      expect(result.response.error.type).toBe('RAIL_ERROR');
      expect(result.response.error.message).toBe('Payment rail service unavailable');
      expect(result.response.error.code).toBe('RAIL_ERROR');
      expect(result.response.error.details).toBeUndefined();
    });

    it('should return 502 status with detailed message in development', () => {
      process.env.NODE_ENV = 'development';
      const originalError = new Error('Payment gateway failed');
      const error = new RailError('Payment failed', originalError);
      const result = errorHandler(error);

      expect(result.statusCode).toBe(502);
      expect(result.response.error.message).toBe('Payment failed');
      expect(result.response.error.details).toEqual({
        originalError: 'Payment gateway failed',
      });
    });
  });

  describe('ValidationError handling', () => {
    it('should return 400 status with validation error', () => {
      const error = new ValidationError('Invalid email format', 'email');
      const result = errorHandler(error);

      expect(result.statusCode).toBe(400);
      expect(result.response.error.type).toBe('VALIDATION_ERROR');
      expect(result.response.error.message).toBe('Invalid email format');
      expect(result.response.error.details).toEqual({ field: 'email' });
    });

    it('should handle validation errors without field', () => {
      const error = new ValidationError('Invalid input');
      const result = errorHandler(error);

      expect(result.statusCode).toBe(400);
      expect(result.response.error.details).toEqual({ field: undefined });
    });
  });

  describe('DatabaseError handling', () => {
    it('should return 500 status with masked message in production', () => {
      process.env.NODE_ENV = 'production';
      const originalError = new Error('Connection failed');
      const error = new DatabaseError('Database error', originalError);
      const result = errorHandler(error);

      expect(result.statusCode).toBe(500);
      expect(result.response.error.message).toBe('Service temporarily unavailable');
      expect(result.response.error.details).toBeUndefined();
    });

    it('should return 500 status with detailed message in development', () => {
      process.env.NODE_ENV = 'development';
      const originalError = new Error('Connection failed');
      const error = new DatabaseError('Database error', originalError);
      const result = errorHandler(error);

      expect(result.statusCode).toBe(500);
      expect(result.response.error.message).toBe('Database error');
      expect(result.response.error.details).toEqual({
        originalError: 'Connection failed',
      });
    });
  });

  describe('NetworkError handling', () => {
    it('should return 503 status with masked message in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new NetworkError('Network unavailable');
      const result = errorHandler(error);

      expect(result.statusCode).toBe(503);
      expect(result.response.error.message).toBe('Service temporarily unavailable');
    });
  });

  describe('Standard Error handling', () => {
    it('should return 500 status for generic errors', () => {
      const error = new Error('Something went wrong');
      const result = errorHandler(error);

      expect(result.statusCode).toBe(500);
      expect(result.response.error.type).toBe('UNKNOWN');
      expect(result.response.error.message).toBe('An internal server error occurred');
    });
  });

  describe('Unknown error handling', () => {
    it('should return 500 status for unknown errors', () => {
      const result = errorHandler('not an error');

      expect(result.statusCode).toBe(500);
      expect(result.response.error.type).toBe('UNKNOWN');
      expect(result.response.error.message).toBe('An unexpected error occurred');
    });

    it('should return 500 status for null', () => {
      const result = errorHandler(null);

      expect(result.statusCode).toBe(500);
      expect(result.response.error.type).toBe('UNKNOWN');
    });
  });

  describe('asyncHandler', () => {
    it('should wrap async functions', async () => {
      const fn = asyncHandler(async () => {
        return 'success';
      });

      const result = await fn();
      expect(result).toBe('success');
    });

    it('should propagate errors', async () => {
      const fn = asyncHandler(async () => {
        throw new Error('Test error');
      });

      await expect(fn()).rejects.toThrow('Test error');
    });
  });

  describe('logError', () => {
    it('should log AnchorError with details', () => {
      const error = new SepProtocolError('Test error', 'TEST_CODE', { key: 'value' });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logError(error, { userId: 'user-123' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error',
          type: 'SEP_PROTOCOL',
          code: 'TEST_CODE',
          details: { key: 'value' },
          context: { userId: 'user-123' },
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log standard Error', () => {
      const error = new Error('Standard error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logError(error);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Standard error',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log unknown errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logError('string error', { context: 'data' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unknown error',
          error: 'string error',
          context: { context: 'data' },
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error type constants', () => {
    it('should have all error type constants', () => {
      expect(ErrorType.SEP_PROTOCOL).toBe('SEP_PROTOCOL');
      expect(ErrorType.RAIL_ERROR).toBe('RAIL_ERROR');
      expect(ErrorType.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorType.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorType.UNKNOWN).toBe('UNKNOWN');
    });
  });

  describe('Error classes', () => {
    it('should create SepProtocolError with correct properties', () => {
      const error = new SepProtocolError('Message', 'CODE', { key: 'value' });

      expect(error).toBeInstanceOf(AnchorError);
      expect(error.message).toBe('Message');
      expect(error.type).toBe(ErrorType.SEP_PROTOCOL);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CODE');
      expect(error.details).toEqual({ key: 'value' });
    });

    it('should create RailError with correct properties', () => {
      const original = new Error('Original');
      const error = new RailError('Message', original);

      expect(error.type).toBe(ErrorType.RAIL_ERROR);
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('RAIL_ERROR');
      expect(error.originalError).toBe(original);
    });

    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid input', 'field');

      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'field' });
    });
  });
});

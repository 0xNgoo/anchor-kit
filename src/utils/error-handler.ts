// Global error handler for AnchorKit
import { SepProtocolError, RailError, AnchorKitError } from '../core/errors';

/**
 * Global error handler for API/server responses.
 * Maps AnchorKit errors to safe client/gateway responses.
 * @param err - The error thrown
 * @returns An object with status and safe payload
 */
export function errorHandler(err: unknown): { status: number; payload: object } {
  // SEP protocol errors: safe for client
  if (err instanceof SepProtocolError) {
    return {
      status: err.statusCode,
      payload: {
        error: err.errorCode,
        message: err.message,
        ...(err.sepErrorType && { type: err.sepErrorType }),
      },
    };
  }

  // Rail errors: mask details, safe for gateway
  if (err instanceof RailError) {
    return {
      status: err.statusCode,
      payload: {
        error: err.errorCode,
        message: 'A gateway error occurred.',
      },
    };
  }

  // Other AnchorKit errors: generic message
  if (err instanceof AnchorKitError) {
    return {
      status: err.statusCode,
      payload: {
        error: err.errorCode,
        message: err.message,
      },
    };
  }

  // Unknown/unexpected errors: generic internal error
  return {
    status: 500,
    payload: {
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred.',
    },
  };
}

/**
 * errorHandler - Global error handler for Anchor-Kit applications.
 *
 * Maps different error types to appropriate HTTP responses with proper
 * status codes and payloads. Prevents sensitive information leakage.
 */

/**
 * Error types that can be handled by the error handler.
 */
export enum ErrorType {
  SEP_PROTOCOL = 'SEP_PROTOCOL',
  RAIL_ERROR = 'RAIL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Base error class for Anchor-Kit errors.
 */
export class AnchorError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public statusCode: number = 500,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * SEP Protocol Error - Errors related to SEP implementations.
 */
export class SepProtocolError extends AnchorError {
  constructor(message: string, code?: string, details?: Record<string, unknown>) {
    super(message, ErrorType.SEP_PROTOCOL, 400, code, details);
  }
}

/**
 * Rail Error - Errors from payment rail integrations (masked to prevent leakage).
 */
export class RailError extends AnchorError {
  constructor(message: string, public originalError?: Error) {
    super(message, ErrorType.RAIL_ERROR, 502, 'RAIL_ERROR');
  }
}

/**
 * Validation Error - Input validation failures.
 */
export class ValidationError extends AnchorError {
  constructor(message: string, field?: string) {
    super(message, ErrorType.VALIDATION_ERROR, 400, 'VALIDATION_ERROR', { field });
  }
}

/**
 * Database Error - Database operation failures.
 */
export class DatabaseError extends AnchorError {
  constructor(message: string, public originalError?: Error) {
    super(message, ErrorType.DATABASE_ERROR, 500, 'DATABASE_ERROR');
  }
}

/**
 * Network Error - Network communication failures.
 */
export class NetworkError extends AnchorError {
  constructor(message: string, public originalError?: Error) {
    super(message, ErrorType.NETWORK_ERROR, 503, 'NETWORK_ERROR');
  }
}

/**
 * Error response structure.
 */
export interface ErrorResponse {
  error: {
    type: string;
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Global error handler that maps errors to appropriate HTTP responses.
 *
 * @param error - The error to handle.
 * @returns An object with status code and error response payload.
 */
export function errorHandler(error: unknown): {
  statusCode: number;
  response: ErrorResponse;
} {
  // Handle AnchorError and its subclasses
  if (error instanceof AnchorError) {
    return handleAnchorError(error);
  }

  // Handle standard Error types
  if (error instanceof Error) {
    // Map to generic internal server error
    return {
      statusCode: 500,
      response: {
        error: {
          type: ErrorType.UNKNOWN,
          message: 'An internal server error occurred',
        },
      },
    };
  }

  // Handle unknown error types
  return {
    statusCode: 500,
    response: {
      error: {
        type: ErrorType.UNKNOWN,
        message: 'An unexpected error occurred',
      },
    },
  };
}

/**
 * Handles AnchorError instances.
 */
function handleAnchorError(error: AnchorError): {
  statusCode: number;
  response: ErrorResponse;
} {
  // Mask sensitive details for production
  const isProduction = process.env.NODE_ENV === 'production';

  switch (error.type) {
    case ErrorType.SEP_PROTOCOL:
      // SEP errors should return detailed information for client debugging
      return {
        statusCode: error.statusCode,
        response: {
          error: {
            type: error.type,
            message: error.message,
            code: error.code,
            details: error.details,
          },
        },
      };

    case ErrorType.RAIL_ERROR:
      // Rail errors should mask original error details in production
      if (isProduction && error instanceof RailError) {
        return {
          statusCode: error.statusCode,
          response: {
            error: {
              type: error.type,
              message: 'Payment rail service unavailable',
              code: error.code,
            },
          },
        };
      }
      // In development, include more details
      return {
        statusCode: error.statusCode,
        response: {
          error: {
            type: error.type,
            message: error.message,
            code: error.code,
            ...(error instanceof RailError && !isProduction && {
              details: {
                originalError: error.originalError?.message,
              },
            }),
          },
        },
      };

    case ErrorType.VALIDATION_ERROR:
      return {
        statusCode: error.statusCode,
        response: {
          error: {
            type: error.type,
            message: error.message,
            code: error.code,
            details: error.details,
          },
        },
      };

    case ErrorType.DATABASE_ERROR:
    case ErrorType.NETWORK_ERROR:
      // These errors should be masked in production
      if (isProduction) {
        return {
          statusCode: error.statusCode,
          response: {
            error: {
              type: error.type,
              message: 'Service temporarily unavailable',
            },
          },
        };
      }
      // In development, include details
      return {
        statusCode: error.statusCode,
        response: {
          error: {
            type: error.type,
            message: error.message,
            code: error.code,
            ...(error.originalError && {
              details: {
                originalError: error.originalError.message,
              },
            }),
          },
        },
      };

    default:
      return {
        statusCode: 500,
        response: {
          error: {
            type: ErrorType.UNKNOWN,
            message: 'An internal server error occurred',
          },
        },
      };
  }
}

/**
 * Async error handler wrapper for route handlers.
 * Catches errors and passes them to the error handler.
 *
 * @param fn - An async function to wrap.
 * @returns A wrapped function that handles errors.
 */
export function asyncHandler<T>(
  fn: (...args: unknown[]) => Promise<T>
): (...args: unknown[]) => Promise<T> {
  return async (...args: unknown[]): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw error; // Let the error propagate to the main error handler
    }
  };
}

/**
 * Logging helper for error tracking.
 * Integrate this with your logging solution (e.g., Winston, Pino).
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  if (error instanceof Error) {
    console.error({
      message: error.message,
      stack: error.stack,
      ...(error instanceof AnchorError && {
        type: error.type,
        code: error.code,
        details: error.details,
      }),
      context,
    });
  } else {
    console.error({
      message: 'Unknown error',
      error: String(error),
      context,
    });
  }
}

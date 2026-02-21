export class AnchorKitError extends Error {
  public statusCode: number;
  public errorCode: string;
  public context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode = 500,
    errorCode = 'INTERNAL_ERROR',
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.context = context;
  }

  toJSON() {
    return {
      error: this.errorCode,
      message: this.message,
      ...(typeof (globalThis as any).process !== 'undefined' &&
        (globalThis as any).process.env?.NODE_ENV === 'development' && { context: this.context }),
    };
  }
}

export class ConfigurationError extends AnchorKitError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 500, 'INVALID_CONFIG', context);
  }
}

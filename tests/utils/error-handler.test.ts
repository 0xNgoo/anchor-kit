import { errorHandler } from '../../src/utils/error-handler';
import { SepProtocolError, RailError, AnchorKitError } from '../../src/core/errors';

describe('errorHandler', () => {
  it('maps SepProtocolError to SEP-safe client response', () => {
    const err = new SepProtocolError('Invalid asset', 'ASSET_NOT_FOUND', 'invalid_request');
    const result = errorHandler(err);
    expect(result.status).toBe(400);
    expect(result.payload).toEqual({
      error: 'ASSET_NOT_FOUND',
      message: 'Invalid asset',
      type: 'invalid_request',
    });
  });

  it('maps RailError to masked gateway response', () => {
    const err = new RailError('Sensitive rail failure', 'stellar');
    const result = errorHandler(err);
    expect(result.status).toBe(500);
    expect(result.payload).toEqual({
      error: 'RAIL_ERROR',
      message: 'A gateway error occurred.',
    });
  });

  it('maps unknown errors to generic internal server response', () => {
    const err = new Error('Something unexpected');
    const result = errorHandler(err);
    expect(result.status).toBe(500);
    expect(result.payload).toEqual({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred.',
    });
  });

  it('maps other AnchorKitError to generic message', () => {
    class CustomError extends AnchorKitError {
      public readonly statusCode = 418;
      public readonly errorCode = 'I_AM_A_TEAPOT';
    }
    const err = new CustomError('Short and stout');
    const result = errorHandler(err);
    expect(result.status).toBe(418);
    expect(result.payload).toEqual({
      error: 'I_AM_A_TEAPOT',
      message: 'Short and stout',
    });
  });
});

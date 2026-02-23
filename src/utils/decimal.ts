import Big from 'big.js';

/**
 * DecimalUtils helper object
 * Provides high-precision financial math capabilities for Stellar anchor services.
 * Uses big.js to preserve precision and deterministic behavior.
 */
export const DecimalUtils = {
  /**
   * Converts a string to a Big instance.
   *
   * @param value The decimal string.
   * @returns Big instance.
   */
  fromString(value: string): Big {
    return new Big(value);
  },

  /**
   * Adds two decimal strings.
   *
   * @param a First operand.
   * @param b Second operand.
   * @returns Sum as string.
   */
  add(a: string, b: string): string {
    return new Big(a).plus(b).toFixed();
  },

  /**
   * Subtracts one decimal string from another.
   *
   * @param a Minuend.
   * @param b Subtrahend.
   * @returns Difference as string.
   */
  subtract(a: string, b: string): string {
    return new Big(a).minus(b).toFixed();
  },

  /**
   * Multiplies two decimal strings.
   *
   * @param a Multiplicand.
   * @param b Multiplier.
   * @returns Product as string.
   */
  multiply(a: string, b: string): string {
    return new Big(a).times(b).toFixed();
  },

  /**
   * Divides one decimal string by another with optional precision control.
   *
   * @param a Dividend.
   * @param b Divisor.
   * @param precision Optional decimal places (defaults to 7 for Stellar convention).
   * @returns Quotient as string.
   */
  divide(a: string, b: string, precision: number = 7): string {
    return new Big(a).div(b).toFixed(precision);
  },

  /**
   * Calculates an amount with a percentage fee applied.
   * amount * (1 + feePercentage / 100)
   *
   * @param amount The base amount string.
   * @param feePercentage The fee percentage (e.g., 2.5 for 2.5%).
   * @returns Total amount including fee as string.
   */
  applyFee(amount: string, feePercentage: number): string {
    const bigAmount = new Big(amount);
    const bigFee = new Big(feePercentage).div(100);
    return bigAmount.times(new Big(1).plus(bigFee)).toFixed();
  },
};

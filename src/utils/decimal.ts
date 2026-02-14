/**
 * DecimalUtils - Helper object for precise decimal arithmetic.
 *
 * Financial calculations require precision to avoid rounding errors.
 * This utility provides operations that preserve precision for money calculations.
 */

/**
 * Represents a decimal value with a specified number of decimal places.
 */
interface DecimalValue {
  value: bigint;
  scale: number;
}

/**
 * Creates a DecimalValue from a number or string.
 * Internally stores as bigint with a scale for precision.
 */
function toDecimalValue(input: number | string): DecimalValue {
  const str = typeof input === 'number' ? input.toString() : input;

  // Find decimal point and determine scale
  const dotIndex = str.indexOf('.');
  let scale = 0;
  let valueStr = str;

  if (dotIndex !== -1) {
    scale = str.length - dotIndex - 1;
    // Cap at 7 decimal places (Stellar precision)
    scale = Math.min(scale, 7);
    valueStr = str.replace('.', '').slice(0, str.length - dotIndex - 1 + scale);
  }

  // Pad or trim to exact scale
  while (valueStr.length < scale) {
    valueStr = '0' + valueStr;
  }

  return {
    value: BigInt(valueStr || '0'),
    scale,
  };
}

/**
 * Adds two decimal values with precision.
 *
 * @param a - First operand.
 * @param b - Second operand.
 * @returns The sum as a string.
 * @example
 * DecimalUtils.add('1.23', '4.56'); // '5.79'
 */
export function add(a: number | string, b: number | string): string {
  const decA = toDecimalValue(a);
  const decB = toDecimalValue(b);

  // Align scales
  const maxScale = Math.max(decA.scale, decB.scale);
  const scaleDiff = maxScale - decA.scale;
  const scaleDiffB = maxScale - decB.scale;

  const valueA = decA.value * BigInt(10 ** scaleDiff);
  const valueB = decB.value * BigInt(10 ** scaleDiffB);

  const result = valueA + valueB;
  return fromBigInt(result, maxScale);
}

/**
 * Subtracts two decimal values with precision.
 *
 * @param a - First operand.
 * @param b - Second operand (to subtract from a).
 * @returns The difference as a string.
 * @example
 * DecimalUtils.subtract('10.50', '3.25'); // '7.25'
 */
export function subtract(a: number | string, b: number | string): string {
  const decA = toDecimalValue(a);
  const decB = toDecimalValue(b);

  // Align scales
  const maxScale = Math.max(decA.scale, decB.scale);
  const scaleDiff = maxScale - decA.scale;
  const scaleDiffB = maxScale - decB.scale;

  const valueA = decA.value * BigInt(10 ** scaleDiff);
  const valueB = decB.value * BigInt(10 ** scaleDiffB);

  const result = valueA - valueB;
  return fromBigInt(result, maxScale);
}

/**
 * Multiplies two decimal values with precision.
 *
 * @param a - First operand.
 * @param b - Second operand.
 * @returns The product as a string.
 * @example
 * DecimalUtils.multiply('2.5', '4'); // '10.00'
 */
export function multiply(a: number | string, b: number | string): string {
  const decA = toDecimalValue(a);
  const decB = toDecimalValue(b);

  const result = decA.value * decB.value;
  const scale = decA.scale + decB.scale;

  return fromBigInt(result, scale);
}

/**
 * Divides two decimal values with precision.
 *
 * @param a - Dividend.
 * @param b - Divisor.
 * @returns The quotient as a string.
 * @throws Error if attempting to divide by zero.
 * @example
 * DecimalUtils.divide('10', '4'); // '2.5'
 */
export function divide(a: number | string, b: number | string): string {
  const decA = toDecimalValue(a);
  const decB = toDecimalValue(b);

  if (decB.value === 0n) {
    throw new Error('Division by zero');
  }

  // Multiply by 10^7 for precision, then divide
  const scale = 7;
  const scaledA = decA.value * BigInt(10 ** scale);
  const result = scaledA / decB.value;

  return fromBigInt(result, scale);
}

/**
 * Applies a percentage fee to an amount.
 *
 * @param amount - The base amount.
 * @param feePercent - The fee percentage (e.g., 1.5 for 1.5%).
 * @returns The fee amount as a string.
 * @example
 * DecimalUtils.applyFee('100', '1.5'); // '1.50'
 */
export function applyFee(amount: number | string, feePercent: number | string): string {
  const feeDecimal = divide(multiply(amount, feePercent), '100');
  return feeDecimal;
}

/**
 * Converts a bigint with scale back to a decimal string.
 */
function fromBigInt(value: bigint, scale: number): string {
  if (scale === 0) {
    return value.toString();
  }

  const divisor = BigInt(10 ** scale);
  const whole = value / divisor;
  const fraction = value % divisor;

  const fractionStr = fraction.toString().padStart(scale, '0').replace(/0+$/, '');

  if (fractionStr === '') {
    return whole.toString();
  }

  return `${whole.toString()}.${fractionStr}`;
}

/**
 * Parses a string to a decimal, validating format.
 *
 * @param str - The string to parse.
 * @returns The parsed decimal string.
 * @throws Error if the string is not a valid decimal.
 * @example
 * DecimalUtils.fromString('123.456'); // '123.456'
 */
export function fromString(str: string): string {
  const trimmed = str.trim();

  // Validate format
  if (!/^-?\d*\.?\d+$/.test(trimmed)) {
    throw new Error(`Invalid decimal format: ${str}`);
  }

  return trimmed;
}

/**
 * Compares two decimal values.
 *
 * @param a - First operand.
 * @param b - Second operand.
 * @returns -1 if a < b, 0 if a == b, 1 if a > b.
 */
export function compare(a: number | string, b: number | string): number {
  const decA = toDecimalValue(a);
  const decB = toDecimalValue(b);

  // Align scales
  const maxScale = Math.max(decA.scale, decB.scale);
  const scaleDiff = maxScale - decA.scale;
  const scaleDiffB = maxScale - decB.scale;

  const valueA = decA.value * BigInt(10 ** scaleDiff);
  const valueB = decB.value * BigInt(10 ** scaleDiffB);

  if (valueA < valueB) return -1;
  if (valueA > valueB) return 1;
  return 0;
}

/**
 * DecimalUtils helper object - exported for convenience.
 */
export const DecimalUtils = {
  add,
  subtract,
  multiply,
  divide,
  applyFee,
  fromString,
  compare,
} as const;

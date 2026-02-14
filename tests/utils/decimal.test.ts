import { describe, it, expect } from 'vitest';
import {
  add,
  subtract,
  multiply,
  divide,
  applyFee,
  fromString,
  compare,
  DecimalUtils,
} from '../src/utils/decimal';

describe('DecimalUtils', () => {
  describe('add', () => {
    it('should add two numbers correctly', () => {
      expect(add('1.23', '4.56')).toBe('5.79');
      expect(add('10', '5')).toBe('15');
      expect(add('0.1', '0.2')).toBe('0.3');
    });

    it('should handle different decimal places', () => {
      expect(add('1.2345', '6.789')).toBe('8.0235');
      expect(add('1', '0.999')).toBe('1.999');
    });

    it('should handle zero', () => {
      expect(add('0', '5')).toBe('5');
      expect(add('3.14', '0')).toBe('3.14');
    });
  });

  describe('subtract', () => {
    it('should subtract two numbers correctly', () => {
      expect(subtract('10.50', '3.25')).toBe('7.25');
      expect(subtract('100', '50')).toBe('50');
    });

    it('should handle negative results', () => {
      expect(subtract('5', '10')).toBe('-5');
      expect(subtract('3.14', '10')).toBe('-6.86');
    });

    it('should handle zero', () => {
      expect(subtract('10', '0')).toBe('10');
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers correctly', () => {
      expect(multiply('2.5', '4')).toBe('10');
      expect(multiply('1.5', '2')).toBe('3');
      expect(multiply('0.5', '0.5')).toBe('0.25');
    });

    it('should handle decimals', () => {
      expect(multiply('1.1', '1.1')).toBe('1.21');
      expect(multiply('3.14', '2')).toBe('6.28');
    });

    it('should handle zero', () => {
      expect(multiply('10', '0')).toBe('0');
      expect(multiply('0', '5')).toBe('0');
    });
  });

  describe('divide', () => {
    it('should divide two numbers correctly', () => {
      expect(divide('10', '2')).toBe('5');
      expect(divide('1', '4')).toBe('0.25');
    });

    it('should handle decimal division', () => {
      expect(divide('10', '3')).toBe('3.3333333');
      expect(divide('1', '3')).toBe('0.3333333');
    });

    it('should throw on division by zero', () => {
      expect(() => divide('10', '0')).toThrow('Division by zero');
    });
  });

  describe('applyFee', () => {
    it('should calculate fee correctly', () => {
      expect(applyFee('100', '1.5')).toBe('1.5');
      expect(applyFee('100', '10')).toBe('10');
    });

    it('should handle decimal fees', () => {
      expect(applyFee('1000', '2.5')).toBe('25');
    });

    it('should handle small amounts', () => {
      expect(applyFee('1', '1')).toBe('0.01');
    });
  });

  describe('fromString', () => {
    it('should parse valid decimal strings', () => {
      expect(fromString('123.456')).toBe('123.456');
      expect(fromString('100')).toBe('100');
      expect(fromString('0.001')).toBe('0.001');
    });

    it('should handle whitespace', () => {
      expect(fromString('  123.456  ')).toBe('123.456');
    });

    it('should throw on invalid format', () => {
      expect(() => fromString('not-a-number')).toThrow('Invalid decimal format');
      expect(() => fromString('12.34.56')).toThrow('Invalid decimal format');
    });
  });

  describe('compare', () => {
    it('should return 0 for equal values', () => {
      expect(compare('10', '10')).toBe(0);
      expect(compare('5.5', '5.50')).toBe(0);
    });

    it('should return -1 when first is less than second', () => {
      expect(compare('5', '10')).toBe(-1);
      expect(compare('1.1', '1.2')).toBe(-1);
    });

    it('should return 1 when first is greater than second', () => {
      expect(compare('10', '5')).toBe(1);
      expect(compare('1.2', '1.1')).toBe(1);
    });
  });

  describe('Precision tests', () => {
    it('should preserve precision for financial calculations', () => {
      // Calculate: 100 * (1 + 0.015) = 101.5
      const principal = '100';
      const rate = '0.015';
      const interest = multiply(principal, rate);
      const total = add(principal, interest);

      expect(total).toBe('101.5');
    });

    it('should handle Stellar precision (7 decimals)', () => {
      const amount = '1.1234567';
      const fee = '0.0000001';
      const result = add(amount, fee);

      expect(result).toBe('1.1234568');
    });
  });

  describe('Edge cases', () => {
    it('should handle very large numbers', () => {
      const a = '999999999999';
      const b = '1';
      expect(add(a, b)).toBe('1000000000000');
    });

    it('should handle very small numbers', () => {
      const a = '0.0000001';
      const b = '0.0000001';
      expect(add(a, b)).toBe('0.0000002');
    });
  });

  describe('DecimalUtils helper object', () => {
    it('should export all methods', () => {
      expect(DecimalUtils.add).toBeDefined();
      expect(DecimalUtils.subtract).toBeDefined();
      expect(DecimalUtils.multiply).toBeDefined();
      expect(DecimalUtils.divide).toBeDefined();
      expect(DecimalUtils.applyFee).toBeDefined();
      expect(DecimalUtils.fromString).toBeDefined();
      expect(DecimalUtils.compare).toBeDefined();
    });

    it('should work when called from helper object', () => {
      expect(DecimalUtils.add('1', '2')).toBe('3');
      expect(DecimalUtils.multiply('2', '3')).toBe('6');
    });
  });
});

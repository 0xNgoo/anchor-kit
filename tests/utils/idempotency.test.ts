import { expect, test, describe } from 'bun:test';
import { IdempotencyUtils } from '../../src/utils/idempotency';

type IdempotencyHeaderValue = string | string[] | null | undefined;

describe('IdempotencyUtils', () => {
  test('generateIdempotencyKey returns a string and is unique', () => {
    const a = IdempotencyUtils.generateIdempotencyKey('tx');
    const b = IdempotencyUtils.generateIdempotencyKey('tx');
    expect(typeof a).toBe('string');
    expect(a).not.toBe('');
    expect(a).not.toBe(b);
    expect(a.startsWith('tx-')).toBe(true);
  });

  test('extractIdempotencyHeader handles undefined headers', () => {
    expect(IdempotencyUtils.extractIdempotencyHeader(undefined)).toBeNull();
    expect(IdempotencyUtils.extractIdempotencyHeader(null)).toBeNull();
  });

  test('extractIdempotencyHeader reads Fetch Headers', () => {
    // Create a Headers-like object
    const h = new Headers();
    h.set('Idempotency-Key', '  abc-123  ');
    expect(IdempotencyUtils.extractIdempotencyHeader(h)).toBe('abc-123');
  });

  test('extractIdempotencyHeader handles plain objects case-insensitively', () => {
    const obj: Record<string, IdempotencyHeaderValue> = { 'idempotency-key': 'value-1' };
    expect(IdempotencyUtils.extractIdempotencyHeader(obj)).toBe('value-1');
  });

  test('extractIdempotencyHeader handles array values and empties', () => {
    const obj: Record<string, IdempotencyHeaderValue> = {
      'Idempotency-Key': ['', '   ', 'first-non-empty'],
    };
    expect(IdempotencyUtils.extractIdempotencyHeader(obj)).toBe('first-non-empty');

    const obj2: Record<string, IdempotencyHeaderValue> = { 'Idempotency-Key': ['', '   '] };
    expect(IdempotencyUtils.extractIdempotencyHeader(obj2)).toBeNull();
  });

  test('extractIdempotencyHeader returns null for empty string', () => {
    const obj: Record<string, IdempotencyHeaderValue> = { 'Idempotency-Key': '   ' };
    expect(IdempotencyUtils.extractIdempotencyHeader(obj)).toBeNull();
  });

  test('extractIdempotencyHeader handles array idempotency-key with first non-empty value', () => {
    // Array with multiple values - first non-empty wins
    const obj: Record<string, IdempotencyHeaderValue> = {
      'idempotency-key': ['', 'first-valid', 'second-valid'],
    };
    expect(IdempotencyUtils.extractIdempotencyHeader(obj, 'idempotency-key')).toBe('first-valid');
  });
});

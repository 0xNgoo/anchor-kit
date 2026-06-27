/**
 * Vitest shim for bun:test — re-exports the vitest equivalents so that
 * any test file written against bun:test works unchanged under vitest.
 */
export {
  describe,
  it,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi as mock,
} from 'vitest';

/**
 * Property-Based Tests for Safe Utility Functions
 * Feature: fix-runtime-errors-all-pages
 * 
 * These tests use fast-check for property-based testing to verify
 * that safe utility functions handle all possible inputs correctly.
 */

import * as fc from 'fast-check';
import {
  safeGet,
  safeArray,
  safeCall,
  isDefined,
  isNonEmptyString,
  isNonEmptyArray,
  safeJsonParse,
  safeArrayAccess,
  safeNumber,
  safeBoolean,
  safeAsync,
  safeMerge,
} from '../safe-utils';

describe('Safe Utility Functions - Property-Based Tests', () => {
  /**
   * Feature: fix-runtime-errors-all-pages, Property 5: Safe Property Access
   * Validates: Requirements 1.5, 4.2
   * 
   * For any nested object property access, using optional chaining or null checks
   * should prevent undefined access errors
   */
  describe('Property 5: Safe Property Access', () => {
    it('should never throw when accessing properties on undefined/null objects', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(null), fc.constant(undefined), fc.object()),
          fc.string(),
          fc.anything(),
          (obj, path, defaultValue) => {
            // Should never throw an error
            expect(() => safeGet(obj, path, defaultValue)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return default value for undefined nested properties', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.anything(),
          (path, defaultValue) => {
            const result = safeGet({}, path, defaultValue);
            expect(result).toBe(defaultValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly retrieve existing nested properties', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => !s.includes('.')), // Avoid dots in keys
          fc.anything().filter(v => v !== undefined && v !== null), // Exclude undefined/null as they return default
          (key, value) => {
            const obj = { [key]: value };
            const result = safeGet(obj, key, 'DEFAULT');
            // For arrays and objects, use toEqual instead of toBe
            if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
              expect(result).toEqual(value);
            } else {
              expect(result).toBe(value);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle deeply nested paths safely', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          fc.anything(),
          (keys, defaultValue) => {
            const path = keys.join('.');
            const result = safeGet({}, path, defaultValue);
            expect(result).toBe(defaultValue);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: fix-runtime-errors-all-pages, Property 7: Array Operation Safety
   * Validates: Requirements 2.5, 4.3
   * 
   * For any array that may be undefined or null, operations should verify
   * the array exists before iteration
   */
  describe('Property 7: Array Operation Safety', () => {
    it('should never throw when validating any value as array', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          (value) => {
            expect(() => safeArray(value)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always return an array', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          (value) => {
            const result = safeArray(value);
            expect(Array.isArray(result)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve valid arrays', () => {
      fc.assert(
        fc.property(
          fc.array(fc.anything()),
          (arr) => {
            const result = safeArray(arr);
            expect(result).toEqual(arr);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return default array for non-array values', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(null), fc.constant(undefined), fc.string(), fc.integer(), fc.object()),
          fc.array(fc.anything()),
          (value, defaultArray) => {
            const result = safeArray(value, defaultArray);
            expect(result).toEqual(defaultArray);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should safely access array elements', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.array(fc.anything()), fc.constant(null), fc.constant(undefined)),
          fc.integer(),
          fc.anything(),
          (arr, index, defaultValue) => {
            expect(() => safeArrayAccess(arr, index, defaultValue)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify non-empty arrays', () => {
      fc.assert(
        fc.property(
          fc.array(fc.anything(), { minLength: 1 }),
          (arr) => {
            expect(isNonEmptyArray(arr)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify empty or invalid arrays', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant([]), fc.constant(null), fc.constant(undefined), fc.string(), fc.integer()),
          (value) => {
            expect(isNonEmptyArray(value)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: fix-runtime-errors-all-pages, Property 8: Function Call Safety
   * Validates: Requirements 4.4
   * 
   * For any function passed as a prop or callback, the system should verify
   * the function is defined before invocation
   */
  describe('Property 8: Function Call Safety', () => {
    it('should never throw when calling undefined/null functions', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(null), fc.constant(undefined)),
          fc.array(fc.anything()),
          (fn, args) => {
            expect(() => safeCall(fn as any, ...args)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return undefined for non-function values', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(null), fc.constant(undefined), fc.string(), fc.integer(), fc.object()),
          (value) => {
            const result = safeCall(value as any);
            expect(result).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly call valid functions', () => {
      fc.assert(
        fc.property(
          fc.integer(),
          (num) => {
            const fn = (x: number) => x * 2;
            const result = safeCall(fn, num);
            expect(result).toBe(num * 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle functions that throw errors', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          (value) => {
            const throwingFn = () => {
              throw new Error('Test error');
            };
            const result = safeCall(throwingFn);
            expect(result).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: fix-runtime-errors-all-pages, Property 9: External API Safety
   * Validates: Requirements 4.5
   * 
   * For any external library or API call, the system should handle potential
   * undefined or null return values without crashing
   */
  describe('Property 9: External API Safety', () => {
    it('should safely parse any JSON string', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
          fc.anything(),
          (jsonString, defaultValue) => {
            expect(() => safeJsonParse(jsonString, defaultValue)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return default value for invalid JSON', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            try {
              JSON.parse(s);
              return false;
            } catch {
              return true;
            }
          }),
          fc.anything(),
          (invalidJson, defaultValue) => {
            const result = safeJsonParse(invalidJson, defaultValue);
            expect(result).toEqual(defaultValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should safely convert any value to number', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          fc.integer(),
          (value, defaultValue) => {
            expect(() => safeNumber(value, defaultValue)).not.toThrow();
            const result = safeNumber(value, defaultValue);
            expect(typeof result).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should safely convert any value to boolean', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          (value) => {
            expect(() => safeBoolean(value)).not.toThrow();
            const result = safeBoolean(value);
            expect(typeof result).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should safely handle async operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (shouldSucceed) => {
            const promise = shouldSucceed
              ? Promise.resolve('success')
              : Promise.reject(new Error('failure'));
            
            const [error, result] = await safeAsync(promise);
            
            if (shouldSucceed) {
              expect(error).toBeNull();
              expect(result).toBe('success');
            } else {
              expect(error).toBeInstanceOf(Error);
              expect(result).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should safely merge objects', () => {
      fc.assert(
        fc.property(
          fc.array(fc.oneof(fc.object(), fc.constant(null), fc.constant(undefined))),
          (objects) => {
            expect(() => safeMerge(...objects)).not.toThrow();
            const result = safeMerge(...objects);
            expect(typeof result).toBe('object');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional type guard tests
  describe('Type Guards', () => {
    it('should correctly identify defined values', () => {
      fc.assert(
        fc.property(
          fc.anything().filter(v => v !== null && v !== undefined),
          (value) => {
            expect(isDefined(value)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify undefined/null values', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(null), fc.constant(undefined)),
          (value) => {
            expect(isDefined(value)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify non-empty strings', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          (str) => {
            expect(isNonEmptyString(str)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify empty or invalid strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(''), fc.constant('   '), fc.constant(null), fc.constant(undefined), fc.integer()),
          (value) => {
            expect(isNonEmptyString(value)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

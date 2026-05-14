/**
 * Safe Utility Functions for Defensive Programming
 * 
 * This module provides utility functions to safely access properties,
 * validate arrays, and call functions without throwing errors when
 * encountering undefined or null values.
 */

/**
 * Safely get a nested property from an object using a path string
 * Returns a default value if the property is undefined or null
 * 
 * @example
 * const obj = { user: { profile: { name: 'John' } } };
 * safeGet(obj, 'user.profile.name', 'Unknown'); // 'John'
 * safeGet(obj, 'user.profile.age', 0); // 0
 * safeGet(null, 'user.name', 'Guest'); // 'Guest'
 * 
 * @param obj - The object to access
 * @param path - Dot-separated path to the property (e.g., 'user.profile.name')
 * @param defaultValue - Value to return if property is undefined or null
 * @returns The property value or default value
 */
export function safeGet<T>(
  obj: any,
  path: string,
  defaultValue: T
): T {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }

  const keys = path.split('.');
  let result: any = obj;

  for (const key of keys) {
    if (result === null || result === undefined || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }

  // Return the result if it's defined (including falsy values like 0, false, empty string, empty array)
  // Only return defaultValue if result is strictly undefined or null
  return result !== undefined && result !== null ? result : defaultValue;
}

/**
 * Safely validate and return an array
 * Returns an empty array or provided default if value is not a valid array
 * 
 * @example
 * safeArray([1, 2, 3]); // [1, 2, 3]
 * safeArray(null); // []
 * safeArray(undefined, [0]); // [0]
 * safeArray('not an array'); // []
 * 
 * @param value - Value to validate as array
 * @param defaultValue - Default array to return if value is not an array
 * @returns Valid array or default value
 */
export function safeArray<T>(
  value: any,
  defaultValue: T[] = []
): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return defaultValue;
}

/**
 * Safely call a function if it exists and is callable
 * Returns undefined if function is not defined or not callable
 * 
 * @example
 * const fn = (x: number) => x * 2;
 * safeCall(fn, 5); // 10
 * safeCall(undefined, 5); // undefined
 * safeCall(null, 5); // undefined
 * 
 * @param fn - Function to call
 * @param args - Arguments to pass to the function
 * @returns Function result or undefined
 */
export function safeCall<T extends (...args: any[]) => any>(
  fn: T | undefined | null,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  if (typeof fn === 'function') {
    try {
      return fn(...args);
    } catch (error) {
      console.error('Error calling function:', error);
      return undefined;
    }
  }
  return undefined;
}

/**
 * Type guard to check if a value is defined (not null or undefined)
 * 
 * @example
 * const value: string | undefined = getValue();
 * if (isDefined(value)) {
 *   // TypeScript knows value is string here
 *   console.log(value.toUpperCase());
 * }
 * 
 * @param value - Value to check
 * @returns True if value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if a value is a non-empty string
 * 
 * @example
 * isNonEmptyString('hello'); // true
 * isNonEmptyString(''); // false
 * isNonEmptyString(null); // false
 * isNonEmptyString('   '); // false (after trim)
 * 
 * @param value - Value to check
 * @returns True if value is a non-empty string
 */
export function isNonEmptyString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Type guard to check if a value is a non-empty array
 * 
 * @example
 * isNonEmptyArray([1, 2, 3]); // true
 * isNonEmptyArray([]); // false
 * isNonEmptyArray(null); // false
 * 
 * @param value - Value to check
 * @returns True if value is a non-empty array
 */
export function isNonEmptyArray<T>(value: any): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Safely parse JSON string with fallback value
 * Returns default value if parsing fails
 * 
 * @example
 * safeJsonParse('{"name":"John"}', {}); // { name: 'John' }
 * safeJsonParse('invalid json', {}); // {}
 * safeJsonParse(null, []); // []
 * 
 * @param jsonString - JSON string to parse
 * @param defaultValue - Value to return if parsing fails
 * @returns Parsed object or default value
 */
export function safeJsonParse<T>(
  jsonString: string | null | undefined,
  defaultValue: T
): T {
  if (!jsonString || typeof jsonString !== 'string') {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
}

/**
 * Safely access an array element by index with fallback
 * Returns default value if index is out of bounds or array is invalid
 * 
 * @example
 * safeArrayAccess([1, 2, 3], 1, 0); // 2
 * safeArrayAccess([1, 2, 3], 10, 0); // 0
 * safeArrayAccess(null, 0, 'default'); // 'default'
 * 
 * @param array - Array to access
 * @param index - Index to access
 * @param defaultValue - Value to return if access fails
 * @returns Array element or default value
 */
export function safeArrayAccess<T>(
  array: T[] | null | undefined,
  index: number,
  defaultValue: T
): T {
  if (!Array.isArray(array) || index < 0 || index >= array.length) {
    return defaultValue;
  }
  return array[index] ?? defaultValue;
}

/**
 * Safely convert a value to a number with fallback
 * Returns default value if conversion fails or results in NaN
 * 
 * @example
 * safeNumber('123', 0); // 123
 * safeNumber('abc', 0); // 0
 * safeNumber(null, 0); // 0
 * safeNumber(undefined, 10); // 10
 * 
 * @param value - Value to convert to number
 * @param defaultValue - Value to return if conversion fails
 * @returns Number or default value
 */
export function safeNumber(
  value: any,
  defaultValue: number = 0
): number {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Safely convert a value to a boolean
 * Handles common truthy/falsy string values
 * 
 * @example
 * safeBoolean(true); // true
 * safeBoolean('true'); // true
 * safeBoolean('yes'); // true
 * safeBoolean('1'); // true
 * safeBoolean('false'); // false
 * safeBoolean(null); // false
 * 
 * @param value - Value to convert to boolean
 * @param defaultValue - Value to return if value is null/undefined
 * @returns Boolean value
 */
export function safeBoolean(
  value: any,
  defaultValue: boolean = false
): boolean {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === 'yes' || lower === '1';
  }

  return Boolean(value);
}

/**
 * Create a safe version of an async function that catches errors
 * Returns a tuple of [error, result] similar to Go's error handling
 * 
 * @example
 * const [error, data] = await safeAsync(fetchData());
 * if (error) {
 *   console.error('Failed to fetch:', error);
 *   return;
 * }
 * console.log('Data:', data);
 * 
 * @param promise - Promise to execute safely
 * @returns Tuple of [error, result]
 */
export async function safeAsync<T>(
  promise: Promise<T>
): Promise<[Error | null, T | null]> {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}

/**
 * Safely merge multiple objects with type safety
 * Later objects override earlier ones
 * Filters out null and undefined values
 * 
 * @example
 * safeMerge({ a: 1 }, { b: 2 }, { a: 3 }); // { a: 3, b: 2 }
 * safeMerge({ a: 1 }, null, { b: 2 }); // { a: 1, b: 2 }
 * 
 * @param objects - Objects to merge
 * @returns Merged object
 */
export function safeMerge<T extends Record<string, any>>(
  ...objects: (T | null | undefined)[]
): T {
  return objects.reduce<T>((acc, obj) => {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return { ...acc, ...obj } as T;
    }
    return acc;
  }, {} as T);
}

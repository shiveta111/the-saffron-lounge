/**
 * Response Normalizer Utility
 * 
 * Handles various backend response structures and normalizes them to a consistent format.
 * This utility extracts data from nested structures, handles pagination, and provides
 * fallback values for missing data.
 */

export interface NormalizedResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  
  return current;
}

/**
 * Extract array data from various response structures
 * 
 * Handles multiple response formats:
 * - { success: true, data: { items: [...] } }
 * - { success: true, data: { [entityName]: [...] } }
 * - { success: true, data: [...] }
 * - { success: true, items: [...] }
 * - { success: true, [entityName]: [...] }
 */
export function extractArray<T>(response: any, entityName?: string): T[] {
  console.log('🔍 Extracting array from response:', {
    hasResponse: !!response,
    hasData: !!response?.data,
    entityName,
    responseKeys: response ? Object.keys(response) : [],
    dataKeys: response?.data ? Object.keys(response.data) : []
  });

  if (!response) {
    console.warn('⚠️ No response provided to extractArray');
    return [];
  }

  // Priority 1: response.data.items
  if (response.data?.items && Array.isArray(response.data.items)) {
    console.log('✅ Found array at response.data.items:', response.data.items.length);
    return response.data.items;
  }

  // Priority 2: response.data.[entityName] (e.g., response.data.services)
  if (entityName && response.data?.[entityName] && Array.isArray(response.data[entityName])) {
    console.log(`✅ Found array at response.data.${entityName}:`, response.data[entityName].length);
    return response.data[entityName];
  }

  // Priority 3: response.data.data (nested data)
  if (response.data?.data && Array.isArray(response.data.data)) {
    console.log('✅ Found array at response.data.data:', response.data.data.length);
    return response.data.data;
  }

  // Priority 4: response.data as direct array
  if (response.data && Array.isArray(response.data)) {
    console.log('✅ Found array at response.data:', response.data.length);
    return response.data;
  }

  // Priority 5: response.items
  if (response.items && Array.isArray(response.items)) {
    console.log('✅ Found array at response.items:', response.items.length);
    return response.items;
  }

  // Priority 6: response.[entityName] (e.g., response.services)
  if (entityName && response[entityName] && Array.isArray(response[entityName])) {
    console.log(`✅ Found array at response.${entityName}:`, response[entityName].length);
    return response[entityName];
  }

  // Priority 7: Check for numeric keys (weird response format)
  const numericKeys = Object.keys(response).filter(key => !isNaN(Number(key)));
  if (numericKeys.length > 0) {
    const items = numericKeys.map(key => response[key]).filter(item => item && typeof item === 'object');
    if (items.length > 0) {
      console.log('✅ Found array from numeric keys:', items.length);
      return items;
    }
  }

  console.warn('⚠️ No array found in response, returning empty array');
  return [];
}

/**
 * Extract single entity from response
 */
export function extractEntity<T>(response: any): T | null {
  console.log('🔍 Extracting entity from response:', {
    hasResponse: !!response,
    hasData: !!response?.data,
    responseKeys: response ? Object.keys(response) : []
  });

  if (!response) {
    console.warn('⚠️ No response provided to extractEntity');
    return null;
  }

  // Priority 1: response.data (most common)
  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    // Check if it's a wrapper with nested data
    if (response.data.data && typeof response.data.data === 'object') {
      console.log('✅ Found entity at response.data.data');
      return response.data.data;
    }
    console.log('✅ Found entity at response.data');
    return response.data;
  }

  // Priority 2: response itself (if it's an object)
  if (typeof response === 'object' && !Array.isArray(response) && response.success !== undefined) {
    // Remove metadata fields
    const { success, message, error, ...entity } = response;
    if (Object.keys(entity).length > 0) {
      console.log('✅ Found entity in response root');
      return entity as T;
    }
  }

  console.warn('⚠️ No entity found in response');
  return null;
}

/**
 * Extract error message from error response
 */
export function extractError(error: any): string {
  console.log('🔍 Extracting error message:', {
    hasError: !!error,
    hasResponse: !!error?.response,
    errorType: typeof error
  });

  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Priority order for error message extraction
  const possiblePaths = [
    'response.data.message',
    'response.data.error',
    'response.data.errors[0].message',
    'response.data.errors[0]',
    'message',
    'error',
  ];

  for (const path of possiblePaths) {
    const message = getNestedValue(error, path);
    if (message && typeof message === 'string') {
      console.log(`✅ Found error message at ${path}:`, message);
      return message;
    }
  }

  // Check if error.response.data is a string
  if (error.response?.data && typeof error.response.data === 'string') {
    console.log('✅ Found error message in response.data (string)');
    return error.response.data;
  }

  // Fallback to generic message
  console.warn('⚠️ No specific error message found, using generic message');
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Extract pagination metadata from response
 */
export function extractPagination(response: any): NormalizedResponse<any>['pagination'] {
  if (!response) return undefined;

  // Check response.data.pagination
  if (response.data?.pagination) {
    return {
      page: response.data.pagination.page || response.data.pagination.currentPage || 1,
      limit: response.data.pagination.limit || response.data.pagination.pageSize || 20,
      total: response.data.pagination.total || response.data.pagination.totalItems || 0,
      pages: response.data.pagination.pages || response.data.pagination.totalPages || 1,
    };
  }

  // Check response.pagination
  if (response.pagination) {
    return {
      page: response.pagination.page || response.pagination.currentPage || 1,
      limit: response.pagination.limit || response.pagination.pageSize || 20,
      total: response.pagination.total || response.pagination.totalItems || 0,
      pages: response.pagination.pages || response.pagination.totalPages || 1,
    };
  }

  return undefined;
}

/**
 * Normalize full response to consistent format
 */
export function normalize<T>(response: any, entityName?: string): NormalizedResponse<T> {
  console.log('🔄 Normalizing response:', { entityName, hasResponse: !!response });

  if (!response) {
    return {
      success: false,
      data: null,
      error: 'No response received from server',
    };
  }

  // Check if response indicates success
  const success = response.success !== false;

  // Extract data
  const data = extractArray<T>(response, entityName);

  // Extract pagination if present
  const pagination = extractPagination(response);

  return {
    success,
    data: data.length > 0 ? (data as any) : null,
    error: success ? null : extractError(response),
    pagination,
  };
}

/**
 * Normalize a single entity response
 */
export function normalizeSingle<T>(response: any): NormalizedResponse<T> {
  console.log('🔄 Normalizing single entity response');

  if (!response) {
    return {
      success: false,
      data: null,
      error: 'No response received from server',
    };
  }

  const success = response.success !== false;
  const data = extractEntity<T>(response);

  return {
    success,
    data,
    error: success ? null : extractError(response),
  };
}

/**
 * Response normalizer object with all methods
 */
export const responseNormalizer = {
  extractArray,
  extractEntity,
  extractError,
  extractPagination,
  normalize,
  normalizeSingle,
};

export default responseNormalizer;

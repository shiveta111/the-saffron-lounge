/**
 * useAdminData Hook
 * 
 * Custom hook for fetching and managing admin data with automatic
 * response normalization, error handling, and real-time updates.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { extractArray, extractError } from '../response-normalizer';
import { extractErrorInfo, logError } from '../error-handler';
import { applyFieldMappingToArray, getFieldMapping } from '../field-mappings';

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface UseAdminDataOptions<T> {
  queryKey: string[];
  fetchFn: (params?: any) => Promise<any>;
  entityName?: string;
  entityType?: string;
  params?: Record<string, any>;
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: T[]) => void;
  onError?: (error: string) => void;
}

export interface UseAdminDataReturn<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => void;
  pagination?: PaginationInfo;
}

/**
 * Custom hook for fetching admin data with normalization
 */
export function useAdminData<T = any>(
  options: UseAdminDataOptions<T>
): UseAdminDataReturn<T> {
  const {
    queryKey,
    fetchFn,
    entityName,
    entityType,
    params,
    enabled = true,
    refetchInterval,
    onSuccess,
    onError,
  } = options;

  const queryOptions: UseQueryOptions<T[], Error> = {
    queryKey: params ? [...queryKey, params] : queryKey,
    queryFn: async () => {
      try {
        console.log(`🔄 Fetching data for ${entityName || 'entity'}:`, { params });
        
        const response = await fetchFn(params);
        
        console.log(`📥 Raw response for ${entityName || 'entity'}:`, response);

        // Extract array from response
        let data = extractArray<T>(response, entityName);

        // Apply field mapping if entity type is specified
        if (entityType) {
          const fieldMapping = getFieldMapping(entityType);
          if (Object.keys(fieldMapping).length > 0) {
            console.log(`🔄 Applying field mapping for ${entityType}`);
            data = applyFieldMappingToArray<T>(data, fieldMapping);
          }
        }

        console.log(`✅ Processed ${data.length} items for ${entityName || 'entity'}`);

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess(data);
        }

        return data;
      } catch (error: any) {
        console.error(`❌ Error fetching ${entityName || 'entity'}:`, error);
        
        // Extract error info
        const errorInfo = extractErrorInfo(error);
        logError(error, `useAdminData: ${entityName || 'entity'}`);

        // Call onError callback if provided
        if (onError) {
          onError(errorInfo.message);
        }

        throw new Error(errorInfo.message);
      }
    },
    enabled,
    refetchInterval,
    retry: 1,
    staleTime: 30000, // Consider data fresh for 30 seconds
  };

  const query = useQuery(queryOptions);

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message || null,
    refetch: query.refetch,
    pagination: undefined, // TODO: Extract pagination from response
  };
}

export default useAdminData;

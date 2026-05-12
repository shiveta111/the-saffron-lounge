/**
 * useAdminMutation Hook
 * 
 * Custom hook for data mutations (create, update, delete) with automatic
 * error handling, toast notifications, and query cache invalidation.
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { extractErrorInfo, logError } from '../error-handler';
import { normalizeSingle } from '../response-normalizer';

export interface UseAdminMutationOptions<TData = any, TVariables = any> {
  mutationFn: (variables: TVariables) => Promise<any>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: string, variables: TVariables) => void;
  invalidateQueries?: string[][];
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

export interface UseAdminMutationReturn<TData = any, TVariables = any> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  isSuccess: boolean;
  reset: () => void;
}

/**
 * Custom hook for data mutations with automatic error handling and notifications
 */
export function useAdminMutation<TData = any, TVariables = any>(
  options: UseAdminMutationOptions<TData, TVariables>
): UseAdminMutationReturn<TData, TVariables> {
  const {
    mutationFn,
    onSuccess,
    onError,
    invalidateQueries = [],
    successMessage,
    errorMessage,
    showSuccessToast = true,
    showErrorToast = true,
  } = options;

  const queryClient = useQueryClient();

  const mutationOptions: UseMutationOptions<TData, Error, TVariables> = {
    mutationFn: async (variables: TVariables) => {
      try {
        console.log('🔄 Executing mutation:', { variables });
        
        const response = await mutationFn(variables);
        
        console.log('📥 Mutation response:', response);

        // Normalize response
        const normalized = normalizeSingle<TData>(response);

        if (!normalized.success && normalized.error) {
          throw new Error(normalized.error);
        }

        return normalized.data as TData;
      } catch (error: any) {
        console.error('❌ Mutation error:', error);
        
        // Extract error info
        const errorInfo = extractErrorInfo(error);
        logError(error, 'useAdminMutation');

        throw new Error(errorInfo.message);
      }
    },
    onSuccess: (data, variables) => {
      console.log('✅ Mutation successful:', { data, variables });

      // Show success toast
      if (showSuccessToast && successMessage) {
        toast.success(successMessage);
      }

      // Invalidate queries
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      // Call custom onSuccess callback
      if (onSuccess) {
        onSuccess(data, variables);
      }
    },
    onError: (error, variables) => {
      console.error('❌ Mutation failed:', { error, variables });

      const errorMsg = error.message || errorMessage || 'Operation failed';

      // Show error toast
      if (showErrorToast) {
        toast.error(errorMsg);
      }

      // Call custom onError callback
      if (onError) {
        onError(errorMsg, variables);
      }
    },
    retry: 0, // Don't retry mutations
  };

  const mutation = useMutation(mutationOptions);

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error?.message || null,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}

/**
 * Hook for create operations
 */
export function useAdminCreate<TData = any, TVariables = any>(
  options: Omit<UseAdminMutationOptions<TData, TVariables>, 'successMessage'> & {
    entityName: string;
  }
) {
  return useAdminMutation<TData, TVariables>({
    ...options,
    successMessage: `${options.entityName} created successfully`,
  });
}

/**
 * Hook for update operations
 */
export function useAdminUpdate<TData = any, TVariables = any>(
  options: Omit<UseAdminMutationOptions<TData, TVariables>, 'successMessage'> & {
    entityName: string;
  }
) {
  return useAdminMutation<TData, TVariables>({
    ...options,
    successMessage: `${options.entityName} updated successfully`,
  });
}

/**
 * Hook for delete operations
 */
export function useAdminDelete<TData = any, TVariables = any>(
  options: Omit<UseAdminMutationOptions<TData, TVariables>, 'successMessage'> & {
    entityName: string;
  }
) {
  return useAdminMutation<TData, TVariables>({
    ...options,
    successMessage: `${options.entityName} deleted successfully`,
  });
}

export default useAdminMutation;

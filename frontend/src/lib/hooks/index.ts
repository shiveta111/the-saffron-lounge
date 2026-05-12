/**
 * Hooks Index
 * 
 * Central export for all custom hooks
 */

export { useAdminData } from './use-admin-data';
export type { UseAdminDataOptions, UseAdminDataReturn, PaginationInfo } from './use-admin-data';

export { 
  useAdminMutation, 
  useAdminCreate, 
  useAdminUpdate, 
  useAdminDelete 
} from './use-admin-mutation';
export type { UseAdminMutationOptions, UseAdminMutationReturn } from './use-admin-mutation';

import { toast as sonnerToast } from 'sonner';
import { extractErrorInfo, ErrorType } from './error-handler';

/**
 * Toast notification utilities
 */

interface ToastOptions {
  duration?: number;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Show success toast
 */
export function showSuccess(message: string, options?: ToastOptions) {
  sonnerToast.success(message, {
    duration: options?.duration || 4000,
    description: options?.description,
    action: options?.action,
  });
}

/**
 * Show error toast
 */
export function showError(message: string, options?: ToastOptions) {
  sonnerToast.error(message, {
    duration: options?.duration || 5000,
    description: options?.description,
    action: options?.action,
  });
}

/**
 * Show warning toast
 */
export function showWarning(message: string, options?: ToastOptions) {
  sonnerToast.warning(message, {
    duration: options?.duration || 4000,
    description: options?.description,
    action: options?.action,
  });
}

/**
 * Show info toast
 */
export function showInfo(message: string, options?: ToastOptions) {
  sonnerToast.info(message, {
    duration: options?.duration || 4000,
    description: options?.description,
    action: options?.action,
  });
}

/**
 * Show loading toast
 */
export function showLoading(message: string) {
  return sonnerToast.loading(message);
}

/**
 * Dismiss toast
 */
export function dismissToast(toastId: string | number) {
  sonnerToast.dismiss(toastId);
}

/**
 * Show error from API response
 */
export function showApiError(error: any, fallbackMessage?: string) {
  const errorInfo = extractErrorInfo(error);
  
  let description: string | undefined;
  
  // Add specific descriptions based on error type
  switch (errorInfo.type) {
    case ErrorType.NETWORK:
      description = 'Please check your internet connection';
      break;
    case ErrorType.AUTHENTICATION:
      description = 'You may need to log in again';
      break;
    case ErrorType.AUTHORIZATION:
      description = 'Contact your administrator if you need access';
      break;
    case ErrorType.VALIDATION:
      description = 'Please check the form for errors';
      break;
    case ErrorType.SERVER:
      description = 'Our team has been notified';
      break;
  }
  
  showError(errorInfo.message || fallbackMessage || 'An error occurred', {
    description,
    duration: 6000,
  });
}

/**
 * Show promise toast (loading -> success/error)
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) {
  return sonnerToast.promise(promise, {
    loading: messages.loading,
    success: (data) => {
      return typeof messages.success === 'function'
        ? messages.success(data)
        : messages.success;
    },
    error: (error) => {
      const errorInfo = extractErrorInfo(error);
      return typeof messages.error === 'function'
        ? messages.error(error)
        : errorInfo.message || messages.error;
    },
  });
}

/**
 * Show validation errors as toast
 */
export function showValidationErrors(errors: Record<string, string>) {
  const errorCount = Object.keys(errors).length;
  const firstError = Object.values(errors)[0];
  
  if (errorCount === 1) {
    showError(firstError);
  } else {
    showError('Please fix the validation errors', {
      description: `${errorCount} fields need attention`,
    });
  }
}

/**
 * Toast helper for common operations
 */
export const toast = {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  dismiss: dismissToast,
  apiError: showApiError,
  promise: showPromise,
  validationErrors: showValidationErrors,
};

export default toast;

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormErrorProps {
  error?: string;
  className?: string;
}

/**
 * Display validation error for a form field
 */
export function FormError({ error, className }: FormErrorProps) {
  if (!error) return null;
  
  return (
    <div className={cn('flex items-center gap-1 text-sm text-red-600 mt-1', className)}>
      <AlertCircle className="h-4 w-4" />
      <span>{error}</span>
    </div>
  );
}

interface FormFieldErrorsProps {
  errors: Record<string, string>;
  className?: string;
}

/**
 * Display all form validation errors
 */
export function FormFieldErrors({ errors, className }: FormFieldErrorsProps) {
  const errorList = Object.entries(errors);
  
  if (errorList.length === 0) return null;
  
  return (
    <div className={cn('bg-red-50 border border-red-200 rounded-md p-4', className)}>
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-2">
            Please fix the following errors:
          </h3>
          <ul className="list-disc list-inside space-y-1">
            {errorList.map(([field, error]) => (
              <li key={field} className="text-sm text-red-700">
                <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</span> {error}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface FormSuccessProps {
  message: string;
  className?: string;
}

/**
 * Display success message
 */
export function FormSuccess({ message, className }: FormSuccessProps) {
  return (
    <div className={cn('bg-green-50 border border-green-200 rounded-md p-4', className)}>
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-green-600 flex items-center justify-center">
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-green-800">{message}</p>
      </div>
    </div>
  );
}

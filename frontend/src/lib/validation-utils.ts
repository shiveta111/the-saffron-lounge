import { z } from 'zod';

/**
 * Format validation errors from Zod for display
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  
  error.issues.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  
  return errors;
}

/**
 * Get first validation error message
 */
export function getFirstError(error: z.ZodError): string {
  return error.issues[0]?.message || 'Validation failed';
}

/**
 * Validate data against schema and return formatted errors
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    errors: formatValidationErrors(result.error),
  };
}

/**
 * Common validation patterns
 */
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+44|0)[1-9]\d{9,10}$/,
  postcode: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
  url: /^https?:\/\/.+/,
  time: /^([01]\d|2[0-3]):([0-5]\d)$/,
};

/**
 * Validation helper functions
 */
export const validators = {
  isEmail: (value: string): boolean => validationPatterns.email.test(value),
  isPhone: (value: string): boolean => validationPatterns.phone.test(value),
  isPostcode: (value: string): boolean => validationPatterns.postcode.test(value),
  isUrl: (value: string): boolean => validationPatterns.url.test(value),
  isTime: (value: string): boolean => validationPatterns.time.test(value),
  
  isPositiveNumber: (value: number): boolean => value > 0,
  isNonNegativeNumber: (value: number): boolean => value >= 0,
  
  isInRange: (value: number, min: number, max: number): boolean => 
    value >= min && value <= max,
  
  isFutureDate: (date: string | Date): boolean => 
    new Date(date) > new Date(),
  
  isValidLength: (value: string, min: number, max: number): boolean =>
    value.length >= min && value.length <= max,
};

/**
 * Sanitize input data
 */
export const sanitizers = {
  trimString: (value: string): string => value.trim(),
  
  normalizeEmail: (email: string): string => email.toLowerCase().trim(),
  
  normalizePostcode: (postcode: string): string => 
    postcode.toUpperCase().replace(/\s+/g, ''),
  
  normalizePhone: (phone: string): string => 
    phone.replace(/\s+/g, '').replace(/^0/, '+44'),
  
  stripHtml: (value: string): string => 
    value.replace(/<[^>]*>/g, ''),
  
  limitLength: (value: string, maxLength: number): string =>
    value.length > maxLength ? value.substring(0, maxLength) : value,
};

/**
 * Form field validation messages
 */
export const validationMessages = {
  required: (field: string) => `${field} is required`,
  minLength: (field: string, min: number) => 
    `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) => 
    `${field} must not exceed ${max} characters`,
  min: (field: string, min: number) => 
    `${field} must be at least ${min}`,
  max: (field: string, max: number) => 
    `${field} must not exceed ${max}`,
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid UK phone number',
  postcode: 'Please enter a valid UK postcode',
  url: 'Please enter a valid URL',
  time: 'Please enter a valid time (HH:MM)',
  futureDate: 'Date must be in the future',
  positiveNumber: 'Value must be positive',
  nonNegativeNumber: 'Value must be non-negative',
  match: (field1: string, field2: string) => 
    `${field1} and ${field2} must match`,
};

/**
 * Real-time field validation
 */
export function validateField(
  value: any,
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean;
  }
): string | null {
  if (rules.required && (!value || value.toString().trim() === '')) {
    return 'This field is required';
  }
  
  if (rules.minLength && value.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`;
  }
  
  if (rules.maxLength && value.length > rules.maxLength) {
    return `Must not exceed ${rules.maxLength} characters`;
  }
  
  if (rules.min !== undefined && value < rules.min) {
    return `Must be at least ${rules.min}`;
  }
  
  if (rules.max !== undefined && value > rules.max) {
    return `Must not exceed ${rules.max}`;
  }
  
  if (rules.pattern && !rules.pattern.test(value)) {
    return 'Invalid format';
  }
  
  if (rules.custom && !rules.custom(value)) {
    return 'Invalid value';
  }
  
  return null;
}

/**
 * Debounced validation for real-time feedback
 */
export function createDebouncedValidator(
  validator: (value: any) => Promise<string | null>,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;
  
  return (value: any): Promise<string | null> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const error = await validator(value);
        resolve(error);
      }, delay);
    });
  };
}

/**
 * Validate file upload
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  }
): string | null {
  if (options.maxSize && file.size > options.maxSize) {
    const maxSizeMB = (options.maxSize / (1024 * 1024)).toFixed(2);
    return `File size must not exceed ${maxSizeMB}MB`;
  }
  
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    return `File type must be one of: ${options.allowedTypes.join(', ')}`;
  }
  
  if (options.allowedExtensions) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !options.allowedExtensions.includes(extension)) {
      return `File extension must be one of: ${options.allowedExtensions.join(', ')}`;
    }
  }
  
  return null;
}

/**
 * Validate image dimensions
 */
export function validateImageDimensions(
  file: File,
  options: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    aspectRatio?: number; // width/height
  }
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      if (options.minWidth && img.width < options.minWidth) {
        resolve(`Image width must be at least ${options.minWidth}px`);
        return;
      }
      
      if (options.maxWidth && img.width > options.maxWidth) {
        resolve(`Image width must not exceed ${options.maxWidth}px`);
        return;
      }
      
      if (options.minHeight && img.height < options.minHeight) {
        resolve(`Image height must be at least ${options.minHeight}px`);
        return;
      }
      
      if (options.maxHeight && img.height > options.maxHeight) {
        resolve(`Image height must not exceed ${options.maxHeight}px`);
        return;
      }
      
      if (options.aspectRatio) {
        const ratio = img.width / img.height;
        const tolerance = 0.1;
        if (Math.abs(ratio - options.aspectRatio) > tolerance) {
          resolve(`Image aspect ratio must be approximately ${options.aspectRatio}:1`);
          return;
        }
      }
      
      resolve(null);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('Failed to load image');
    };
    
    img.src = url;
  });
}

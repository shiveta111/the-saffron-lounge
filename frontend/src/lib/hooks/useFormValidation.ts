import { useState, useCallback } from 'react';
import { z } from 'zod';
import { formatValidationErrors } from '../validation-utils';

interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
  initialValues?: Partial<T>;
}

interface FormState<T> {
  values: Partial<T>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

export function useFormValidation<T extends Record<string, any>>({
  schema,
  onSubmit,
  initialValues = {},
}: UseFormValidationOptions<T>) {
  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: false,
  });

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    (name: keyof T, value: any): string | null => {
      try {
        // Create a partial schema for the field
        const fieldSchema = (schema as z.ZodObject<any>).pick({ [name]: true } as any);
        fieldSchema.parse({ [name]: value });
        return null;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return error.issues[0]?.message || 'Invalid value';
        }
        return 'Validation error';
      }
    },
    [schema]
  );

  /**
   * Validate all fields
   */
  const validateForm = useCallback((): boolean => {
    const result = schema.safeParse(formState.values);
    
    if (result.success) {
      setFormState((prev) => ({ ...prev, errors: {}, isValid: true }));
      return true;
    }
    
    const errors = formatValidationErrors(result.error);
    setFormState((prev) => ({ ...prev, errors, isValid: false }));
    return false;
  }, [schema, formState.values]);

  /**
   * Handle field change
   */
  const handleChange = useCallback(
    (name: keyof T, value: any) => {
      setFormState((prev) => {
        const newValues = { ...prev.values, [name]: value };
        const newTouched = { ...prev.touched, [name]: true };
        
        // Validate field if it's been touched
        let newErrors = { ...prev.errors };
        if (newTouched[name as string]) {
          const error = validateField(name, value);
          if (error) {
            newErrors[name as string] = error;
          } else {
            delete newErrors[name as string];
          }
        }
        
        return {
          ...prev,
          values: newValues,
          touched: newTouched,
          errors: newErrors,
        };
      });
    },
    [validateField]
  );

  /**
   * Handle field blur
   */
  const handleBlur = useCallback(
    (name: keyof T) => {
      setFormState((prev) => {
        const newTouched = { ...prev.touched, [name]: true };
        const value = prev.values[name];
        
        // Validate field on blur
        const error = validateField(name, value);
        const newErrors = { ...prev.errors };
        if (error) {
          newErrors[name as string] = error;
        } else {
          delete newErrors[name as string];
        }
        
        return {
          ...prev,
          touched: newTouched,
          errors: newErrors,
        };
      });
    },
    [validateField]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      
      // Mark all fields as touched
      const allTouched = Object.keys(formState.values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      );
      
      setFormState((prev) => ({ ...prev, touched: allTouched }));
      
      // Validate form
      if (!validateForm()) {
        return;
      }
      
      // Submit form
      setFormState((prev) => ({ ...prev, isSubmitting: true }));
      
      try {
        await onSubmit(formState.values as T);
      } catch (error: any) {
        // Handle submission errors
        if (error.response?.data?.details) {
          // API validation errors
          const apiErrors: Record<string, string> = {};
          error.response.data.details.forEach((detail: any) => {
            apiErrors[detail.field] = detail.message;
          });
          setFormState((prev) => ({ ...prev, errors: apiErrors }));
        }
      } finally {
        setFormState((prev) => ({ ...prev, isSubmitting: false }));
      }
    },
    [formState.values, validateForm, onSubmit]
  );

  /**
   * Reset form
   */
  const resetForm = useCallback(() => {
    setFormState({
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: false,
    });
  }, [initialValues]);

  /**
   * Set form values
   */
  const setValues = useCallback((values: Partial<T>) => {
    setFormState((prev) => ({ ...prev, values: { ...prev.values, ...values } }));
  }, []);

  /**
   * Set form errors
   */
  const setErrors = useCallback((errors: Record<string, string>) => {
    setFormState((prev) => ({ ...prev, errors }));
  }, []);

  /**
   * Get field props for easy integration with inputs
   */
  const getFieldProps = useCallback(
    (name: keyof T) => ({
      name: name as string,
      value: formState.values[name] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        handleChange(name, e.target.value);
      },
      onBlur: () => handleBlur(name),
      error: formState.touched[name as string] ? formState.errors[name as string] : undefined,
    }),
    [formState, handleChange, handleBlur]
  );

  return {
    values: formState.values,
    errors: formState.errors,
    touched: formState.touched,
    isSubmitting: formState.isSubmitting,
    isValid: formState.isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValues,
    setErrors,
    validateForm,
    getFieldProps,
  };
}

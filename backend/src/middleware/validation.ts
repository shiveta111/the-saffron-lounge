import { Request, Response, NextFunction } from 'express';
import * as Joi from 'joi';

/**
 * Middleware factory for validating request data using Joi schemas
 * @param schema - Joi schema to validate against
 * @param property - Request property to validate ('body', 'query', 'params')
 */
export const validate = (
  schema: Joi.ObjectSchema,
  property: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Remove undefined values from the request data before validation
    const requestData = req[property];
    let cleanData: any = requestData;
    
    if (requestData && typeof requestData === 'object' && !Array.isArray(requestData)) {
      cleanData = { ...requestData };
      Object.keys(cleanData).forEach(key => {
        // Remove undefined, null, empty string values for optional fields
        if (cleanData[key] === undefined || cleanData[key] === null || cleanData[key] === '') {
          delete cleanData[key];
        } else if (key === 'menuId' && (cleanData[key] === null || cleanData[key] === '' || cleanData[key] === 0)) {
          // Remove menuId if it's null, empty string, or 0 (products are created independently)
          delete cleanData[key];
        } else if (key === 'category' && cleanData.categoryId) {
          // Remove category field if categoryId is present (category is auto-populated from categoryId)
          delete cleanData[key];
        } else if (property === 'query' && typeof cleanData[key] === 'string' && cleanData[key].trim() === '') {
          // Remove empty strings from query parameters
          delete cleanData[key];
        }
      });
    }

    // For query parameters, if the object is empty after cleanup, skip validation
    if (property === 'query' && (!cleanData || Object.keys(cleanData).length === 0)) {
      // Empty query object - set defaults and continue
      Object.defineProperty(req, 'query', {
        value: {},
        writable: true,
        enumerable: true,
        configurable: true
      });
      return next();
    }

    // For query parameters, allow empty object or objects with only known properties
    const validationOptions: any = {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown properties
      convert: true, // Convert types (e.g., string to number)
    };
    
    // For query params, allow unknown properties to be stripped silently
    if (property === 'query') {
      validationOptions.allowUnknown = true; // Allow unknown query params to be stripped
    } else {
      validationOptions.allowUnknown = false; // Don't allow unknown properties for body/params
    }

    const { error, value } = schema.validate(cleanData, validationOptions);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
      return;
    }

    // Replace request property with validated and sanitized value
    // Note: req.query is read-only, so we need to handle it differently
    if (property === 'query') {
      // For query params, we need to use Object.defineProperty or assign to a new property
      Object.defineProperty(req, 'query', {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      });
    } else {
      req[property] = value;
    }
    next();
  };
};

/**
 * Custom Joi validators for common patterns
 */
export const customValidators = {
  // Validate MongoDB/Prisma ID
  id: () => Joi.number().integer().min(1),

  // Validate email
  email: () => Joi.string().email().lowercase().trim(),

  // Validate phone number (UK format)
  phone: () => Joi.string().pattern(/^(\+44|0)[1-9]\d{9,10}$/),

  // Validate postcode (UK format)
  postcode: () => Joi.string().pattern(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i).uppercase(),

  // Validate price
  price: () => Joi.number().min(0).precision(2),

  // Validate date (future only)
  futureDate: () => Joi.date().greater('now'),

  // Validate time in HH:MM format
  time: () => Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),

  // Validate URL - accepts both absolute URLs and relative paths
  url: () => Joi.string().custom((value, helpers) => {
    // Allow empty strings
    if (!value || value === '') {
      return value;
    }
    // Allow relative URLs (starting with /)
    if (value.startsWith('/')) {
      return value;
    }
    // Allow data URLs
    if (value.startsWith('data:')) {
      return value;
    }
    // Validate absolute URLs (http:// or https://)
    if (value.startsWith('http://') || value.startsWith('https://')) {
      try {
        new URL(value);
        return value;
      } catch {
        return helpers.error('any.invalid');
      }
    }
    // Reject anything else
    return helpers.error('any.invalid');
  }, 'URL validation'),

  // Validate pagination
  pagination: () => Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Validate sort options
  sort: (allowedFields: string[]) => Joi.object({
    sortBy: Joi.string().valid(...allowedFields).default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

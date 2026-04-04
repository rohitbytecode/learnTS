import { ZodSchema, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Validates request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validateRequest =
  (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          message: 'Validation failed',
          errors: formattedErrors,
        });
      }
      return res.status(400).json({ message: 'Validation error' });
    }
  };

/**
 * Formats Zod validation errors for API responses
 * @param error - ZodError instance
 * @returns Formatted error object
 */
export const formatZodError = (error: ZodError) => {
  const formattedErrors = error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return {
    message: 'Validation failed',
    errors: formattedErrors,
  };
};

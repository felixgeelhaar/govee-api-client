import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '../../../src/errors/ValidationError';

describe('ValidationError', () => {
  const TestSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    age: z.number().min(0, 'Age must be non-negative'),
    email: z.string().email('Invalid email format')
  });

  describe('fromZodError', () => {
    it('should create ValidationError from ZodError', () => {
      const invalidData = {
        name: '',
        age: -5,
        email: 'invalid-email'
      };

      const parseResult = TestSchema.safeParse(invalidData);
      expect(parseResult.success).toBe(false);

      if (!parseResult.success) {
        const validationError = ValidationError.fromZodError(parseResult.error, invalidData);
        
        expect(validationError).toBeInstanceOf(ValidationError);
        expect(validationError.message).toContain('API response validation failed');
        expect(validationError.code).toBe('VALIDATION_ERROR');
        expect(validationError.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should include context in error message', () => {
      const invalidData = { name: '', age: -5, email: 'invalid' };
      const parseResult = TestSchema.safeParse(invalidData);

      if (!parseResult.success) {
        const context = 'User registration';
        const validationError = ValidationError.fromZodError(parseResult.error, invalidData, context);
        
        expect(validationError.message).toContain('API response validation failed');
      }
    });
  });

  describe('getValidationDetails', () => {
    it('should return detailed validation errors', () => {
      const invalidData = {
        name: '',
        age: -5,
        email: 'invalid-email'
      };

      const parseResult = TestSchema.safeParse(invalidData);
      if (!parseResult.success) {
        const validationError = ValidationError.fromZodError(parseResult.error, invalidData);
        const details = validationError.getValidationDetails();
        
        expect(details).toHaveLength(3);
        expect(details[0]).toEqual({
          path: 'name',
          message: 'Name is required',
          received: ''
        });
        expect(details[1]).toEqual({
          path: 'age',
          message: 'Age must be non-negative',
          received: -5
        });
        expect(details[2]).toEqual({
          path: 'email',
          message: 'Invalid email format',
          received: 'invalid-email'
        });
      }
    });

    it('should handle nested field paths', () => {
      const NestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1, 'Name is required')
          })
        })
      });

      const invalidData = {
        user: {
          profile: {
            name: ''
          }
        }
      };

      const parseResult = NestedSchema.safeParse(invalidData);
      if (!parseResult.success) {
        const validationError = ValidationError.fromZodError(parseResult.error, invalidData);
        const details = validationError.getValidationDetails();
        
        expect(details[0].path).toBe('user.profile.name');
      }
    });
  });

  describe('getValidationSummary', () => {
    it('should return formatted validation summary', () => {
      const invalidData = {
        name: '',
        age: -5,
        email: 'invalid-email'
      };

      const parseResult = TestSchema.safeParse(invalidData);
      if (!parseResult.success) {
        const validationError = ValidationError.fromZodError(parseResult.error, invalidData);
        const summary = validationError.getValidationSummary();
        
        expect(summary).toContain('name: Name is required');
        expect(summary).toContain('age: Age must be non-negative');
        expect(summary).toContain('email: Invalid email format');
      }
    });

    it('should handle single validation error', () => {
      const invalidData = {
        name: '',
        age: 25,
        email: 'valid@example.com'
      };

      const parseResult = TestSchema.safeParse(invalidData);
      if (!parseResult.success) {
        const validationError = ValidationError.fromZodError(parseResult.error, invalidData);
        const summary = validationError.getValidationSummary();
        
        expect(summary).toContain('name: Name is required');
      }
    });
  });

  describe('toObject', () => {
    it('should return complete error object', () => {
      const invalidData = {
        name: '',
        age: -5,
        email: 'invalid'
      };

      const parseResult = TestSchema.safeParse(invalidData);
      if (!parseResult.success) {
        const validationError = ValidationError.fromZodError(parseResult.error, invalidData);
        const errorObject = validationError.toObject();
        
        expect(errorObject).toHaveProperty('name', 'ValidationError');
        expect(errorObject).toHaveProperty('message');
        expect(errorObject).toHaveProperty('code', 'VALIDATION_ERROR');
        expect(errorObject).toHaveProperty('timestamp');
        expect(errorObject).toHaveProperty('stack');
      }
    });
  });

  describe('constructor', () => {
    it('should create error with custom message', () => {
      const customMessage = 'Custom validation failed';
      const validationError = new ValidationError(customMessage);
      
      expect(validationError.message).toBe(customMessage);
      expect(validationError.code).toBe('VALIDATION_ERROR');
      expect(validationError.timestamp).toBeInstanceOf(Date);
    });

    it('should create error with validation details', () => {
      const zodError = new z.ZodError([]);
      const validationError = new ValidationError('Test error', zodError, {});
      
      expect(validationError.getValidationDetails()).toEqual([]);
    });
  });

  describe('error inheritance', () => {
    it('should be instance of Error', () => {
      const validationError = new ValidationError('Test error');
      expect(validationError).toBeInstanceOf(Error);
    });

    it('should have correct error name', () => {
      const validationError = new ValidationError('Test error');
      expect(validationError.name).toBe('ValidationError');
    });

    it('should preserve stack trace', () => {
      const validationError = new ValidationError('Test error');
      expect(validationError.stack).toBeDefined();
      expect(validationError.stack).toContain('ValidationError');
    });
  });
});
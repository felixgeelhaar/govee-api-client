import { ZodError } from 'zod';
import { GoveeApiClientError } from './GoveeApiClientError';

/**
 * Error thrown when API response validation fails using Zod schemas
 */
export class ValidationError extends GoveeApiClientError {
  readonly code = 'VALIDATION_ERROR';
  public readonly zodError: ZodError;
  public readonly rawData: unknown;

  constructor(message: string, zodError: ZodError, rawData: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.zodError = zodError;
    this.rawData = rawData;
  }

  /**
   * Create a ValidationError from a Zod validation failure
   */
  public static fromZodError(zodError: ZodError, rawData: unknown): ValidationError {
    const errorMessages = zodError.issues.map(issue => {
      const path = issue.path.length > 0 ? ` at path '${issue.path.join('.')}'` : '';
      return `${issue.message}${path}`;
    });

    const message = `API response validation failed: ${errorMessages.join(', ')}`;
    return new ValidationError(message, zodError, rawData);
  }

  /**
   * Get a detailed breakdown of validation errors
   */
  public getValidationDetails(): Array<{ path: string; message: string; received: unknown }> {
    return this.zodError.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      received: issue.path.reduce((obj: any, key) => obj?.[key], this.rawData),
    }));
  }

  /**
   * Get a summary of validation errors for logging
   */
  public getValidationSummary(): string {
    const details = this.getValidationDetails();
    return details
      .map(
        detail => `${detail.path}: ${detail.message} (received: ${JSON.stringify(detail.received)})`
      )
      .join('; ');
  }
}

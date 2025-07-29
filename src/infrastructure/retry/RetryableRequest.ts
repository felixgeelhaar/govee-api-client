import { Logger } from 'pino';
import { GoveeApiClientError, NetworkError } from '../../errors';
import { RetryPolicy } from './RetryPolicy';

/**
 * Represents a request that can be retried
 */
export interface RetryableRequest<T> {
  /** Unique identifier for this request */
  id: string;
  /** Function that executes the actual request */
  execute: () => Promise<T>;
  /** Human-readable description of the request */
  description?: string;
  /** Custom context data for the request */
  context?: Record<string, unknown>;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /** Whether the operation ultimately succeeded */
  success: boolean;
  /** The result if successful */
  data?: T;
  /** The final error if failed */
  error?: GoveeApiClientError;
  /** Number of attempts made */
  totalAttempts: number;
  /** Total time spent including retries */
  totalTimeMs: number;
  /** Details of each retry attempt */
  attempts: RetryAttempt[];
}

/**
 * Details of a single retry attempt
 */
export interface RetryAttempt {
  /** Attempt number (1-based) */
  attemptNumber: number;
  /** Timestamp when attempt started */
  startTime: Date;
  /** Duration of this attempt */
  durationMs: number;
  /** Whether this attempt succeeded */
  success: boolean;
  /** Error encountered (if any) */
  error?: GoveeApiClientError;
  /** Delay before this attempt (0 for first attempt) */
  delayBeforeAttemptMs: number;
}

/**
 * Configuration for retry executor
 */
export interface RetryExecutorConfig {
  /** Retry policy to use */
  retryPolicy: RetryPolicy;
  /** Logger for retry operations */
  logger?: Logger;
  /** Enable detailed request logging */
  enableRequestLogging?: boolean;
  /** Enable performance tracking */
  enablePerformanceTracking?: boolean;
}

/**
 * Enterprise-grade retry executor with comprehensive logging and metrics
 */
export class RetryExecutor {
  private readonly logger?: Logger;
  private readonly enableRequestLogging: boolean;
  private readonly enablePerformanceTracking: boolean;

  constructor(
    private readonly retryPolicy: RetryPolicy,
    config: Omit<RetryExecutorConfig, 'retryPolicy'> = {}
  ) {
    this.logger = config.logger;
    this.enableRequestLogging = config.enableRequestLogging ?? true;
    this.enablePerformanceTracking = config.enablePerformanceTracking ?? true;
  }

  /**
   * Executes a request with retry logic
   */
  async execute<T>(request: RetryableRequest<T>): Promise<T> {
    const result = await this.executeWithResult(request);

    if (result.success) {
      return result.data as T;
    }

    throw result.error || new Error('Request failed without specific error');
  }

  /**
   * Executes a request with detailed retry result information
   */
  async executeWithResult<T>(request: RetryableRequest<T>): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const attempts: RetryAttempt[] = [];
    let attemptNumber = 0;
    let lastError: GoveeApiClientError | undefined;

    this.logRequestStart(request);

    while (true) {
      attemptNumber++;
      const attemptStartTime = new Date();
      const delayMs =
        attemptNumber === 1 ? 0 : this.retryPolicy.calculateDelay(attemptNumber - 1, lastError!);

      // Apply delay before retry attempts
      if (delayMs > 0) {
        this.logger?.debug(
          { requestId: request.id, attemptNumber, delayMs },
          'Waiting before retry attempt'
        );
        await this.sleep(delayMs);
      }

      const attemptResult = await this.executeAttempt(request, attemptNumber);

      attempts.push({
        attemptNumber,
        startTime: attemptStartTime,
        durationMs: attemptResult.durationMs,
        success: attemptResult.success,
        error: attemptResult.error,
        delayBeforeAttemptMs: delayMs,
      });

      if (attemptResult.success) {
        // Success - record and return
        this.retryPolicy.recordSuccess();
        const totalTimeMs = Date.now() - startTime;

        this.logRequestSuccess(request, attemptNumber, totalTimeMs);

        return {
          success: true,
          data: attemptResult.data,
          totalAttempts: attemptNumber,
          totalTimeMs,
          attempts,
        };
      }

      // Failure - record each failed attempt
      lastError = attemptResult.error!;
      this.retryPolicy.recordFailure(lastError);

      const elapsedTimeMs = Date.now() - startTime;

      if (!this.retryPolicy.shouldRetry(lastError, attemptNumber, elapsedTimeMs)) {
        // No more retries - return failure
        const totalTimeMs = Date.now() - startTime;

        this.logRequestFailure(request, attemptNumber, totalTimeMs, lastError);

        return {
          success: false,
          error: lastError,
          totalAttempts: attemptNumber,
          totalTimeMs,
          attempts,
        };
      }

      // Continue retrying
      this.logRetryAttempt(request, attemptNumber, lastError);
    }
  }

  /**
   * Executes a single attempt of the request
   */
  private async executeAttempt<T>(
    request: RetryableRequest<T>,
    attemptNumber: number
  ): Promise<{
    success: boolean;
    data?: T;
    error?: GoveeApiClientError;
    durationMs: number;
  }> {
    const startTime = Date.now();

    try {
      const data = await request.execute();
      const durationMs = Date.now() - startTime;

      this.logAttemptSuccess(request, attemptNumber, durationMs);

      return {
        success: true,
        data,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const goveeError = this.normalizeError(error);

      this.logAttemptFailure(request, attemptNumber, durationMs, goveeError);

      return {
        success: false,
        error: goveeError,
        durationMs,
      };
    }
  }

  /**
   * Normalizes any error to a GoveeApiClientError
   */
  private normalizeError(error: unknown): GoveeApiClientError {
    if (error instanceof GoveeApiClientError) {
      return error;
    }

    if (error instanceof Error) {
      return new NetworkError(`Unexpected error: ${error.message}`, 'unknown', error);
    }

    return new NetworkError('Unknown error occurred', 'unknown');
  }

  /**
   * Utility function for sleeping
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logging methods for different stages of retry execution
   */
  private logRequestStart<T>(request: RetryableRequest<T>): void {
    if (!this.enableRequestLogging || !this.logger) return;

    this.logger.info(
      {
        requestId: request.id,
        description: request.description,
        context: request.context,
      },
      'Starting retryable request'
    );
  }

  private logRequestSuccess<T>(
    request: RetryableRequest<T>,
    totalAttempts: number,
    totalTimeMs: number
  ): void {
    if (!this.enableRequestLogging || !this.logger) return;

    this.logger.info(
      {
        requestId: request.id,
        totalAttempts,
        totalTimeMs,
        retriesNeeded: totalAttempts - 1,
      },
      'Retryable request completed successfully'
    );
  }

  private logRequestFailure<T>(
    request: RetryableRequest<T>,
    totalAttempts: number,
    totalTimeMs: number,
    finalError: GoveeApiClientError
  ): void {
    if (!this.logger) return;

    this.logger.error(
      {
        requestId: request.id,
        totalAttempts,
        totalTimeMs,
        finalError: finalError.toObject(),
      },
      'Retryable request failed after all attempts'
    );
  }

  private logRetryAttempt<T>(
    request: RetryableRequest<T>,
    attemptNumber: number,
    error: GoveeApiClientError
  ): void {
    if (!this.enableRequestLogging || !this.logger) return;

    this.logger.warn(
      {
        requestId: request.id,
        attemptNumber,
        error: error.toObject(),
      },
      'Request attempt failed, will retry'
    );
  }

  private logAttemptSuccess<T>(
    request: RetryableRequest<T>,
    attemptNumber: number,
    durationMs: number
  ): void {
    if (!this.enableRequestLogging || !this.logger) return;

    this.logger.debug(
      {
        requestId: request.id,
        attemptNumber,
        durationMs,
      },
      'Request attempt succeeded'
    );
  }

  private logAttemptFailure<T>(
    request: RetryableRequest<T>,
    attemptNumber: number,
    durationMs: number,
    error: GoveeApiClientError
  ): void {
    if (!this.enableRequestLogging || !this.logger) return;

    this.logger.debug(
      {
        requestId: request.id,
        attemptNumber,
        durationMs,
        error: error.toObject(),
      },
      'Request attempt failed'
    );
  }

  /**
   * Gets current retry policy metrics
   */
  getMetrics() {
    return this.retryPolicy.getMetrics();
  }

  /**
   * Resets retry policy metrics
   */
  resetMetrics(): void {
    this.retryPolicy.reset();
  }
}

/**
 * Factory for creating common retry executors
 */
export class RetryExecutorFactory {
  /**
   * Creates a retry executor optimized for Govee API operations
   */
  static createForGoveeApi(logger?: Logger): RetryExecutor {
    const retryPolicy = RetryPolicy.createGoveeOptimized(logger);
    return new RetryExecutor(retryPolicy, {
      logger,
      enableRequestLogging: true,
      enablePerformanceTracking: true,
    });
  }

  /**
   * Creates a conservative retry executor for production environments
   */
  static createConservative(logger?: Logger): RetryExecutor {
    const retryPolicy = RetryPolicy.createConservative(logger);
    return new RetryExecutor(retryPolicy, {
      logger,
      enableRequestLogging: true,
      enablePerformanceTracking: true,
    });
  }

  /**
   * Creates an aggressive retry executor for development/testing
   */
  static createAggressive(logger?: Logger): RetryExecutor {
    const retryPolicy = RetryPolicy.createAggressive(logger);
    return new RetryExecutor(retryPolicy, {
      logger,
      enableRequestLogging: true,
      enablePerformanceTracking: true,
    });
  }

  /**
   * Creates a custom retry executor with specific policy
   */
  static createCustom(retryPolicy: RetryPolicy, logger?: Logger): RetryExecutor {
    return new RetryExecutor(retryPolicy, {
      logger,
      enableRequestLogging: true,
      enablePerformanceTracking: true,
    });
  }
}

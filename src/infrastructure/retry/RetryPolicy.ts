import { Logger } from 'pino';
import {
  GoveeApiClientError,
  RateLimitError,
  NetworkError,
  GoveeApiError,
  InvalidApiKeyError,
} from '../../errors';

/**
 * Backoff strategy configuration for retry policies
 */
export interface BackoffStrategy {
  /** Type of backoff algorithm */
  type: 'exponential' | 'linear' | 'fixed' | 'custom';
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number;
  /** Multiplier for exponential backoff (default: 2.0) */
  multiplier?: number;
  /** Custom backoff function for 'custom' type */
  customBackoff?: (attempt: number, error: GoveeApiClientError) => number;
}

/**
 * Jitter configuration to prevent thundering herd problems
 */
export interface JitterConfig {
  /** Type of jitter algorithm */
  type: 'none' | 'full' | 'equal' | 'decorrelated';
  /** Jitter factor (0.0 to 1.0) */
  factor?: number;
}

/**
 * Retry condition configuration
 */
export interface RetryCondition {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Maximum total time to spend retrying in milliseconds */
  maxTotalTimeMs: number;
  /** HTTP status codes that should trigger retries */
  retryableStatusCodes: number[];
  /** Error types that should trigger retries */
  retryableErrorTypes: (new (...args: any[]) => GoveeApiClientError)[];
  /** Custom retry decision function */
  shouldRetry?: (error: GoveeApiClientError, attempt: number, elapsed: number) => boolean;
}

/**
 * Circuit breaker configuration for retry policies
 */
export interface CircuitBreakerConfig {
  /** Enable circuit breaker functionality */
  enabled: boolean;
  /** Number of consecutive failures to open circuit */
  failureThreshold: number;
  /** Time to wait before attempting to close circuit (ms) */
  recoveryTimeoutMs: number;
  /** Percentage of requests to allow through when half-open */
  halfOpenSuccessThreshold: number;
}

/**
 * Retry metrics for observability
 */
export interface RetryMetrics {
  /** Total number of retry attempts */
  totalAttempts: number;
  /** Total number of successful retries */
  successfulRetries: number;
  /** Total number of failed retries */
  failedRetries: number;
  /** Total time spent retrying */
  totalRetryTimeMs: number;
  /** Average retry delay */
  averageRetryDelayMs: number;
  /** Circuit breaker state */
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  /** Last error encountered */
  lastError?: GoveeApiClientError;
  /** Timestamp of last retry attempt */
  lastRetryTimestamp?: Date;
}

/**
 * Complete retry policy configuration
 */
export interface RetryPolicyConfig {
  /** Backoff strategy configuration */
  backoff: BackoffStrategy;
  /** Jitter configuration */
  jitter: JitterConfig;
  /** Retry condition configuration */
  condition: RetryCondition;
  /** Circuit breaker configuration */
  circuitBreaker?: CircuitBreakerConfig;
  /** Logger instance for retry operations */
  logger?: Logger;
  /** Enable detailed metrics collection */
  enableMetrics?: boolean;
}

/**
 * Circuit breaker state management
 */
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private config: CircuitBreakerConfig,
    private logger?: Logger
  ) {}

  canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case 'closed':
        return true;
      case 'open':
        if (now - this.lastFailureTime >= this.config.recoveryTimeoutMs) {
          this.logger?.info('Circuit breaker transitioning to half-open state');
          this.state = 'half-open';
          this.successCount = 0;
          return true;
        }
        return false;
      case 'half-open':
        return true;
      default:
        return false;
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenSuccessThreshold) {
        this.logger?.info('Circuit breaker transitioning to closed state');
        this.state = 'closed';
      }
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'closed' && this.failureCount >= this.config.failureThreshold) {
      this.logger?.warn('Circuit breaker transitioning to open state');
      this.state = 'open';
    } else if (this.state === 'half-open') {
      this.logger?.warn('Circuit breaker returning to open state');
      this.state = 'open';
      this.successCount = 0;
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.successCount = 0;
    this.logger?.info('Circuit breaker reset to closed state');
  }
}

/**
 * Enterprise-grade retry policy with exponential backoff, jitter, and circuit breaker
 */
export class RetryPolicy {
  private readonly circuitBreaker?: CircuitBreaker;
  private readonly metrics: RetryMetrics;
  private readonly logger?: Logger;

  constructor(private readonly config: RetryPolicyConfig) {
    this.logger = config.logger;
    this.validateConfig();

    if (config.circuitBreaker?.enabled) {
      this.circuitBreaker = new CircuitBreaker(config.circuitBreaker, this.logger);
    }

    this.metrics = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      totalRetryTimeMs: 0,
      averageRetryDelayMs: 0,
      circuitBreakerState: this.circuitBreaker?.getState() || 'closed',
    };
  }

  private validateConfig(): void {
    const { backoff, condition, jitter } = this.config;

    if (backoff.initialDelayMs <= 0 || backoff.maxDelayMs <= 0) {
      throw new Error('Retry delays must be positive');
    }

    if (backoff.initialDelayMs > backoff.maxDelayMs) {
      throw new Error('Initial delay cannot exceed maximum delay');
    }

    if (condition.maxAttempts <= 0 || condition.maxTotalTimeMs <= 0) {
      throw new Error('Retry limits must be positive');
    }

    if (jitter.factor !== undefined && (jitter.factor < 0 || jitter.factor > 1)) {
      throw new Error('Jitter factor must be between 0 and 1');
    }

    if (backoff.type === 'exponential' && (backoff.multiplier || 2) <= 1) {
      throw new Error('Exponential backoff multiplier must be greater than 1');
    }
  }

  /**
   * Determines if an error should trigger a retry attempt
   */
  shouldRetry(error: GoveeApiClientError, attempt: number, elapsedTimeMs: number): boolean {
    const { condition } = this.config;

    // Check circuit breaker
    if (this.circuitBreaker && !this.circuitBreaker.canExecute()) {
      this.logger?.debug('Retry blocked by circuit breaker');
      return false;
    }

    // Check attempt limit
    if (attempt >= condition.maxAttempts) {
      this.logger?.debug(`Maximum attempts reached: ${attempt}/${condition.maxAttempts}`);
      return false;
    }

    // Check time limit
    if (elapsedTimeMs >= condition.maxTotalTimeMs) {
      this.logger?.debug(
        `Maximum retry time exceeded: ${elapsedTimeMs}ms/${condition.maxTotalTimeMs}ms`
      );
      return false;
    }

    // Custom retry decision
    if (condition.shouldRetry) {
      return condition.shouldRetry(error, attempt, elapsedTimeMs);
    }

    // Check if error type is retryable
    const isRetryableType = condition.retryableErrorTypes.some(
      ErrorType => error instanceof ErrorType
    );
    if (!isRetryableType) {
      this.logger?.debug(`Error type not retryable: ${error.constructor.name}`);
      return false;
    }

    // Specific retry logic based on error type
    if (error instanceof RateLimitError) {
      return error.canRetry();
    }

    if (error instanceof NetworkError) {
      return error.isRetryable();
    }

    if (error instanceof GoveeApiError) {
      // Retry on server errors (5xx) and some client errors
      const retryableStatusCodes = [
        408,
        429,
        500,
        502,
        503,
        504,
        ...condition.retryableStatusCodes,
      ];
      return retryableStatusCodes.includes(error.statusCode);
    }

    if (error instanceof InvalidApiKeyError) {
      // Never retry authentication errors
      return false;
    }

    return false;
  }

  /**
   * Calculates the delay before the next retry attempt
   */
  calculateDelay(attempt: number, error: GoveeApiClientError): number {
    const { backoff, jitter } = this.config;

    // Handle rate limit errors with specific retry-after values
    if (error instanceof RateLimitError && error.canRetry()) {
      const rateLimitDelay = error.getRetryAfterMs();
      return this.applyJitter(rateLimitDelay, attempt);
    }

    let baseDelay: number;

    switch (backoff.type) {
      case 'fixed':
        baseDelay = backoff.initialDelayMs;
        break;
      case 'linear':
        baseDelay = backoff.initialDelayMs * attempt;
        break;
      case 'exponential':
        const multiplier = backoff.multiplier || 2;
        baseDelay = backoff.initialDelayMs * Math.pow(multiplier, attempt - 1);
        break;
      case 'custom':
        if (!backoff.customBackoff) {
          throw new Error('Custom backoff function not provided');
        }
        baseDelay = backoff.customBackoff(attempt, error);
        break;
      default:
        throw new Error(`Unknown backoff type: ${backoff.type}`);
    }

    // Ensure delay doesn't exceed maximum
    baseDelay = Math.min(baseDelay, backoff.maxDelayMs);

    return this.applyJitter(baseDelay, attempt);
  }

  /**
   * Applies jitter to prevent thundering herd problems
   */
  private applyJitter(baseDelay: number, attempt: number): number {
    const { jitter } = this.config;
    const factor = jitter.factor || 0.1;

    switch (jitter.type) {
      case 'none':
        return baseDelay;
      case 'full':
        // Random value between 0 and baseDelay
        return Math.random() * baseDelay;
      case 'equal':
        // baseDelay/2 + random(0, baseDelay/2)
        return baseDelay / 2 + Math.random() * (baseDelay / 2);
      case 'decorrelated':
        // More sophisticated jitter that considers previous delays
        const minDelay = this.config.backoff.initialDelayMs;
        const maxJitter = baseDelay * factor;
        return Math.min(
          this.config.backoff.maxDelayMs,
          Math.random() * (baseDelay * 3 - minDelay) + minDelay
        );
      default:
        throw new Error(`Unknown jitter type: ${jitter.type}`);
    }
  }

  /**
   * Records a successful operation
   */
  recordSuccess(): void {
    this.circuitBreaker?.recordSuccess();
    this.updateMetrics(true);
  }

  /**
   * Records a failed operation
   */
  recordFailure(error: GoveeApiClientError): void {
    this.circuitBreaker?.recordFailure();
    this.updateMetrics(false, error);
  }

  /**
   * Updates retry metrics
   */
  private updateMetrics(success: boolean, error?: GoveeApiClientError): void {
    if (!this.config.enableMetrics) return;

    this.metrics.totalAttempts++;
    this.metrics.circuitBreakerState = this.circuitBreaker?.getState() || 'closed';
    this.metrics.lastRetryTimestamp = new Date();

    if (success) {
      this.metrics.successfulRetries++;
    } else {
      this.metrics.failedRetries++;
      this.metrics.lastError = error;
    }

    // Update average delay (simplified calculation)
    if (this.metrics.totalAttempts > 1) {
      this.metrics.averageRetryDelayMs =
        this.metrics.totalRetryTimeMs / (this.metrics.totalAttempts - 1);
    }
  }

  /**
   * Gets current retry metrics
   */
  getMetrics(): Readonly<RetryMetrics> {
    return { ...this.metrics };
  }

  /**
   * Resets retry metrics and circuit breaker
   */
  reset(): void {
    this.circuitBreaker?.reset();
    Object.assign(this.metrics, {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      totalRetryTimeMs: 0,
      averageRetryDelayMs: 0,
      circuitBreakerState: this.circuitBreaker?.getState() || 'closed',
      lastError: undefined,
      lastRetryTimestamp: undefined,
    });
    this.logger?.info('Retry policy metrics and circuit breaker reset');
  }

  /**
   * Creates a default retry policy optimized for Govee API
   */
  static createGoveeOptimized(logger?: Logger): RetryPolicy {
    return new RetryPolicy({
      backoff: {
        type: 'exponential',
        initialDelayMs: 1000, // Start with 1 second
        maxDelayMs: 30000, // Cap at 30 seconds
        multiplier: 2.0,
      },
      jitter: {
        type: 'equal',
        factor: 0.1,
      },
      condition: {
        maxAttempts: 3,
        maxTotalTimeMs: 60000, // 1 minute total
        retryableStatusCodes: [408, 502, 503, 504],
        retryableErrorTypes: [RateLimitError, NetworkError, GoveeApiError],
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        recoveryTimeoutMs: 30000,
        halfOpenSuccessThreshold: 2,
      },
      logger,
      enableMetrics: true,
    });
  }

  /**
   * Creates a conservative retry policy for production environments
   */
  static createConservative(logger?: Logger): RetryPolicy {
    return new RetryPolicy({
      backoff: {
        type: 'exponential',
        initialDelayMs: 2000,
        maxDelayMs: 60000,
        multiplier: 1.5,
      },
      jitter: {
        type: 'decorrelated',
        factor: 0.2,
      },
      condition: {
        maxAttempts: 2,
        maxTotalTimeMs: 120000,
        retryableStatusCodes: [429, 502, 503, 504],
        retryableErrorTypes: [RateLimitError, NetworkError],
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        recoveryTimeoutMs: 60000,
        halfOpenSuccessThreshold: 3,
      },
      logger,
      enableMetrics: true,
    });
  }

  /**
   * Creates an aggressive retry policy for development/testing
   */
  static createAggressive(logger?: Logger): RetryPolicy {
    return new RetryPolicy({
      backoff: {
        type: 'exponential',
        initialDelayMs: 500,
        maxDelayMs: 15000,
        multiplier: 2.5,
      },
      jitter: {
        type: 'full',
        factor: 0.3,
      },
      condition: {
        maxAttempts: 5,
        maxTotalTimeMs: 45000,
        retryableStatusCodes: [400, 408, 429, 500, 502, 503, 504],
        retryableErrorTypes: [RateLimitError, NetworkError, GoveeApiError],
      },
      circuitBreaker: {
        enabled: false,
        failureThreshold: 10,
        recoveryTimeoutMs: 15000,
        halfOpenSuccessThreshold: 1,
      },
      logger,
      enableMetrics: true,
    });
  }
}

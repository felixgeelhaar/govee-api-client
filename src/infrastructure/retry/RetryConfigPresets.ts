import { Logger } from 'pino';
import {
  RetryPolicyConfig,
  BackoffStrategy,
  JitterConfig,
  RetryCondition,
  CircuitBreakerConfig,
} from './RetryPolicy';
import { RateLimitError, NetworkError, GoveeApiError } from '../../errors';

/**
 * Environment-specific retry configuration presets
 */
export class RetryConfigPresets {
  /**
   * Development environment configuration - aggressive retries for testing
   */
  static development(logger?: Logger): RetryPolicyConfig {
    return {
      backoff: {
        type: 'exponential',
        initialDelayMs: 100, // Start very fast
        maxDelayMs: 5000, // Cap at 5 seconds
        multiplier: 1.5, // Gentle exponential growth
      },
      jitter: {
        type: 'equal',
        factor: 0.2,
      },
      condition: {
        maxAttempts: 5, // More attempts for testing
        maxTotalTimeMs: 15000, // 15 seconds total
        retryableStatusCodes: [400, 408, 429, 500, 502, 503, 504],
        retryableErrorTypes: [RateLimitError, NetworkError, GoveeApiError],
      },
      circuitBreaker: {
        enabled: false, // Disabled for development
        failureThreshold: 10,
        recoveryTimeoutMs: 5000,
        halfOpenSuccessThreshold: 1,
      },
      logger,
      enableMetrics: true,
    };
  }

  /**
   * Testing environment configuration - predictable behavior
   */
  static testing(logger?: Logger): RetryPolicyConfig {
    return {
      backoff: {
        type: 'fixed',
        initialDelayMs: 100, // Fixed delay for predictable tests
        maxDelayMs: 100,
      },
      jitter: {
        type: 'none', // No jitter for predictable timing
      },
      condition: {
        maxAttempts: 3,
        maxTotalTimeMs: 1000, // Quick for tests
        retryableStatusCodes: [429, 502, 503, 504],
        retryableErrorTypes: [RateLimitError, NetworkError, GoveeApiError],
      },
      circuitBreaker: {
        enabled: false, // Disabled for testing
        failureThreshold: 5,
        recoveryTimeoutMs: 1000,
        halfOpenSuccessThreshold: 1,
      },
      logger,
      enableMetrics: false, // Disabled for cleaner test output
    };
  }

  /**
   * Production environment configuration - conservative and reliable
   */
  static production(logger?: Logger): RetryPolicyConfig {
    return {
      backoff: {
        type: 'exponential',
        initialDelayMs: 2000, // Start with 2 seconds
        maxDelayMs: 60000, // Cap at 1 minute
        multiplier: 2.0, // Standard exponential backoff
      },
      jitter: {
        type: 'decorrelated', // Sophisticated jitter
        factor: 0.1,
      },
      condition: {
        maxAttempts: 3, // Conservative retry count
        maxTotalTimeMs: 180000, // 3 minutes total
        retryableStatusCodes: [429, 502, 503, 504], // Only server errors
        retryableErrorTypes: [RateLimitError, NetworkError, GoveeApiError],
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        recoveryTimeoutMs: 60000, // 1 minute recovery
        halfOpenSuccessThreshold: 3,
      },
      logger,
      enableMetrics: true,
    };
  }

  /**
   * High-frequency operations configuration - optimized for frequent API calls
   */
  static highFrequency(logger?: Logger): RetryPolicyConfig {
    return {
      backoff: {
        type: 'linear',
        initialDelayMs: 500,
        maxDelayMs: 5000,
      },
      jitter: {
        type: 'full',
        factor: 0.5, // High jitter to spread load
      },
      condition: {
        maxAttempts: 2, // Quick failure for high frequency
        maxTotalTimeMs: 10000, // 10 seconds max
        retryableStatusCodes: [429, 503, 504],
        retryableErrorTypes: [RateLimitError, NetworkError],
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3, // Quick circuit opening
        recoveryTimeoutMs: 15000,
        halfOpenSuccessThreshold: 2,
      },
      logger,
      enableMetrics: true,
    };
  }

  /**
   * Rate-limit aware configuration - optimized for APIs with strict rate limits
   */
  static rateLimitAware(logger?: Logger): RetryPolicyConfig {
    return {
      backoff: {
        type: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 300000, // 5 minutes for severe rate limiting
        multiplier: 1.5,
      },
      jitter: {
        type: 'equal',
        factor: 0.05, // Low jitter to respect rate limits
      },
      condition: {
        maxAttempts: 3,
        maxTotalTimeMs: 600000, // 10 minutes total
        retryableStatusCodes: [429],
        retryableErrorTypes: [RateLimitError],
        shouldRetry: (error, attempt, elapsed) => {
          // Custom logic for rate limit errors
          if (error instanceof RateLimitError) {
            return error.canRetry() && attempt < 3;
          }
          return false;
        },
      },
      circuitBreaker: {
        enabled: false, // Don't use circuit breaker with rate limits
        failureThreshold: 1,
        recoveryTimeoutMs: 60000,
        halfOpenSuccessThreshold: 1,
      },
      logger,
      enableMetrics: true,
    };
  }

  /**
   * Network-resilient configuration - optimized for unreliable networks
   */
  static networkResilient(logger?: Logger): RetryPolicyConfig {
    return {
      backoff: {
        type: 'exponential',
        initialDelayMs: 2000,
        maxDelayMs: 30000,
        multiplier: 2.0,
      },
      jitter: {
        type: 'decorrelated',
        factor: 0.3, // High jitter for network issues
      },
      condition: {
        maxAttempts: 5, // More attempts for network issues
        maxTotalTimeMs: 120000, // 2 minutes
        retryableStatusCodes: [408, 502, 503, 504],
        retryableErrorTypes: [NetworkError],
        shouldRetry: (error, attempt, elapsed) => {
          // Only retry network errors that are explicitly retryable
          if (error instanceof NetworkError) {
            return error.isRetryable() && attempt < 5;
          }
          return false;
        },
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 7, // Higher threshold for network issues
        recoveryTimeoutMs: 30000,
        halfOpenSuccessThreshold: 2,
      },
      logger,
      enableMetrics: true,
    };
  }

  /**
   * Custom configuration builder for specific use cases
   */
  static custom(): RetryConfigBuilder {
    return new RetryConfigBuilder();
  }
}

/**
 * Fluent builder for creating custom retry configurations
 */
export class RetryConfigBuilder {
  private config: Partial<RetryPolicyConfig> = {};

  /**
   * Set backoff strategy
   */
  withBackoff(strategy: BackoffStrategy): this {
    this.config.backoff = strategy;
    return this;
  }

  /**
   * Set exponential backoff with defaults
   */
  withExponentialBackoff(
    initialDelayMs: number = 1000,
    maxDelayMs: number = 30000,
    multiplier: number = 2.0
  ): this {
    this.config.backoff = {
      type: 'exponential',
      initialDelayMs,
      maxDelayMs,
      multiplier,
    };
    return this;
  }

  /**
   * Set linear backoff
   */
  withLinearBackoff(initialDelayMs: number = 1000, maxDelayMs: number = 10000): this {
    this.config.backoff = {
      type: 'linear',
      initialDelayMs,
      maxDelayMs,
    };
    return this;
  }

  /**
   * Set fixed backoff
   */
  withFixedBackoff(delayMs: number = 1000): this {
    this.config.backoff = {
      type: 'fixed',
      initialDelayMs: delayMs,
      maxDelayMs: delayMs,
    };
    return this;
  }

  /**
   * Set custom backoff function
   */
  withCustomBackoff(
    initialDelayMs: number,
    maxDelayMs: number,
    customBackoff: (attempt: number, error: any) => number
  ): this {
    this.config.backoff = {
      type: 'custom',
      initialDelayMs,
      maxDelayMs,
      customBackoff,
    };
    return this;
  }

  /**
   * Set jitter configuration
   */
  withJitter(jitter: JitterConfig): this {
    this.config.jitter = jitter;
    return this;
  }

  /**
   * Set no jitter
   */
  withoutJitter(): this {
    this.config.jitter = { type: 'none' };
    return this;
  }

  /**
   * Set equal jitter
   */
  withEqualJitter(factor: number = 0.1): this {
    this.config.jitter = { type: 'equal', factor };
    return this;
  }

  /**
   * Set full jitter
   */
  withFullJitter(factor: number = 0.1): this {
    this.config.jitter = { type: 'full', factor };
    return this;
  }

  /**
   * Set decorrelated jitter
   */
  withDecorrelatedJitter(factor: number = 0.1): this {
    this.config.jitter = { type: 'decorrelated', factor };
    return this;
  }

  /**
   * Set retry conditions
   */
  withConditions(conditions: RetryCondition): this {
    this.config.condition = conditions;
    return this;
  }

  /**
   * Set basic retry conditions
   */
  withBasicConditions(
    maxAttempts: number = 3,
    maxTotalTimeMs: number = 60000,
    retryableStatusCodes: number[] = [429, 502, 503, 504]
  ): this {
    this.config.condition = {
      maxAttempts,
      maxTotalTimeMs,
      retryableStatusCodes,
      retryableErrorTypes: [RateLimitError, NetworkError, GoveeApiError],
    };
    return this;
  }

  /**
   * Set circuit breaker configuration
   */
  withCircuitBreaker(circuitBreaker: CircuitBreakerConfig): this {
    this.config.circuitBreaker = circuitBreaker;
    return this;
  }

  /**
   * Enable circuit breaker with defaults
   */
  withBasicCircuitBreaker(
    failureThreshold: number = 5,
    recoveryTimeoutMs: number = 30000,
    halfOpenSuccessThreshold: number = 2
  ): this {
    this.config.circuitBreaker = {
      enabled: true,
      failureThreshold,
      recoveryTimeoutMs,
      halfOpenSuccessThreshold,
    };
    return this;
  }

  /**
   * Disable circuit breaker
   */
  withoutCircuitBreaker(): this {
    this.config.circuitBreaker = {
      enabled: false,
      failureThreshold: 1,
      recoveryTimeoutMs: 1000,
      halfOpenSuccessThreshold: 1,
    };
    return this;
  }

  /**
   * Set logger
   */
  withLogger(logger: Logger): this {
    this.config.logger = logger;
    return this;
  }

  /**
   * Enable or disable metrics
   */
  withMetrics(enabled: boolean = true): this {
    this.config.enableMetrics = enabled;
    return this;
  }

  /**
   * Build the final configuration
   */
  build(): RetryPolicyConfig {
    // Ensure required fields have defaults
    const backoff = this.config.backoff || {
      type: 'exponential' as const,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      multiplier: 2.0,
    };

    const jitter = this.config.jitter || {
      type: 'equal' as const,
      factor: 0.1,
    };

    const condition = this.config.condition || {
      maxAttempts: 3,
      maxTotalTimeMs: 60000,
      retryableStatusCodes: [429, 502, 503, 504],
      retryableErrorTypes: [RateLimitError, NetworkError, GoveeApiError],
    };

    const circuitBreaker = this.config.circuitBreaker || {
      enabled: true,
      failureThreshold: 5,
      recoveryTimeoutMs: 30000,
      halfOpenSuccessThreshold: 2,
    };

    return {
      backoff,
      jitter,
      condition,
      circuitBreaker,
      logger: this.config.logger,
      enableMetrics: this.config.enableMetrics ?? true,
    };
  }
}

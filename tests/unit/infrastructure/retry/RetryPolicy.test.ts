import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryPolicy, BackoffStrategy, JitterConfig, RetryCondition } from '../../../../src/infrastructure/retry/RetryPolicy';
import { RateLimitError, NetworkError, GoveeApiError, InvalidApiKeyError } from '../../../../src/errors';

describe('RetryPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and validation', () => {
    it('should create a valid retry policy with minimum configuration', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'exponential',
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          multiplier: 2,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429, 502, 503, 504],
          retryableErrorTypes: [RateLimitError, NetworkError],
        },
      });

      expect(policy).toBeDefined();
      expect(policy.getMetrics().totalAttempts).toBe(0);
    });

    it('should throw error for invalid backoff delays', () => {
      expect(() => new RetryPolicy({
        backoff: {
          type: 'exponential',
          initialDelayMs: 0, // Invalid: must be positive
          maxDelayMs: 10000,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      })).toThrow('Retry delays must be positive');
    });

    it('should throw error when initial delay exceeds max delay', () => {
      expect(() => new RetryPolicy({
        backoff: {
          type: 'exponential',
          initialDelayMs: 20000,
          maxDelayMs: 10000, // Invalid: less than initial
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      })).toThrow('Initial delay cannot exceed maximum delay');
    });

    it('should throw error for invalid retry limits', () => {
      expect(() => new RetryPolicy({
        backoff: {
          type: 'exponential',
          initialDelayMs: 1000,
          maxDelayMs: 10000,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 0, // Invalid: must be positive
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      })).toThrow('Retry limits must be positive');
    });

    it('should throw error for invalid jitter factor', () => {
      expect(() => new RetryPolicy({
        backoff: {
          type: 'exponential',
          initialDelayMs: 1000,
          maxDelayMs: 10000,
        },
        jitter: { type: 'equal', factor: 1.5 }, // Invalid: must be 0-1
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      })).toThrow('Jitter factor must be between 0 and 1');
    });

    it('should throw error for invalid exponential multiplier', () => {
      expect(() => new RetryPolicy({
        backoff: {
          type: 'exponential',
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          multiplier: 1.0, // Invalid: must be > 1
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      })).toThrow('Exponential backoff multiplier must be greater than 1');
    });
  });

  describe('shouldRetry', () => {
    let policy: RetryPolicy;

    beforeEach(() => {
      policy = new RetryPolicy({
        backoff: {
          type: 'exponential',
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          multiplier: 2,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429, 502, 503, 504],
          retryableErrorTypes: [RateLimitError, NetworkError, GoveeApiError],
        },
      });
    });

    it('should retry on retryable errors within limits', () => {
      const rateLimitError = new RateLimitError('Rate limited', 60);
      expect(policy.shouldRetry(rateLimitError, 1, 5000)).toBe(true);
    });

    it('should not retry beyond max attempts', () => {
      const rateLimitError = new RateLimitError('Rate limited', 60);
      expect(policy.shouldRetry(rateLimitError, 3, 5000)).toBe(false);
    });

    it('should not retry beyond max total time', () => {
      const rateLimitError = new RateLimitError('Rate limited', 60);
      expect(policy.shouldRetry(rateLimitError, 1, 35000)).toBe(false);
    });

    it('should not retry non-retryable errors', () => {
      const invalidApiKeyError = new InvalidApiKeyError('Invalid API key');
      expect(policy.shouldRetry(invalidApiKeyError, 1, 5000)).toBe(false);
    });

    it('should retry rate limit errors that can retry', () => {
      const rateLimitError = new RateLimitError('Rate limited', 60);
      expect(policy.shouldRetry(rateLimitError, 1, 5000)).toBe(true);
    });

    it('should not retry rate limit errors that cannot retry', () => {
      const rateLimitError = new RateLimitError('Rate limited'); // No retry-after
      vi.spyOn(rateLimitError, 'canRetry').mockReturnValue(false);
      expect(policy.shouldRetry(rateLimitError, 1, 5000)).toBe(false);
    });

    it('should retry retryable network errors', () => {
      const networkError = new NetworkError('Connection failed', 'connection');
      expect(policy.shouldRetry(networkError, 1, 5000)).toBe(true);
    });

    it('should not retry non-retryable network errors', () => {
      const networkError = new NetworkError('DNS failed', 'dns');
      expect(policy.shouldRetry(networkError, 1, 5000)).toBe(false);
    });

    it('should retry server errors (5xx)', () => {
      const serverError = new GoveeApiError('Internal server error', 500, 500, 'Server error');
      expect(policy.shouldRetry(serverError, 1, 5000)).toBe(true);
    });

    it('should not retry client errors (4xx) except configured ones', () => {
      const clientError = new GoveeApiError('Bad request', 400, 400, 'Bad request');
      expect(policy.shouldRetry(clientError, 1, 5000)).toBe(false);
    });

    it('should use custom retry decision when provided', () => {
      const customPolicy = new RetryPolicy({
        backoff: {
          type: 'exponential',
          initialDelayMs: 1000,
          maxDelayMs: 10000,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [],
          retryableErrorTypes: [],
          shouldRetry: (error, attempt, elapsed) => {
            return error.message.includes('custom') && attempt < 2;
          },
        },
      });

      const customError = new NetworkError('custom error', 'unknown');
      const normalError = new NetworkError('normal error', 'unknown');

      expect(customPolicy.shouldRetry(customError, 1, 5000)).toBe(true);
      expect(customPolicy.shouldRetry(normalError, 1, 5000)).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'exponential',
          initialDelayMs: 1000,
          maxDelayMs: 16000,
          multiplier: 2,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 5,
          maxTotalTimeMs: 60000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      
      expect(policy.calculateDelay(1, error)).toBe(1000);  // 1000 * 2^0
      expect(policy.calculateDelay(2, error)).toBe(2000);  // 1000 * 2^1
      expect(policy.calculateDelay(3, error)).toBe(4000);  // 1000 * 2^2
      expect(policy.calculateDelay(4, error)).toBe(8000);  // 1000 * 2^3
      expect(policy.calculateDelay(5, error)).toBe(16000); // 1000 * 2^4, capped at max
    });

    it('should calculate linear backoff correctly', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'linear',
          initialDelayMs: 1000,
          maxDelayMs: 5000,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 5,
          maxTotalTimeMs: 60000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      
      expect(policy.calculateDelay(1, error)).toBe(1000);  // 1000 * 1
      expect(policy.calculateDelay(2, error)).toBe(2000);  // 1000 * 2
      expect(policy.calculateDelay(3, error)).toBe(3000);  // 1000 * 3
      expect(policy.calculateDelay(4, error)).toBe(4000);  // 1000 * 4
      expect(policy.calculateDelay(5, error)).toBe(5000);  // 1000 * 5, capped at max
    });

    it('should calculate fixed backoff correctly', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'fixed',
          initialDelayMs: 2000,
          maxDelayMs: 2000,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 5,
          maxTotalTimeMs: 60000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      
      expect(policy.calculateDelay(1, error)).toBe(2000);
      expect(policy.calculateDelay(2, error)).toBe(2000);
      expect(policy.calculateDelay(3, error)).toBe(2000);
    });

    it('should use custom backoff function', () => {
      const customBackoff = vi.fn()
        .mockReturnValueOnce(500)
        .mockReturnValueOnce(1500)
        .mockReturnValueOnce(3000);

      const policy = new RetryPolicy({
        backoff: {
          type: 'custom',
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          customBackoff,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 5,
          maxTotalTimeMs: 60000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      
      expect(policy.calculateDelay(1, error)).toBe(500);
      expect(policy.calculateDelay(2, error)).toBe(1500);
      expect(policy.calculateDelay(3, error)).toBe(3000);
      
      expect(customBackoff).toHaveBeenCalledWith(1, error);
      expect(customBackoff).toHaveBeenCalledWith(2, error);
      expect(customBackoff).toHaveBeenCalledWith(3, error);
    });

    it('should respect rate limit retry-after values', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'exponential',
          initialDelayMs: 1000,
          maxDelayMs: 10000,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 5,
          maxTotalTimeMs: 60000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const rateLimitError = new RateLimitError('Rate limited', 30); // 30 seconds
      vi.spyOn(rateLimitError, 'canRetry').mockReturnValue(true);
      
      expect(policy.calculateDelay(1, rateLimitError)).toBe(30000); // 30 seconds in ms
    });

    it('should cap delays at maximum', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'exponential',
          initialDelayMs: 1000,
          maxDelayMs: 5000, // Low max for testing
          multiplier: 10, // High multiplier to exceed max quickly
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 5,
          maxTotalTimeMs: 60000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      
      expect(policy.calculateDelay(3, error)).toBe(5000); // Should be capped at maxDelayMs
    });

    it('should throw error for custom backoff without function', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'custom',
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          // customBackoff not provided
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 5,
          maxTotalTimeMs: 60000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      
      expect(() => policy.calculateDelay(1, error)).toThrow('Custom backoff function not provided');
    });
  });

  describe('jitter application', () => {
    it('should apply no jitter', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'fixed',
          initialDelayMs: 1000,
          maxDelayMs: 1000,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      
      // Multiple calls should return the same value with no jitter
      expect(policy.calculateDelay(1, error)).toBe(1000);
      expect(policy.calculateDelay(1, error)).toBe(1000);
      expect(policy.calculateDelay(1, error)).toBe(1000);
    });

    it('should apply full jitter (results should vary)', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'fixed',
          initialDelayMs: 1000,
          maxDelayMs: 1000,
        },
        jitter: { type: 'full' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      
      // With full jitter, results should be between 0 and base delay
      const delays = Array.from({ length: 10 }, () => policy.calculateDelay(1, error));
      const allSame = delays.every(delay => delay === delays[0]);
      const inRange = delays.every(delay => delay >= 0 && delay <= 1000);
      
      expect(allSame).toBe(false); // Should have variation
      expect(inRange).toBe(true);  // Should be in expected range
    });

    it('should apply equal jitter (results should vary around base/2)', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'fixed',
          initialDelayMs: 1000,
          maxDelayMs: 1000,
        },
        jitter: { type: 'equal' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      
      // With equal jitter, results should be between base/2 and base
      const delays = Array.from({ length: 10 }, () => policy.calculateDelay(1, error));
      const allSame = delays.every(delay => delay === delays[0]);
      const inRange = delays.every(delay => delay >= 500 && delay <= 1000);
      
      expect(allSame).toBe(false); // Should have variation
      expect(inRange).toBe(true);  // Should be in expected range
    });
  });

  describe('circuit breaker integration', () => {
    it('should allow execution when circuit is closed', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'fixed',
          initialDelayMs: 1000,
          maxDelayMs: 1000,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
        circuitBreaker: {
          enabled: true,
          failureThreshold: 3, // Higher threshold to prevent immediate opening
          recoveryTimeoutMs: 5000,
          halfOpenSuccessThreshold: 1,
        },
      });

      const error = new RateLimitError('Rate limited', 60); // Add retryAfter so canRetry() returns true
      
      // Circuit should be closed initially, allowing retries
      expect(policy.shouldRetry(error, 1, 1000)).toBe(true);
    });

    it('should block execution when circuit is open', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'fixed',
          initialDelayMs: 1000,
          maxDelayMs: 1000,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 5,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
        circuitBreaker: {
          enabled: true,
          failureThreshold: 2,
          recoveryTimeoutMs: 5000,
          halfOpenSuccessThreshold: 1,
        },
      });

      const error = new RateLimitError('Rate limited');
      
      // Cause failures to open circuit
      policy.recordFailure(error);
      policy.recordFailure(error);
      
      // Circuit should now be open
      expect(policy.shouldRetry(error, 1, 1000)).toBe(false);
    });
  });

  describe('metrics tracking', () => {
    it('should track metrics when enabled', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'fixed',
          initialDelayMs: 1000,
          maxDelayMs: 1000,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
        enableMetrics: true,
      });

      const error = new RateLimitError('Rate limited');
      
      // Initial state
      let metrics = policy.getMetrics();
      expect(metrics.totalAttempts).toBe(0);
      expect(metrics.successfulRetries).toBe(0);
      expect(metrics.failedRetries).toBe(0);
      
      // Record some activity
      policy.recordSuccess();
      policy.recordFailure(error);
      
      metrics = policy.getMetrics();
      expect(metrics.totalAttempts).toBe(2);
      expect(metrics.successfulRetries).toBe(1);
      expect(metrics.failedRetries).toBe(1);
      expect(metrics.lastError).toBe(error);
    });

    it('should not track metrics when disabled', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'fixed',
          initialDelayMs: 1000,
          maxDelayMs: 1000,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
        enableMetrics: false,
      });

      const error = new RateLimitError('Rate limited');
      
      // Record some activity
      policy.recordSuccess();
      policy.recordFailure(error);
      
      // Metrics should remain at initial state
      const metrics = policy.getMetrics();
      expect(metrics.totalAttempts).toBe(0);
    });

    it('should reset metrics correctly', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'fixed',
          initialDelayMs: 1000,
          maxDelayMs: 1000,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
        enableMetrics: true,
      });

      const error = new RateLimitError('Rate limited');
      
      // Record activity
      policy.recordSuccess();
      policy.recordFailure(error);
      
      // Reset
      policy.reset();
      
      // Metrics should be reset
      const metrics = policy.getMetrics();
      expect(metrics.totalAttempts).toBe(0);
      expect(metrics.successfulRetries).toBe(0);
      expect(metrics.failedRetries).toBe(0);
      expect(metrics.lastError).toBeUndefined();
    });
  });

  describe('factory methods', () => {
    it('should create Govee-optimized policy', () => {
      const policy = RetryPolicy.createGoveeOptimized();
      
      expect(policy).toBeDefined();
      expect(policy.getMetrics()).toBeDefined();
      
      // Test that it handles typical Govee API errors
      const rateLimitError = new RateLimitError('Rate limited', 60);
      expect(policy.shouldRetry(rateLimitError, 1, 5000)).toBe(true);
    });

    it('should create conservative policy', () => {
      const policy = RetryPolicy.createConservative();
      
      expect(policy).toBeDefined();
      
      // Conservative policy should have limited retries
      const networkError = new NetworkError('Connection failed', 'connection');
      expect(policy.shouldRetry(networkError, 1, 5000)).toBe(true);
      expect(policy.shouldRetry(networkError, 3, 5000)).toBe(false); // Should stop at 2 attempts
    });

    it('should create aggressive policy', () => {
      const policy = RetryPolicy.createAggressive();
      
      expect(policy).toBeDefined();
      
      // Aggressive policy should allow more retries
      const networkError = new NetworkError('Connection failed', 'connection');
      expect(policy.shouldRetry(networkError, 4, 5000)).toBe(true);
    });
  });
});
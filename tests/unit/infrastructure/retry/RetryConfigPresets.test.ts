import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryConfigPresets, RetryConfigBuilder } from '../../../../src/infrastructure/retry/RetryConfigPresets';
import { RetryPolicy } from '../../../../src/infrastructure/retry/RetryPolicy';
import { RateLimitError, NetworkError, GoveeApiError } from '../../../../src/errors';
import pino from 'pino';

describe('RetryConfigPresets', () => {
  let mockLogger: ReturnType<typeof pino>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any;
  });

  describe('development preset', () => {
    it('should create development configuration', () => {
      const config = RetryConfigPresets.development(mockLogger);
      
      expect(config.backoff.type).toBe('exponential');
      expect(config.backoff.initialDelayMs).toBe(100);
      expect(config.backoff.maxDelayMs).toBe(5000);
      expect(config.backoff.multiplier).toBe(1.5);
      
      expect(config.jitter.type).toBe('equal');
      expect(config.jitter.factor).toBe(0.2);
      
      expect(config.condition.maxAttempts).toBe(5);
      expect(config.condition.maxTotalTimeMs).toBe(15000);
      
      expect(config.circuitBreaker?.enabled).toBe(false);
      expect(config.enableMetrics).toBe(true);
      expect(config.logger).toBe(mockLogger);
    });

    it('should work without logger', () => {
      const config = RetryConfigPresets.development();
      
      expect(config).toBeDefined();
      expect(config.logger).toBeUndefined();
    });

    it('should create functional retry policy', () => {
      const config = RetryConfigPresets.development();
      const policy = new RetryPolicy(config);
      
      expect(policy).toBeDefined();
      
      // Should retry on retryable errors
      const rateLimitError = new RateLimitError('Rate limited', 60);
      expect(policy.shouldRetry(rateLimitError, 1, 1000)).toBe(true);
      
      // Should allow more attempts (development is more aggressive)
      expect(policy.shouldRetry(rateLimitError, 4, 10000)).toBe(true);
    });
  });

  describe('testing preset', () => {
    it('should create testing configuration', () => {
      const config = RetryConfigPresets.testing(mockLogger);
      
      expect(config.backoff.type).toBe('fixed');
      expect(config.backoff.initialDelayMs).toBe(100);
      expect(config.backoff.maxDelayMs).toBe(100);
      
      expect(config.jitter.type).toBe('none');
      
      expect(config.condition.maxAttempts).toBe(3);
      expect(config.condition.maxTotalTimeMs).toBe(1000);
      
      expect(config.circuitBreaker?.enabled).toBe(false);
      expect(config.enableMetrics).toBe(false);
    });

    it('should provide predictable behavior for tests', () => {
      const config = RetryConfigPresets.testing();
      const policy = new RetryPolicy(config);
      
      // Delays should be predictable (fixed, no jitter)
      const error = new NetworkError('Test error', 'connection');
      const delay1 = policy.calculateDelay(1, error);
      const delay2 = policy.calculateDelay(2, error);
      const delay3 = policy.calculateDelay(3, error);
      
      expect(delay1).toBe(100);
      expect(delay2).toBe(100);
      expect(delay3).toBe(100);
    });
  });

  describe('production preset', () => {
    it('should create production configuration', () => {
      const config = RetryConfigPresets.production(mockLogger);
      
      expect(config.backoff.type).toBe('exponential');
      expect(config.backoff.initialDelayMs).toBe(2000);
      expect(config.backoff.maxDelayMs).toBe(60000);
      expect(config.backoff.multiplier).toBe(2.0);
      
      expect(config.jitter.type).toBe('decorrelated');
      expect(config.jitter.factor).toBe(0.1);
      
      expect(config.condition.maxAttempts).toBe(3);
      expect(config.condition.maxTotalTimeMs).toBe(180000);
      
      expect(config.circuitBreaker?.enabled).toBe(true);
      expect(config.circuitBreaker?.failureThreshold).toBe(5);
      expect(config.circuitBreaker?.recoveryTimeoutMs).toBe(60000);
      
      expect(config.enableMetrics).toBe(true);
    });

    it('should be conservative with retry attempts', () => {
      const config = RetryConfigPresets.production();
      const policy = new RetryPolicy(config);
      
      const networkError = new NetworkError('Connection failed', 'connection');
      
      // Should retry initially
      expect(policy.shouldRetry(networkError, 1, 5000)).toBe(true);
      expect(policy.shouldRetry(networkError, 2, 10000)).toBe(true);
      
      // Should stop at max attempts (3)
      expect(policy.shouldRetry(networkError, 3, 15000)).toBe(false);
    });

    it('should only retry specific error types', () => {
      const config = RetryConfigPresets.production();
      
      // Should include only safe-to-retry errors
      expect(config.condition.retryableErrorTypes).toContain(RateLimitError);
      expect(config.condition.retryableErrorTypes).toContain(NetworkError);
      expect(config.condition.retryableErrorTypes).not.toContain(GoveeApiError);
    });
  });

  describe('highFrequency preset', () => {
    it('should create high frequency configuration', () => {
      const config = RetryConfigPresets.highFrequency(mockLogger);
      
      expect(config.backoff.type).toBe('linear');
      expect(config.backoff.initialDelayMs).toBe(500);
      expect(config.backoff.maxDelayMs).toBe(5000);
      
      expect(config.jitter.type).toBe('full');
      expect(config.jitter.factor).toBe(0.5);
      
      expect(config.condition.maxAttempts).toBe(2);
      expect(config.condition.maxTotalTimeMs).toBe(10000);
      
      expect(config.circuitBreaker?.enabled).toBe(true);
      expect(config.circuitBreaker?.failureThreshold).toBe(3);
    });

    it('should fail fast for high frequency operations', () => {
      const config = RetryConfigPresets.highFrequency();
      const policy = new RetryPolicy(config);
      
      const rateLimitError = new RateLimitError('Rate limited', 60);
      
      // Should allow one retry
      expect(policy.shouldRetry(rateLimitError, 1, 2000)).toBe(true);
      
      // Should fail fast after that
      expect(policy.shouldRetry(rateLimitError, 2, 5000)).toBe(false);
    });
  });

  describe('rateLimitAware preset', () => {
    it('should create rate limit aware configuration', () => {
      const config = RetryConfigPresets.rateLimitAware(mockLogger);
      
      expect(config.backoff.type).toBe('exponential');
      expect(config.backoff.initialDelayMs).toBe(1000);
      expect(config.backoff.maxDelayMs).toBe(300000); // 5 minutes
      expect(config.backoff.multiplier).toBe(1.5);
      
      expect(config.jitter.type).toBe('equal');
      expect(config.jitter.factor).toBe(0.05);
      
      expect(config.condition.maxAttempts).toBe(3);
      expect(config.condition.maxTotalTimeMs).toBe(600000); // 10 minutes
      
      expect(config.circuitBreaker?.enabled).toBe(false);
      
      // Should only retry rate limit errors
      expect(config.condition.retryableStatusCodes).toEqual([429]);
      expect(config.condition.retryableErrorTypes).toEqual([RateLimitError]);
    });

    it('should have custom retry logic for rate limits', () => {
      const config = RetryConfigPresets.rateLimitAware();
      
      expect(config.condition.shouldRetry).toBeDefined();
      
      const rateLimitError = new RateLimitError('Rate limited', 60);
      vi.spyOn(rateLimitError, 'canRetry').mockReturnValue(true);
      
      const networkError = new NetworkError('Connection failed', 'connection');
      
      // Should retry rate limit errors that can retry
      expect(config.condition.shouldRetry!(rateLimitError, 1, 5000)).toBe(true);
      
      // Should not retry other error types
      expect(config.condition.shouldRetry!(networkError, 1, 5000)).toBe(false);
    });

    it('should respect rate limit retry conditions', () => {
      const config = RetryConfigPresets.rateLimitAware();
      
      const rateLimitError = new RateLimitError('Rate limited', 60);
      vi.spyOn(rateLimitError, 'canRetry').mockReturnValue(false);
      
      // Should not retry if rate limit error says it can't retry
      expect(config.condition.shouldRetry!(rateLimitError, 1, 5000)).toBe(false);
    });
  });

  describe('networkResilient preset', () => {
    it('should create network resilient configuration', () => {
      const config = RetryConfigPresets.networkResilient(mockLogger);
      
      expect(config.backoff.type).toBe('exponential');
      expect(config.backoff.initialDelayMs).toBe(2000);
      expect(config.backoff.maxDelayMs).toBe(30000);
      expect(config.backoff.multiplier).toBe(2.0);
      
      expect(config.jitter.type).toBe('decorrelated');
      expect(config.jitter.factor).toBe(0.3);
      
      expect(config.condition.maxAttempts).toBe(5);
      expect(config.condition.maxTotalTimeMs).toBe(120000);
      
      expect(config.circuitBreaker?.enabled).toBe(true);
      expect(config.circuitBreaker?.failureThreshold).toBe(7);
      
      // Should only retry network errors
      expect(config.condition.retryableErrorTypes).toEqual([NetworkError]);
    });

    it('should have custom retry logic for network errors', () => {
      const config = RetryConfigPresets.networkResilient();
      
      expect(config.condition.shouldRetry).toBeDefined();
      
      const retryableNetworkError = new NetworkError('Connection failed', 'connection');
      vi.spyOn(retryableNetworkError, 'isRetryable').mockReturnValue(true);
      
      const nonRetryableNetworkError = new NetworkError('DNS failed', 'dns');
      vi.spyOn(nonRetryableNetworkError, 'isRetryable').mockReturnValue(false);
      
      const rateLimitError = new RateLimitError('Rate limited', 60);
      
      // Should retry retryable network errors
      expect(config.condition.shouldRetry!(retryableNetworkError, 1, 5000)).toBe(true);
      
      // Should not retry non-retryable network errors
      expect(config.condition.shouldRetry!(nonRetryableNetworkError, 1, 5000)).toBe(false);
      
      // Should not retry other error types
      expect(config.condition.shouldRetry!(rateLimitError, 1, 5000)).toBe(false);
    });

    it('should allow more attempts for network issues', () => {
      const config = RetryConfigPresets.networkResilient();
      const policy = new RetryPolicy(config);
      
      const networkError = new NetworkError('Connection failed', 'connection');
      
      // Should allow up to 5 attempts
      expect(policy.shouldRetry(networkError, 4, 60000)).toBe(true);
      expect(policy.shouldRetry(networkError, 5, 100000)).toBe(false);
    });
  });
});

describe('RetryConfigBuilder', () => {
  let builder: RetryConfigBuilder;
  let mockLogger: ReturnType<typeof pino>;

  beforeEach(() => {
    builder = RetryConfigPresets.custom();
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any;
  });

  describe('backoff configuration', () => {
    it('should build exponential backoff', () => {
      const config = builder
        .withExponentialBackoff(2000, 30000, 2.5)
        .build();
      
      expect(config.backoff.type).toBe('exponential');
      expect(config.backoff.initialDelayMs).toBe(2000);
      expect(config.backoff.maxDelayMs).toBe(30000);
      expect(config.backoff.multiplier).toBe(2.5);
    });

    it('should build linear backoff', () => {
      const config = builder
        .withLinearBackoff(1500, 8000)
        .build();
      
      expect(config.backoff.type).toBe('linear');
      expect(config.backoff.initialDelayMs).toBe(1500);
      expect(config.backoff.maxDelayMs).toBe(8000);
    });

    it('should build fixed backoff', () => {
      const config = builder
        .withFixedBackoff(3000)
        .build();
      
      expect(config.backoff.type).toBe('fixed');
      expect(config.backoff.initialDelayMs).toBe(3000);
      expect(config.backoff.maxDelayMs).toBe(3000);
    });

    it('should build custom backoff', () => {
      const customFn = vi.fn().mockReturnValue(1000);
      
      const config = builder
        .withCustomBackoff(500, 5000, customFn)
        .build();
      
      expect(config.backoff.type).toBe('custom');
      expect(config.backoff.initialDelayMs).toBe(500);
      expect(config.backoff.maxDelayMs).toBe(5000);
      expect(config.backoff.customBackoff).toBe(customFn);
    });

    it('should use defaults for exponential backoff', () => {
      const config = builder
        .withExponentialBackoff()
        .build();
      
      expect(config.backoff.initialDelayMs).toBe(1000);
      expect(config.backoff.maxDelayMs).toBe(30000);
      expect(config.backoff.multiplier).toBe(2.0);
    });
  });

  describe('jitter configuration', () => {
    it('should configure no jitter', () => {
      const config = builder
        .withoutJitter()
        .build();
      
      expect(config.jitter.type).toBe('none');
    });

    it('should configure equal jitter', () => {
      const config = builder
        .withEqualJitter(0.3)
        .build();
      
      expect(config.jitter.type).toBe('equal');
      expect(config.jitter.factor).toBe(0.3);
    });

    it('should configure full jitter', () => {
      const config = builder
        .withFullJitter(0.4)
        .build();
      
      expect(config.jitter.type).toBe('full');
      expect(config.jitter.factor).toBe(0.4);
    });

    it('should configure decorrelated jitter', () => {
      const config = builder
        .withDecorrelatedJitter(0.2)
        .build();
      
      expect(config.jitter.type).toBe('decorrelated');
      expect(config.jitter.factor).toBe(0.2);
    });

    it('should use default factors when not specified', () => {
      const config1 = builder.withEqualJitter().build();
      expect(config1.jitter.factor).toBe(0.1);
      
      const config2 = builder.withFullJitter().build();
      expect(config2.jitter.factor).toBe(0.1);
      
      const config3 = builder.withDecorrelatedJitter().build();
      expect(config3.jitter.factor).toBe(0.1);
    });
  });

  describe('retry conditions', () => {
    it('should configure basic conditions', () => {
      const config = builder
        .withBasicConditions(5, 120000, [429, 502, 503])
        .build();
      
      expect(config.condition.maxAttempts).toBe(5);
      expect(config.condition.maxTotalTimeMs).toBe(120000);
      expect(config.condition.retryableStatusCodes).toEqual([429, 502, 503]);
      expect(config.condition.retryableErrorTypes).toEqual([RateLimitError, NetworkError, GoveeApiError]);
    });

    it('should use defaults for basic conditions', () => {
      const config = builder
        .withBasicConditions()
        .build();
      
      expect(config.condition.maxAttempts).toBe(3);
      expect(config.condition.maxTotalTimeMs).toBe(60000);
      expect(config.condition.retryableStatusCodes).toEqual([429, 502, 503, 504]);
    });

    it('should configure custom conditions', () => {
      const customCondition = {
        maxAttempts: 7,
        maxTotalTimeMs: 300000,
        retryableStatusCodes: [429],
        retryableErrorTypes: [RateLimitError],
        shouldRetry: vi.fn().mockReturnValue(true),
      };
      
      const config = builder
        .withConditions(customCondition)
        .build();
      
      expect(config.condition).toBe(customCondition);
    });
  });

  describe('circuit breaker configuration', () => {
    it('should configure basic circuit breaker', () => {
      const config = builder
        .withBasicCircuitBreaker(3, 15000, 1)
        .build();
      
      expect(config.circuitBreaker?.enabled).toBe(true);
      expect(config.circuitBreaker?.failureThreshold).toBe(3);
      expect(config.circuitBreaker?.recoveryTimeoutMs).toBe(15000);
      expect(config.circuitBreaker?.halfOpenSuccessThreshold).toBe(1);
    });

    it('should use defaults for basic circuit breaker', () => {
      const config = builder
        .withBasicCircuitBreaker()
        .build();
      
      expect(config.circuitBreaker?.failureThreshold).toBe(5);
      expect(config.circuitBreaker?.recoveryTimeoutMs).toBe(30000);
      expect(config.circuitBreaker?.halfOpenSuccessThreshold).toBe(2);
    });

    it('should disable circuit breaker', () => {
      const config = builder
        .withoutCircuitBreaker()
        .build();
      
      expect(config.circuitBreaker?.enabled).toBe(false);
    });

    it('should configure custom circuit breaker', () => {
      const customCircuitBreaker = {
        enabled: true,
        failureThreshold: 10,
        recoveryTimeoutMs: 60000,
        halfOpenSuccessThreshold: 5,
      };
      
      const config = builder
        .withCircuitBreaker(customCircuitBreaker)
        .build();
      
      expect(config.circuitBreaker).toBe(customCircuitBreaker);
    });
  });

  describe('additional configuration', () => {
    it('should configure logger', () => {
      const config = builder
        .withLogger(mockLogger)
        .build();
      
      expect(config.logger).toBe(mockLogger);
    });

    it('should configure metrics', () => {
      const config1 = builder.withMetrics(true).build();
      expect(config1.enableMetrics).toBe(true);
      
      const config2 = builder.withMetrics(false).build();
      expect(config2.enableMetrics).toBe(false);
      
      const config3 = builder.withMetrics().build();
      expect(config3.enableMetrics).toBe(true);
    });
  });

  describe('complete configuration building', () => {
    it('should build complete configuration with all options', () => {
      const config = builder
        .withExponentialBackoff(1000, 20000, 1.8)
        .withEqualJitter(0.15)
        .withBasicConditions(4, 90000, [429, 503])
        .withBasicCircuitBreaker(6, 45000, 2)
        .withLogger(mockLogger)
        .withMetrics(true)
        .build();
      
      expect(config.backoff.type).toBe('exponential');
      expect(config.backoff.initialDelayMs).toBe(1000);
      expect(config.backoff.maxDelayMs).toBe(20000);
      expect(config.backoff.multiplier).toBe(1.8);
      
      expect(config.jitter.type).toBe('equal');
      expect(config.jitter.factor).toBe(0.15);
      
      expect(config.condition.maxAttempts).toBe(4);
      expect(config.condition.maxTotalTimeMs).toBe(90000);
      expect(config.condition.retryableStatusCodes).toEqual([429, 503]);
      
      expect(config.circuitBreaker?.enabled).toBe(true);
      expect(config.circuitBreaker?.failureThreshold).toBe(6);
      expect(config.circuitBreaker?.recoveryTimeoutMs).toBe(45000);
      expect(config.circuitBreaker?.halfOpenSuccessThreshold).toBe(2);
      
      expect(config.logger).toBe(mockLogger);
      expect(config.enableMetrics).toBe(true);
    });

    it('should build configuration with defaults when nothing is specified', () => {
      const config = builder.build();
      
      // Should have sensible defaults
      expect(config.backoff.type).toBe('exponential');
      expect(config.backoff.initialDelayMs).toBe(1000);
      expect(config.backoff.maxDelayMs).toBe(30000);
      expect(config.backoff.multiplier).toBe(2.0);
      
      expect(config.jitter.type).toBe('equal');
      expect(config.jitter.factor).toBe(0.1);
      
      expect(config.condition.maxAttempts).toBe(3);
      expect(config.condition.maxTotalTimeMs).toBe(60000);
      
      expect(config.circuitBreaker?.enabled).toBe(true);
      expect(config.enableMetrics).toBe(true);
    });

    it('should create functional retry policy from built configuration', () => {
      const config = builder
        .withExponentialBackoff(500, 5000)
        .withoutJitter()
        .withBasicConditions(2, 10000, [429])
        .withoutCircuitBreaker()
        .build();
      
      const policy = new RetryPolicy(config);
      
      expect(policy).toBeDefined();
      
      // Test basic functionality
      const rateLimitError = new RateLimitError('Rate limited', 60);
      expect(policy.shouldRetry(rateLimitError, 1, 2000)).toBe(true);
      expect(policy.shouldRetry(rateLimitError, 2, 8000)).toBe(false);
      
      const delay = policy.calculateDelay(1, rateLimitError);
      expect(delay).toBe(60000); // Should use rate limit retry-after
    });
  });
});
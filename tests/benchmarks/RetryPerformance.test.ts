import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryPolicy } from '../../src/infrastructure/retry/RetryPolicy';
import { RetryExecutor } from '../../src/infrastructure/retry/RetryableRequest';
import { RetryConfigPresets } from '../../src/infrastructure/retry/RetryConfigPresets';
import { RateLimitError, NetworkError, GoveeApiError } from '../../src/errors';

describe('Retry Performance Benchmarks', () => {
  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    POLICY_CREATION: 10,
    RETRY_DECISION: 1,
    DELAY_CALCULATION: 1,
    EXECUTOR_OVERHEAD: 5,
    CIRCUIT_BREAKER_CHECK: 0.5,
    METRICS_UPDATE: 0.5,
  };

  describe('RetryPolicy performance', () => {
    it('should create policy instances quickly', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const policy = new RetryPolicy({
          backoff: {
            type: 'exponential',
            initialDelayMs: 1000,
            maxDelayMs: 30000,
            multiplier: 2.0,
          },
          jitter: { type: 'equal', factor: 0.1 },
          condition: {
            maxAttempts: 3,
            maxTotalTimeMs: 60000,
            retryableStatusCodes: [429, 502, 503, 504],
            retryableErrorTypes: [RateLimitError, NetworkError],
          },
          enableMetrics: true,
        });
      }

      const endTime = performance.now();
      const avgTimePerCreation = (endTime - startTime) / iterations;

      expect(avgTimePerCreation).toBeLessThan(PERFORMANCE_THRESHOLDS.POLICY_CREATION);
      console.log(`Policy creation: ${avgTimePerCreation.toFixed(3)}ms per instance`);
    });

    it('should make retry decisions quickly', () => {
      const policy = RetryPolicy.createGoveeOptimized();
      const error = new RateLimitError('Rate limited', 60);
      const iterations = 10000;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        policy.shouldRetry(error, 1, 5000);
      }

      const endTime = performance.now();
      const avgTimePerDecision = (endTime - startTime) / iterations;

      expect(avgTimePerDecision).toBeLessThan(PERFORMANCE_THRESHOLDS.RETRY_DECISION);
      console.log(`Retry decision: ${avgTimePerDecision.toFixed(3)}ms per decision`);
    });

    it('should calculate delays quickly', () => {
      const policy = RetryPolicy.createGoveeOptimized();
      const error = new NetworkError('Connection failed', 'connection');
      const iterations = 10000;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        policy.calculateDelay(i % 5 + 1, error);
      }

      const endTime = performance.now();
      const avgTimePerCalculation = (endTime - startTime) / iterations;

      expect(avgTimePerCalculation).toBeLessThan(PERFORMANCE_THRESHOLDS.DELAY_CALCULATION);
      console.log(`Delay calculation: ${avgTimePerCalculation.toFixed(3)}ms per calculation`);
    });
  });

  describe('Backoff algorithm performance', () => {
    it('should handle exponential backoff efficiently', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'exponential',
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          multiplier: 2.0,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 10,
          maxTotalTimeMs: 120000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      const iterations = 5000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (let attempt = 1; attempt <= 10; attempt++) {
          policy.calculateDelay(attempt, error);
        }
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / (iterations * 10);

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DELAY_CALCULATION);
      console.log(`Exponential backoff: ${avgTime.toFixed(3)}ms per calculation`);
    });

    it('should handle linear backoff efficiently', () => {
      const policy = new RetryPolicy({
        backoff: {
          type: 'linear',
          initialDelayMs: 1000,
          maxDelayMs: 30000,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 10,
          maxTotalTimeMs: 120000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      const iterations = 5000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (let attempt = 1; attempt <= 10; attempt++) {
          policy.calculateDelay(attempt, error);
        }
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / (iterations * 10);

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DELAY_CALCULATION);
      console.log(`Linear backoff: ${avgTime.toFixed(3)}ms per calculation`);
    });

    it('should handle custom backoff efficiently', () => {
      const customBackoff = (attempt: number) => Math.min(1000 * Math.pow(1.5, attempt), 30000);
      
      const policy = new RetryPolicy({
        backoff: {
          type: 'custom',
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          customBackoff,
        },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 10,
          maxTotalTimeMs: 120000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      const iterations = 5000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (let attempt = 1; attempt <= 10; attempt++) {
          policy.calculateDelay(attempt, error);
        }
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / (iterations * 10);

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DELAY_CALCULATION * 2); // Allow 2x for custom function
      console.log(`Custom backoff: ${avgTime.toFixed(3)}ms per calculation`);
    });
  });

  describe('Jitter algorithm performance', () => {
    const baseDelays = [100, 500, 1000, 2000, 5000, 10000];

    it('should apply full jitter efficiently', () => {
      const policy = new RetryPolicy({
        backoff: { type: 'fixed', initialDelayMs: 1000, maxDelayMs: 1000 },
        jitter: { type: 'full' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        policy.calculateDelay(1, error);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DELAY_CALCULATION * 2);
      console.log(`Full jitter: ${avgTime.toFixed(3)}ms per application`);
    });

    it('should apply equal jitter efficiently', () => {
      const policy = new RetryPolicy({
        backoff: { type: 'fixed', initialDelayMs: 1000, maxDelayMs: 1000 },
        jitter: { type: 'equal', factor: 0.1 },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        policy.calculateDelay(1, error);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DELAY_CALCULATION * 2);
      console.log(`Equal jitter: ${avgTime.toFixed(3)}ms per application`);
    });

    it('should apply decorrelated jitter efficiently', () => {
      const policy = new RetryPolicy({
        backoff: { type: 'fixed', initialDelayMs: 1000, maxDelayMs: 1000 },
        jitter: { type: 'decorrelated', factor: 0.1 },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
      });

      const error = new RateLimitError('Rate limited');
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        policy.calculateDelay(1, error);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DELAY_CALCULATION * 3);
      console.log(`Decorrelated jitter: ${avgTime.toFixed(3)}ms per application`);
    });
  });

  describe('Circuit breaker performance', () => {
    it('should check circuit breaker state efficiently', () => {
      const policy = new RetryPolicy({
        backoff: { type: 'fixed', initialDelayMs: 1000, maxDelayMs: 1000 },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
        circuitBreaker: {
          enabled: true,
          failureThreshold: 3,
          recoveryTimeoutMs: 30000,
          halfOpenSuccessThreshold: 2,
        },
      });

      const error = new RateLimitError('Rate limited');
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        policy.shouldRetry(error, 1, 5000);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CIRCUIT_BREAKER_CHECK);
      console.log(`Circuit breaker check: ${avgTime.toFixed(3)}ms per check`);
    });

    it('should handle circuit state transitions efficiently', () => {
      const policy = new RetryPolicy({
        backoff: { type: 'fixed', initialDelayMs: 1000, maxDelayMs: 1000 },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 10,
          maxTotalTimeMs: 120000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
        circuitBreaker: {
          enabled: true,
          failureThreshold: 3,
          recoveryTimeoutMs: 100, // Short for testing
          halfOpenSuccessThreshold: 2,
        },
      });

      const error = new RateLimitError('Rate limited');
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        // Cause failures to trigger state transitions
        policy.recordFailure(error);
        policy.recordFailure(error);
        policy.recordFailure(error); // Should open circuit

        // Try to make requests while circuit is open
        policy.shouldRetry(error, 1, 1000);

        // Simulate recovery
        policy.recordSuccess(); // Should close circuit
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(5); // Allow more time for state transitions
      console.log(`Circuit state transitions: ${avgTime.toFixed(3)}ms per cycle`);
    });
  });

  describe('Metrics performance', () => {
    it('should update metrics efficiently', () => {
      const policy = new RetryPolicy({
        backoff: { type: 'fixed', initialDelayMs: 1000, maxDelayMs: 1000 },
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
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        if (i % 2 === 0) {
          policy.recordSuccess();
        } else {
          policy.recordFailure(error);
        }
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.METRICS_UPDATE);
      console.log(`Metrics update: ${avgTime.toFixed(3)}ms per update`);
    });

    it('should retrieve metrics efficiently', () => {
      const policy = new RetryPolicy({
        backoff: { type: 'fixed', initialDelayMs: 1000, maxDelayMs: 1000 },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 3,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
        enableMetrics: true,
      });

      // Add some metrics data
      policy.recordSuccess();
      policy.recordFailure(new RateLimitError('Rate limited'));

      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        policy.getMetrics();
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.METRICS_UPDATE);
      console.log(`Metrics retrieval: ${avgTime.toFixed(3)}ms per retrieval`);
    });
  });

  describe('RetryExecutor performance', () => {
    it('should have minimal overhead for successful requests', async () => {
      const policy = RetryPolicy.createGoveeOptimized();
      const executor = new RetryExecutor(policy, { enableRequestLogging: false });

      const successfulRequest = {
        id: 'test-request',
        execute: vi.fn().mockResolvedValue({ success: true }),
        description: 'Test request',
      };

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await executor.execute(successfulRequest);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.EXECUTOR_OVERHEAD);
      console.log(`Executor overhead (success): ${avgTime.toFixed(3)}ms per request`);
    });

    it('should handle high concurrency efficiently', async () => {
      const policy = RetryPolicy.createGoveeOptimized();
      const executor = new RetryExecutor(policy, { enableRequestLogging: false });

      const createRequest = (id: string) => ({
        id,
        execute: vi.fn().mockResolvedValue({ success: true }),
        description: `Concurrent request ${id}`,
      });

      const concurrentRequests = 100;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        executor.execute(createRequest(`request-${i}`))
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
      console.log(`Concurrent requests (${concurrentRequests}): ${totalTime.toFixed(3)}ms total`);
    });
  });

  describe('Configuration preset performance', () => {
    it('should create preset configurations quickly', () => {
      const presets = [
        'development',
        'testing', 
        'production',
        'highFrequency',
        'rateLimitAware',
        'networkResilient',
      ] as const;

      const iterations = 1000;
      const results: Record<string, number> = {};

      for (const preset of presets) {
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
          RetryConfigPresets[preset]();
        }

        const endTime = performance.now();
        const avgTime = (endTime - startTime) / iterations;
        results[preset] = avgTime;

        expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.POLICY_CREATION);
      }

      console.log('Preset creation times:');
      Object.entries(results).forEach(([preset, time]) => {
        console.log(`  ${preset}: ${time.toFixed(3)}ms per creation`);
      });
    });
  });

  describe('Memory performance', () => {
    it('should not leak memory during repeated operations', () => {
      const policy = RetryPolicy.createGoveeOptimized();
      const error = new RateLimitError('Rate limited');

      // Get initial memory usage (if available)
      const initialMemory = process.memoryUsage?.()?.heapUsed || 0;

      // Perform many operations
      const iterations = 50000;
      for (let i = 0; i < iterations; i++) {
        policy.shouldRetry(error, 1, 5000);
        policy.calculateDelay(1, error);
        
        if (i % 2 === 0) {
          policy.recordSuccess();
        } else {
          policy.recordFailure(error);
        }
        
        // Occasionally get metrics to test object creation
        if (i % 1000 === 0) {
          policy.getMetrics();
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage?.()?.heapUsed || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for this test)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      
      if (initialMemory > 0) {
        console.log(`Memory usage: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase after ${iterations} operations`);
      }
    });
  });

  describe('Real-world scenario performance', () => {
    it('should handle typical retry scenarios efficiently', async () => {
      // Use faster retry policy for benchmark testing
      const policy = new RetryPolicy({
        backoff: { type: 'fixed', initialDelayMs: 10, maxDelayMs: 10 }, // Very fast for testing
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 5,
          maxTotalTimeMs: 30000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
        enableMetrics: false,
      });
      const executor = new RetryExecutor(policy, { enableRequestLogging: false });

      // Simulate a typical scenario: some failures, then success
      const createFlappyRequest = (failCount: number) => {
        let attempts = 0;
        return {
          id: `flappy-request-${failCount}`,
          execute: vi.fn().mockImplementation(() => {
            attempts++;
            if (attempts <= failCount) {
              return Promise.reject(new RateLimitError('Rate limited', 1));
            }
            return Promise.resolve({ success: true });
          }),
          description: 'Flappy request',
        };
      };

      const scenarios = [
        { name: 'immediate success', failCount: 0, expectedRequests: 100 },
        { name: 'one retry', failCount: 1, expectedRequests: 50 },
        { name: 'two retries', failCount: 2, expectedRequests: 20 },
      ];

      for (const scenario of scenarios) {
        const startTime = performance.now();

        const promises = Array.from({ length: scenario.expectedRequests }, () =>
          executor.execute(createFlappyRequest(scenario.failCount))
        );

        await Promise.all(promises);

        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const avgTimePerRequest = totalTime / scenario.expectedRequests;

        console.log(`Scenario "${scenario.name}": ${avgTimePerRequest.toFixed(3)}ms per request (${scenario.expectedRequests} requests in ${totalTime.toFixed(0)}ms)`);

        // Performance expectations based on scenario
        const maxTimePerRequest = scenario.failCount === 0 ? 2 : (scenario.failCount * 50); // Account for retry delays
        expect(avgTimePerRequest).toBeLessThan(maxTimePerRequest);
      }
    });
  });

  describe('Performance summary', () => {
    it('should report performance summary', () => {
      console.log('\n=== Retry Logic Performance Summary ===');
      console.log(`Policy creation: < ${PERFORMANCE_THRESHOLDS.POLICY_CREATION}ms`);
      console.log(`Retry decisions: < ${PERFORMANCE_THRESHOLDS.RETRY_DECISION}ms`);
      console.log(`Delay calculations: < ${PERFORMANCE_THRESHOLDS.DELAY_CALCULATION}ms`);
      console.log(`Executor overhead: < ${PERFORMANCE_THRESHOLDS.EXECUTOR_OVERHEAD}ms`);
      console.log(`Circuit breaker checks: < ${PERFORMANCE_THRESHOLDS.CIRCUIT_BREAKER_CHECK}ms`);
      console.log(`Metrics updates: < ${PERFORMANCE_THRESHOLDS.METRICS_UPDATE}ms`);
      console.log('=====================================\n');
    });
  });
});
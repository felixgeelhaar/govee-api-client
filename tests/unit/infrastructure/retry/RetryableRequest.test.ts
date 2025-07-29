import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryExecutor, RetryExecutorFactory, RetryableRequest } from '../../../../src/infrastructure/retry/RetryableRequest';
import { RetryPolicy } from '../../../../src/infrastructure/retry/RetryPolicy';
import { RateLimitError, NetworkError, GoveeApiError } from '../../../../src/errors';
import pino from 'pino';

describe('RetryExecutor', () => {
  let mockLogger: ReturnType<typeof pino>;
  let retryPolicy: RetryPolicy;
  let retryExecutor: RetryExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any;

    retryPolicy = new RetryPolicy({
      backoff: {
        type: 'fixed',
        initialDelayMs: 100, // Short delay for tests
        maxDelayMs: 100,
      },
      jitter: { type: 'none' },
      condition: {
        maxAttempts: 3,
        maxTotalTimeMs: 5000,
        retryableStatusCodes: [429, 502, 503, 504],
        retryableErrorTypes: [RateLimitError, NetworkError, GoveeApiError],
      },
      enableMetrics: true,
    });

    retryExecutor = new RetryExecutor(retryPolicy, {
      logger: mockLogger,
      enableRequestLogging: true,
      enablePerformanceTracking: true,
    });
  });

  describe('successful execution', () => {
    it('should execute request successfully on first attempt', async () => {
      const mockData = { devices: ['device1', 'device2'] };
      const request: RetryableRequest<typeof mockData> = {
        id: 'test-request-1',
        description: 'Test request',
        execute: vi.fn().mockResolvedValue(mockData),
        context: { operation: 'findAll' },
      };

      const result = await retryExecutor.execute(request);

      expect(result).toEqual(mockData);
      expect(request.execute).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'test-request-1' }),
        'Starting retryable request'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ 
          requestId: 'test-request-1',
          totalAttempts: 1,
          retriesNeeded: 0 
        }),
        'Retryable request completed successfully'
      );
    });

    it('should return detailed result with executeWithResult', async () => {
      const mockData = { devices: ['device1'] };
      const request: RetryableRequest<typeof mockData> = {
        id: 'test-request-2',
        execute: vi.fn().mockResolvedValue(mockData),
        description: 'Test request with result',
      };

      const result = await retryExecutor.executeWithResult(request);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.totalAttempts).toBe(1);
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].success).toBe(true);
      expect(result.attempts[0].attemptNumber).toBe(1);
      expect(result.attempts[0].delayBeforeAttemptMs).toBe(0);
      expect(result.error).toBeUndefined();
    });
  });

  describe('retry behavior', () => {
    it('should retry on retryable error and eventually succeed', async () => {
      const mockData = { status: 'success' };
      const retryableError = new RateLimitError('Rate limited', 1);
      
      const executeFn = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(mockData);

      const request: RetryableRequest<typeof mockData> = {
        id: 'test-retry-1',
        execute: executeFn,
        description: 'Test retry request',
      };

      const result = await retryExecutor.executeWithResult(request);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.totalAttempts).toBe(3);
      expect(executeFn).toHaveBeenCalledTimes(3);
      
      // Check attempt details
      expect(result.attempts).toHaveLength(3);
      expect(result.attempts[0].success).toBe(false);
      expect(result.attempts[0].error).toBeInstanceOf(RateLimitError);
      expect(result.attempts[1].success).toBe(false);
      expect(result.attempts[1].error).toBeInstanceOf(RateLimitError);
      expect(result.attempts[2].success).toBe(true);
      expect(result.attempts[2].error).toBeUndefined();
    });

    it('should fail after max attempts reached', async () => {
      const retryableError = new NetworkError('Connection failed', 'connection');
      const executeFn = vi.fn().mockRejectedValue(retryableError);

      const request: RetryableRequest<any> = {
        id: 'test-max-attempts',
        execute: executeFn,
        description: 'Test max attempts',
      };

      const result = await retryExecutor.executeWithResult(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(NetworkError);
      expect(result.totalAttempts).toBe(3); // maxAttempts from policy
      expect(executeFn).toHaveBeenCalledTimes(3);
      
      // All attempts should have failed
      expect(result.attempts.every(attempt => !attempt.success)).toBe(true);
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = new GoveeApiError('Bad request', 400, 400, 'Bad request');
      const executeFn = vi.fn().mockRejectedValue(nonRetryableError);

      const request: RetryableRequest<any> = {
        id: 'test-non-retryable',
        execute: executeFn,
        description: 'Test non-retryable error',
      };

      const result = await retryExecutor.executeWithResult(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(GoveeApiError);
      expect(result.totalAttempts).toBe(1);
      expect(executeFn).toHaveBeenCalledTimes(1);
    });

    it('should apply delays between retry attempts', async () => {
      const retryableError = new NetworkError('Timeout', 'timeout');
      const executeFn = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce({ success: true });

      const request: RetryableRequest<any> = {
        id: 'test-delays',
        execute: executeFn,
        description: 'Test retry delays',
      };

      const startTime = Date.now();
      const result = await retryExecutor.executeWithResult(request);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(2);
      
      // Should have taken at least close to the delay time (allowing for timing variations)
      expect(endTime - startTime).toBeGreaterThanOrEqual(95);
      
      // Check delay was applied
      expect(result.attempts[1].delayBeforeAttemptMs).toBe(100);
    });
  });

  describe('error normalization', () => {
    it('should normalize unknown errors to NetworkError', async () => {
      const unknownError = new Error('Unknown error');
      const executeFn = vi.fn().mockRejectedValue(unknownError);

      const request: RetryableRequest<any> = {
        id: 'test-unknown-error',
        execute: executeFn,
        description: 'Test unknown error normalization',
      };

      await expect(retryExecutor.execute(request)).rejects.toThrow('Unexpected error: Unknown error');
    });

    it('should preserve GoveeApiClientError instances', async () => {
      const goveeError = new RateLimitError('Rate limited');
      const executeFn = vi.fn().mockRejectedValue(goveeError);

      const request: RetryableRequest<any> = {
        id: 'test-preserve-error',
        execute: executeFn,
        description: 'Test error preservation',
      };

      await expect(retryExecutor.execute(request)).rejects.toThrow(RateLimitError);
    });

    it('should handle non-Error objects', async () => {
      const unknownObject = { message: 'Something went wrong' };
      const executeFn = vi.fn().mockRejectedValue(unknownObject);

      const request: RetryableRequest<any> = {
        id: 'test-non-error',
        execute: executeFn,
        description: 'Test non-error object',
      };

      await expect(retryExecutor.execute(request)).rejects.toThrow('Unknown error occurred');
    });
  });

  describe('logging', () => {
    it('should log request lifecycle events', async () => {
      const mockData = { result: 'success' };
      const request: RetryableRequest<typeof mockData> = {
        id: 'test-logging',
        execute: vi.fn().mockResolvedValue(mockData),
        description: 'Test logging',
        context: { operation: 'test' },
      };

      await retryExecutor.execute(request);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-logging',
          description: 'Test logging',
          context: { operation: 'test' },
        }),
        'Starting retryable request'
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-logging',
          attemptNumber: 1,
        }),
        'Request attempt succeeded'
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-logging',
          totalAttempts: 1,
          retriesNeeded: 0,
        }),
        'Retryable request completed successfully'
      );
    });

    it('should log retry attempts', async () => {
      const retryableError = new RateLimitError('Rate limited', 1);
      const executeFn = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce({ success: true });

      const request: RetryableRequest<any> = {
        id: 'test-retry-logging',
        execute: executeFn,
        description: 'Test retry logging',
      };

      await retryExecutor.execute(request);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-retry-logging',
          attemptNumber: 1,
          error: expect.objectContaining({
            name: 'RateLimitError',
          }),
        }),
        'Request attempt failed, will retry'
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-retry-logging',
          attemptNumber: 2,
          delayMs: 1000, // Rate limit retry-after converted to ms
        }),
        'Waiting before retry attempt'
      );
    });

    it('should log final failure', async () => {
      const error = new NetworkError('Connection failed', 'connection');
      const executeFn = vi.fn().mockRejectedValue(error);

      const request: RetryableRequest<any> = {
        id: 'test-failure-logging',
        execute: executeFn,
        description: 'Test failure logging',
      };

      await expect(retryExecutor.execute(request)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-failure-logging',
          totalAttempts: 3,
          finalError: expect.objectContaining({
            name: 'NetworkError',
          }),
        }),
        'Retryable request failed after all attempts'
      );
    });
  });

  describe('metrics integration', () => {
    it('should update retry policy metrics', async () => {
      const mockData = { result: 'success' };
      const request: RetryableRequest<typeof mockData> = {
        id: 'test-metrics',
        execute: vi.fn().mockResolvedValue(mockData),
        description: 'Test metrics',
      };

      const initialMetrics = retryExecutor.getMetrics();
      expect(initialMetrics.totalAttempts).toBe(0);

      await retryExecutor.execute(request);

      const finalMetrics = retryExecutor.getMetrics();
      expect(finalMetrics.totalAttempts).toBe(1);
      expect(finalMetrics.successfulRetries).toBe(1);
    });

    it('should reset metrics', () => {
      const initialMetrics = retryExecutor.getMetrics();
      
      // Simulate some activity
      retryPolicy.recordSuccess();
      retryPolicy.recordFailure(new RateLimitError('Test'));
      
      const afterActivity = retryExecutor.getMetrics();
      expect(afterActivity.totalAttempts).toBeGreaterThan(initialMetrics.totalAttempts);
      
      retryExecutor.resetMetrics();
      
      const afterReset = retryExecutor.getMetrics();
      expect(afterReset.totalAttempts).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should disable request logging when configured', async () => {
      const noLoggingExecutor = new RetryExecutor(retryPolicy, {
        logger: mockLogger,
        enableRequestLogging: false,
      });

      const request: RetryableRequest<any> = {
        id: 'test-no-logging',
        execute: vi.fn().mockResolvedValue({ result: 'success' }),
        description: 'Test no logging',
      };

      await noLoggingExecutor.execute(request);

      // Should not log request lifecycle events
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'test-no-logging' }),
        'Starting retryable request'
      );
    });

    it('should work without logger', async () => {
      const noLoggerExecutor = new RetryExecutor(retryPolicy);

      const request: RetryableRequest<any> = {
        id: 'test-no-logger',
        execute: vi.fn().mockResolvedValue({ result: 'success' }),
        description: 'Test no logger',
      };

      const result = await noLoggerExecutor.execute(request);
      expect(result).toEqual({ result: 'success' });
    });
  });
});

describe('RetryExecutorFactory', () => {
  it('should create Govee API optimized executor', () => {
    const executor = RetryExecutorFactory.createForGoveeApi();
    
    expect(executor).toBeInstanceOf(RetryExecutor);
    expect(executor.getMetrics()).toBeDefined();
  });

  it('should create conservative executor', () => {
    const executor = RetryExecutorFactory.createConservative();
    
    expect(executor).toBeInstanceOf(RetryExecutor);
    expect(executor.getMetrics()).toBeDefined();
  });

  it('should create aggressive executor', () => {
    const executor = RetryExecutorFactory.createAggressive();
    
    expect(executor).toBeInstanceOf(RetryExecutor);
    expect(executor.getMetrics()).toBeDefined();
  });

  it('should create custom executor with provided policy', () => {
    const customPolicy = new RetryPolicy({
      backoff: { type: 'fixed', initialDelayMs: 500, maxDelayMs: 500 },
      jitter: { type: 'none' },
      condition: {
        maxAttempts: 2,
        maxTotalTimeMs: 10000,
        retryableStatusCodes: [429],
        retryableErrorTypes: [RateLimitError],
      },
    });

    const executor = RetryExecutorFactory.createCustom(customPolicy);
    
    expect(executor).toBeInstanceOf(RetryExecutor);
    expect(executor.getMetrics()).toBeDefined();
  });
});
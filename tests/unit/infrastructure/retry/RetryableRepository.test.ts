import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryableRepository } from '../../../../src/infrastructure/retry/RetryableRepository';
import { RetryExecutor } from '../../../../src/infrastructure/retry/RetryableRequest';
import { RetryPolicy } from '../../../../src/infrastructure/retry/RetryPolicy';
import { IGoveeDeviceRepository } from '../../../../src/domain/repositories/IGoveeDeviceRepository';
import { GoveeDevice } from '../../../../src/domain/entities/GoveeDevice';
import { DeviceState, PowerState } from '../../../../src/domain/entities/DeviceState';
import { Command, CommandFactory } from '../../../../src/domain/entities/Command';
import { Brightness } from '../../../../src/domain/value-objects';
import { RateLimitError, NetworkError } from '../../../../src/errors';
import pino from 'pino';

describe('RetryableRepository', () => {
  let mockRepository: IGoveeDeviceRepository;
  let mockLogger: ReturnType<typeof pino>;
  let retryPolicy: RetryPolicy;
  let retryExecutor: RetryExecutor;
  let retryableRepository: RetryableRepository;

  // Mock data
  const mockDevices = [
    new GoveeDevice('device1', 'H6160', 'Test Light 1', [
      { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
      { type: 'devices.capabilities.range', instance: 'brightness' },
    ]),
    new GoveeDevice('device2', 'H6163', 'Test Light 2', [
      { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
      { type: 'devices.capabilities.color_setting', instance: 'colorRgb' },
    ]),
  ];

  const mockDeviceState = new DeviceState('device1', 'H6160', true, {
    powerSwitch: { value: 'on' } as PowerState,
    brightness: { value: new Brightness(80) },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any;

    // Mock repository
    mockRepository = {
      findAll: vi.fn(),
      findState: vi.fn(),
      sendCommand: vi.fn(),
    };

    // Create retry components with short delays for testing
    retryPolicy = new RetryPolicy({
      backoff: {
        type: 'fixed',
        initialDelayMs: 10, // Very short for tests
        maxDelayMs: 10,
      },
      jitter: { type: 'none' },
      condition: {
        maxAttempts: 3,
        maxTotalTimeMs: 5000,
        retryableStatusCodes: [429, 502, 503, 504],
        retryableErrorTypes: [RateLimitError, NetworkError],
      },
      enableMetrics: true,
    });

    retryExecutor = new RetryExecutor(retryPolicy, {
      logger: mockLogger,
      enableRequestLogging: true,
    });

    retryableRepository = new RetryableRepository({
      repository: mockRepository,
      retryExecutor,
      logger: mockLogger,
      enableRequestIds: true,
    });
  });

  describe('constructor', () => {
    it('should create with minimal configuration', () => {
      const minimalRepo = new RetryableRepository({
        repository: mockRepository,
      });

      expect(minimalRepo).toBeDefined();
      expect(minimalRepo.getUnderlyingRepository()).toBe(mockRepository);
    });

    it('should use default retry executor when not provided', () => {
      const repoWithDefaults = new RetryableRepository({
        repository: mockRepository,
        logger: mockLogger,
      });

      expect(repoWithDefaults).toBeDefined();
      expect(repoWithDefaults.getRetryMetrics()).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should successfully retrieve all devices', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockDevices);

      const result = await retryableRepository.findAll();

      expect(result).toEqual(mockDevices);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors and eventually succeed', async () => {
      const retryableError = new RateLimitError('Rate limited', 1);
      
      vi.mocked(mockRepository.findAll)
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(mockDevices);

      const result = await retryableRepository.findAll();

      expect(result).toEqual(mockDevices);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const retryableError = new NetworkError('Connection failed', 'connection');
      vi.mocked(mockRepository.findAll).mockRejectedValue(retryableError);

      await expect(retryableRepository.findAll()).rejects.toThrow(NetworkError);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(3); // maxAttempts
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = new Error('Invalid API key');
      vi.mocked(mockRepository.findAll).mockRejectedValue(nonRetryableError);

      await expect(retryableRepository.findAll()).rejects.toThrow();
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findState', () => {
    it('should successfully retrieve device state', async () => {
      vi.mocked(mockRepository.findState).mockResolvedValue(mockDeviceState);

      const result = await retryableRepository.findState('device1', 'H6160');

      expect(result).toEqual(mockDeviceState);
      expect(mockRepository.findState).toHaveBeenCalledWith('device1', 'H6160');
      expect(mockRepository.findState).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const networkError = new NetworkError('Timeout', 'timeout');
      
      vi.mocked(mockRepository.findState)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockDeviceState);

      const result = await retryableRepository.findState('device1', 'H6160');

      expect(result).toEqual(mockDeviceState);
      expect(mockRepository.findState).toHaveBeenCalledTimes(2);
    });

    it('should respect rate limits with appropriate delays', async () => {
      const rateLimitError = new RateLimitError('Rate limited', 1); // 1 second retry-after
      
      vi.mocked(mockRepository.findState)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(mockDeviceState);

      const startTime = Date.now();
      const result = await retryableRepository.findState('device1', 'H6160');
      const endTime = Date.now();

      expect(result).toEqual(mockDeviceState);
      expect(mockRepository.findState).toHaveBeenCalledTimes(2);
      
      // Should have waited at least the retry-after time (1000ms)
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('sendCommand', () => {
    const testCommand = CommandFactory.brightness(new Brightness(75));

    it('should successfully send command', async () => {
      vi.mocked(mockRepository.sendCommand).mockResolvedValue();

      await retryableRepository.sendCommand('device1', 'H6160', testCommand);

      expect(mockRepository.sendCommand).toHaveBeenCalledWith('device1', 'H6160', testCommand);
      expect(mockRepository.sendCommand).toHaveBeenCalledTimes(1);
    });

    it('should retry failed commands', async () => {
      const serverError = new NetworkError('Server error', 'connection');
      
      vi.mocked(mockRepository.sendCommand)
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce();

      await retryableRepository.sendCommand('device1', 'H6160', testCommand);

      expect(mockRepository.sendCommand).toHaveBeenCalledTimes(3);
    });

    it('should handle command execution failures', async () => {
      const persistentError = new NetworkError('Persistent failure', 'connection');
      vi.mocked(mockRepository.sendCommand).mockRejectedValue(persistentError);

      await expect(
        retryableRepository.sendCommand('device1', 'H6160', testCommand)
      ).rejects.toThrow(NetworkError);
      
      expect(mockRepository.sendCommand).toHaveBeenCalledTimes(3);
    });
  });

  describe('detailed retry results', () => {
    it('should provide detailed retry information for findAll', async () => {
      const retryableError = new RateLimitError('Rate limited', 1);
      
      vi.mocked(mockRepository.findAll)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(mockDevices);

      const result = await retryableRepository.findAllWithRetryResult();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDevices);
      expect(result.totalAttempts).toBe(2);
      expect(result.attempts).toHaveLength(2);
      expect(result.attempts[0].success).toBe(false);
      expect(result.attempts[0].error).toBeInstanceOf(RateLimitError);
      expect(result.attempts[1].success).toBe(true);
      expect(result.attempts[1].error).toBeUndefined();
    });

    it('should provide detailed retry information for findState', async () => {
      const networkError = new NetworkError('Connection failed', 'connection');
      
      vi.mocked(mockRepository.findState)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockDeviceState);

      const result = await retryableRepository.findStateWithRetryResult('device1', 'H6160');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDeviceState);
      expect(result.totalAttempts).toBe(2);
      expect(result.attempts[0].error).toBeInstanceOf(NetworkError);
      expect(result.attempts[1].success).toBe(true);
    });

    it('should provide detailed retry information for sendCommand', async () => {
      const command = CommandFactory.powerOn();
      const serverError = new NetworkError('Server error', 'connection');
      
      vi.mocked(mockRepository.sendCommand)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce();

      const result = await retryableRepository.sendCommandWithRetryResult('device1', 'H6160', command);

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(2);
      expect(result.attempts[0].error).toBeInstanceOf(NetworkError);
      expect(result.attempts[1].success).toBe(true);
    });

    it('should provide failure details when all attempts fail', async () => {
      const persistentError = new NetworkError('Persistent failure', 'connection');
      vi.mocked(mockRepository.findAll).mockRejectedValue(persistentError);

      const result = await retryableRepository.findAllWithRetryResult();

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(NetworkError);
      expect(result.totalAttempts).toBe(3);
      expect(result.attempts.every(attempt => !attempt.success)).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe('request ID generation', () => {
    it('should generate unique request IDs when enabled', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockDevices);

      // Make multiple calls
      await retryableRepository.findAll();
      await retryableRepository.findAll();

      // Verify that requests were made (exact request ID verification would require
      // mocking the internal request generation, which isn't easily accessible)
      expect(mockRepository.findAll).toHaveBeenCalledTimes(2);
    });

    it('should work with request IDs disabled', async () => {
      const repoWithoutIds = new RetryableRepository({
        repository: mockRepository,
        retryExecutor,
        enableRequestIds: false,
      });

      vi.mocked(mockRepository.findAll).mockResolvedValue(mockDevices);

      const result = await repoWithoutIds.findAll();
      expect(result).toEqual(mockDevices);
    });
  });

  describe('metrics', () => {
    it('should track retry metrics', async () => {
      const retryableError = new RateLimitError('Rate limited', 1);
      
      vi.mocked(mockRepository.findAll)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(mockDevices);

      const initialMetrics = retryableRepository.getRetryMetrics();
      expect(initialMetrics.totalAttempts).toBe(0);

      await retryableRepository.findAll();

      const finalMetrics = retryableRepository.getRetryMetrics();
      expect(finalMetrics.totalAttempts).toBeGreaterThan(initialMetrics.totalAttempts);
      expect(finalMetrics.successfulRetries).toBeGreaterThan(0);
    });

    it('should reset metrics', async () => {
      const retryableError = new RateLimitError('Rate limited', 1);
      
      vi.mocked(mockRepository.findAll)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(mockDevices);

      await retryableRepository.findAll();

      const beforeReset = retryableRepository.getRetryMetrics();
      expect(beforeReset.totalAttempts).toBeGreaterThan(0);

      retryableRepository.resetRetryMetrics();

      const afterReset = retryableRepository.getRetryMetrics();
      expect(afterReset.totalAttempts).toBe(0);
    });
  });

  describe('context information', () => {
    it('should include operation context in requests', async () => {
      vi.mocked(mockRepository.findState).mockResolvedValue(mockDeviceState);

      await retryableRepository.findState('device1', 'H6160');

      // Verify the request was made with proper context
      // (This would be more thoroughly tested with the actual retry executor,
      // but we can at least verify the repository method was called correctly)
      expect(mockRepository.findState).toHaveBeenCalledWith('device1', 'H6160');
    });

    it('should include command details in sendCommand context', async () => {
      const command = CommandFactory.brightness(new Brightness(50));
      vi.mocked(mockRepository.sendCommand).mockResolvedValue();

      await retryableRepository.sendCommand('device1', 'H6160', command);

      expect(mockRepository.sendCommand).toHaveBeenCalledWith('device1', 'H6160', command);
    });
  });

  describe('underlying repository access', () => {
    it('should provide access to underlying repository', () => {
      const underlyingRepo = retryableRepository.getUnderlyingRepository();
      expect(underlyingRepo).toBe(mockRepository);
    });

    it('should maintain repository interface compatibility', () => {
      // RetryableRepository should implement all IGoveeDeviceRepository methods
      expect(typeof retryableRepository.findAll).toBe('function');
      expect(typeof retryableRepository.findState).toBe('function');  
      expect(typeof retryableRepository.sendCommand).toBe('function');
    });
  });

  describe('error propagation', () => {
    it('should properly propagate final errors after retries', async () => {
      const originalError = new NetworkError('Original connection error', 'connection');
      vi.mocked(mockRepository.findAll).mockRejectedValue(originalError);

      let caughtError: Error | undefined;
      try {
        await retryableRepository.findAll();
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError).toBeInstanceOf(NetworkError);
      expect(caughtError?.message).toBe('Original connection error');
    });

    it('should maintain error properties through retries', async () => {
      const rateLimitError = new RateLimitError('Rate limited', 1, 100, 5); // 1 second retry-after
      vi.mocked(mockRepository.findState).mockRejectedValue(rateLimitError);

      let caughtError: RateLimitError | undefined;
      try {
        await retryableRepository.findState('device1', 'H6160');
      } catch (error) {
        caughtError = error as RateLimitError;
      }

      expect(caughtError).toBeInstanceOf(RateLimitError);
      expect(caughtError?.retryAfter).toBe(1);
      expect(caughtError?.limit).toBe(100);
      expect(caughtError?.remaining).toBe(5);
    });
  });
});
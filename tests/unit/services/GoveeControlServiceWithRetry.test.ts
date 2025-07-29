import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoveeControlService } from '../../../src/services/GoveeControlService';
import { IGoveeDeviceRepository } from '../../../src/domain/repositories/IGoveeDeviceRepository';
import { GoveeDevice } from '../../../src/domain/entities/GoveeDevice';
import { DeviceState, PowerState } from '../../../src/domain/entities/DeviceState';
import { CommandFactory } from '../../../src/domain/entities/Command';
import { Brightness } from '../../../src/domain/value-objects';
import { RetryableRepository } from '../../../src/infrastructure/retry/RetryableRepository';
import { RetryPolicy } from '../../../src/infrastructure/retry/RetryPolicy';
import { RateLimitError, NetworkError, GoveeApiError } from '../../../src/errors';
import pino from 'pino';

describe('GoveeControlService with Retry Integration', () => {
  let mockRepository: IGoveeDeviceRepository;
  let mockLogger: ReturnType<typeof pino>;

  const mockDevices = [
    new GoveeDevice('device1', 'H6160', 'Test Light 1', [
      { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
      { type: 'devices.capabilities.range', instance: 'brightness' },
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

    mockRepository = {
      findAll: vi.fn(),
      findState: vi.fn(),
      sendCommand: vi.fn(),
    };
  });

  describe('service configuration', () => {
    it('should create service without retry functionality by default', () => {
      const service = new GoveeControlService({
        repository: mockRepository,
        logger: mockLogger,
      });

      expect(service.isRetryEnabled()).toBe(false);
      expect(service.getRetryMetrics()).toBeNull();
    });

    it('should create service with retry functionality when enabled', () => {
      const service = new GoveeControlService({
        repository: mockRepository,
        enableRetries: true,
        retryPolicy: 'development',
        logger: mockLogger,
      });

      expect(service.isRetryEnabled()).toBe(true);
      expect(service.getRetryMetrics()).not.toBeNull();
    });

    it('should create service with production retry policy by default', () => {
      const service = new GoveeControlService({
        repository: mockRepository,
        enableRetries: true,
        logger: mockLogger,
      });

      expect(service.isRetryEnabled()).toBe(true);
      const stats = service.getServiceStats();
      expect(stats.configuration.enableRetries).toBe(true);
      expect(stats.retries).not.toBeNull();
    });

    it('should create service with custom retry policy', () => {
      const customPolicy = new RetryPolicy({
        backoff: { type: 'fixed', initialDelayMs: 500, maxDelayMs: 500 },
        jitter: { type: 'none' },
        condition: {
          maxAttempts: 2,
          maxTotalTimeMs: 10000,
          retryableStatusCodes: [429],
          retryableErrorTypes: [RateLimitError],
        },
        enableMetrics: true,
      });

      const service = new GoveeControlService({
        repository: mockRepository,
        enableRetries: true,
        retryPolicy: customPolicy,
        logger: mockLogger,
      });

      expect(service.isRetryEnabled()).toBe(true);
      expect(service.getRetryMetrics()).not.toBeNull();
    });

    it('should create service with different preset policies', () => {
      const presets = ['development', 'testing', 'production', 'custom'] as const;

      for (const preset of presets) {
        const service = new GoveeControlService({
          repository: mockRepository,
          enableRetries: true,
          retryPolicy: preset,
          logger: mockLogger,
        });

        expect(service.isRetryEnabled()).toBe(true);
        expect(service.getRetryMetrics()).not.toBeNull();
      }
    });
  });

  describe('retry functionality', () => {
    let serviceWithRetries: GoveeControlService;

    beforeEach(() => {
      serviceWithRetries = new GoveeControlService({
        repository: mockRepository,
        enableRetries: true,
        retryPolicy: new RetryPolicy({
          backoff: {
            type: 'fixed',
            initialDelayMs: 10, // Very short delay for tests
            maxDelayMs: 10,
          },
          jitter: { type: 'none' },
          condition: {
            maxAttempts: 3,
            maxTotalTimeMs: 5000, // 5 seconds total
            retryableStatusCodes: [429, 502, 503, 504],
            retryableErrorTypes: [RateLimitError, NetworkError, GoveeApiError],
          },
          enableMetrics: true,
        }),
        logger: mockLogger,
      });
    });

    it('should retry failed operations and eventually succeed', async () => {
      const retryableError = new NetworkError('Connection failed', 'connection');
      
      // Make sure findAll is properly mocked to fail twice then succeed
      const findAllSpy = vi.mocked(mockRepository.findAll);
      findAllSpy.mockClear();
      findAllSpy
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(mockDevices);

      const devices = await serviceWithRetries.getDevices();

      expect(devices).toEqual(mockDevices);
      expect(findAllSpy).toHaveBeenCalledTimes(3);

      // Check retry metrics
      const retryMetrics = serviceWithRetries.getRetryMetrics();
      expect(retryMetrics).not.toBeNull();
      expect(retryMetrics!.totalAttempts).toBeGreaterThan(1);
    });

    it('should retry device state operations', async () => {
      const networkError = new NetworkError('Connection failed', 'connection');
      
      vi.mocked(mockRepository.findState)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockDeviceState);

      const state = await serviceWithRetries.getDeviceState('device1', 'H6160');

      expect(state).toEqual(mockDeviceState);
      expect(mockRepository.findState).toHaveBeenCalledTimes(2);
    });

    it('should retry command operations', async () => {
      const serverError = new NetworkError('Server error', 'connection');
      
      vi.mocked(mockRepository.sendCommand)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce(undefined);

      const command = CommandFactory.brightness(new Brightness(75));
      await serviceWithRetries.sendCommand('device1', 'H6160', command);

      expect(mockRepository.sendCommand).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries are exceeded', async () => {
      const persistentError = new NetworkError('Persistent failure', 'connection');
      vi.mocked(mockRepository.findAll).mockRejectedValue(persistentError);

      await expect(serviceWithRetries.getDevices()).rejects.toThrow('Persistent failure');

      const retryMetrics = serviceWithRetries.getRetryMetrics();
      expect(retryMetrics!.failedRetries).toBeGreaterThan(0);
    });
  });

  describe('service without retry functionality', () => {
    let serviceWithoutRetries: GoveeControlService;

    beforeEach(() => {
      serviceWithoutRetries = new GoveeControlService({
        repository: mockRepository,
        enableRetries: false,
        logger: mockLogger,
      });
    });

    it('should not retry failed operations', async () => {
      const error = new RateLimitError('Rate limited', 60);
      vi.mocked(mockRepository.findAll).mockRejectedValue(error);

      await expect(serviceWithoutRetries.getDevices()).rejects.toThrow('Rate limited');

      // Should only have made one attempt
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
      expect(serviceWithoutRetries.getRetryMetrics()).toBeNull();
    });

    it('should return null for retry metrics', () => {
      expect(serviceWithoutRetries.getRetryMetrics()).toBeNull();
    });

    it('should handle reset retry metrics gracefully', () => {
      expect(() => serviceWithoutRetries.resetRetryMetrics()).not.toThrow();
    });
  });

  describe('metrics and monitoring', () => {
    let serviceWithRetries: GoveeControlService;

    beforeEach(() => {
      serviceWithRetries = new GoveeControlService({
        repository: mockRepository,
        enableRetries: true,
        retryPolicy: 'development',
        logger: mockLogger,
      });
    });

    it('should provide comprehensive service statistics', () => {
      const stats = serviceWithRetries.getServiceStats();

      expect(stats).toHaveProperty('rateLimiter');
      expect(stats).toHaveProperty('retries');
      expect(stats).toHaveProperty('configuration');
      
      expect(stats.configuration.enableRetries).toBe(true);
      expect(stats.retries).not.toBeNull();
    });

    it('should track retry metrics correctly', async () => {
      const error = new RateLimitError('Rate limited', 1);
      
      vi.mocked(mockRepository.findAll)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockDevices);

      const initialMetrics = serviceWithRetries.getRetryMetrics();
      expect(initialMetrics!.totalAttempts).toBe(0);

      await serviceWithRetries.getDevices();

      const finalMetrics = serviceWithRetries.getRetryMetrics();
      expect(finalMetrics!.totalAttempts).toBeGreaterThan(initialMetrics!.totalAttempts);
    });

    it('should reset retry metrics', async () => {
      // Generate some metrics
      const error = new RateLimitError('Rate limited', 1);
      vi.mocked(mockRepository.findAll)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockDevices);

      await serviceWithRetries.getDevices();

      const beforeReset = serviceWithRetries.getRetryMetrics();
      expect(beforeReset!.totalAttempts).toBeGreaterThan(0);

      serviceWithRetries.resetRetryMetrics();

      const afterReset = serviceWithRetries.getRetryMetrics();
      expect(afterReset!.totalAttempts).toBe(0);
    });

    it('should provide service stats for monitoring', () => {
      const stats = serviceWithRetries.getServiceStats();

      expect(stats.rateLimiter).toHaveProperty('currentRequests');
      expect(stats.rateLimiter).toHaveProperty('maxRequests');
      expect(stats.retries).toHaveProperty('totalAttempts');
      expect(stats.retries).toHaveProperty('successfulRetries');
      expect(stats.retries).toHaveProperty('failedRetries');
      expect(stats.configuration).toHaveProperty('enableRetries');
      expect(stats.configuration).toHaveProperty('rateLimit');
    });
  });

  describe('backward compatibility', () => {
    it('should maintain existing API when retries are disabled', async () => {
      const service = new GoveeControlService({
        repository: mockRepository,
        rateLimit: 100,
        logger: mockLogger,
      });

      vi.mocked(mockRepository.findAll).mockResolvedValue(mockDevices);
      vi.mocked(mockRepository.findState).mockResolvedValue(mockDeviceState);
      vi.mocked(mockRepository.sendCommand).mockResolvedValue();

      // All existing methods should work exactly as before
      const devices = await service.getDevices();
      expect(devices).toEqual(mockDevices);

      const state = await service.getDeviceState('device1', 'H6160');
      expect(state).toEqual(mockDeviceState);

      const command = CommandFactory.powerOn();
      await service.sendCommand('device1', 'H6160', command);

      const rateLimiterStats = service.getRateLimiterStats();
      expect(rateLimiterStats).toBeDefined();

      // New retry methods should return appropriate defaults
      expect(service.isRetryEnabled()).toBe(false);
      expect(service.getRetryMetrics()).toBeNull();
    });

    it('should work with existing rate limiter configuration', () => {
      const service = new GoveeControlService({
        repository: mockRepository,
        rateLimit: 50,
        rateLimiterConfig: {
          burstCapacity: 10,
          refillRate: 1,
        },
        enableRetries: true,
        retryPolicy: 'production',
        logger: mockLogger,
      });

      const stats = service.getServiceStats();
      expect(stats.rateLimiter.maxRequests).toBe(50);
      expect(stats.configuration.enableRetries).toBe(true);
    });
  });

  describe('integration with convenience methods', () => {
    let serviceWithRetries: GoveeControlService;

    beforeEach(() => {
      serviceWithRetries = new GoveeControlService({
        repository: mockRepository,
        enableRetries: true,
        retryPolicy: new RetryPolicy({
          backoff: {
            type: 'fixed',
            initialDelayMs: 10,
            maxDelayMs: 10,
          },
          jitter: { type: 'none' },
          condition: {
            maxAttempts: 3,
            maxTotalTimeMs: 5000,
            retryableStatusCodes: [429, 502, 503, 504],
            retryableErrorTypes: [RateLimitError, NetworkError, GoveeApiError],
          },
          enableMetrics: true,
        }),
        logger: mockLogger,
      });
    });

    it('should retry convenience methods', async () => {
      const error = new NetworkError('Connection failed', 'connection');
      
      vi.mocked(mockRepository.sendCommand)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined);

      await serviceWithRetries.turnOn('device1', 'H6160');

      expect(mockRepository.sendCommand).toHaveBeenCalledTimes(2);
    });

    it('should retry brightness setting', async () => {
      const error = new NetworkError('Connection failed', 'connection');
      
      vi.mocked(mockRepository.sendCommand)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined);

      const brightness = new Brightness(75);
      await serviceWithRetries.setBrightness('device1', 'H6160', brightness);

      expect(mockRepository.sendCommand).toHaveBeenCalledTimes(2);
    });

    it('should retry device search operations', async () => {
      const error = new NetworkError('Timeout', 'timeout');
      
      vi.mocked(mockRepository.findAll)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockDevices);

      const devices = await serviceWithRetries.getControllableDevices();

      expect(devices).toHaveLength(1);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(2);
    });

    it('should retry device state checks', async () => {
      const error = new NetworkError('Connection failed', 'connection');
      
      vi.mocked(mockRepository.findState)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockDeviceState);

      const isOnline = await serviceWithRetries.isDeviceOnline('device1', 'H6160');

      expect(isOnline).toBe(true);
      expect(mockRepository.findState).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling with retries', () => {
    let serviceWithRetries: GoveeControlService;

    beforeEach(() => {
      serviceWithRetries = new GoveeControlService({
        repository: mockRepository,
        enableRetries: true,
        retryPolicy: new RetryPolicy({
          backoff: {
            type: 'fixed',
            initialDelayMs: 10,
            maxDelayMs: 10,
          },
          jitter: { type: 'none' },
          condition: {
            maxAttempts: 3,
            maxTotalTimeMs: 5000,
            retryableStatusCodes: [429, 502, 503, 504],
            retryableErrorTypes: [RateLimitError, NetworkError, GoveeApiError],
          },
          enableMetrics: true,
        }),
        logger: mockLogger,
      });
    });

    it('should propagate final error after all retries fail', async () => {
      const persistentError = new NetworkError('Persistent connection failure', 'connection');
      vi.mocked(mockRepository.findAll).mockRejectedValue(persistentError);

      let caughtError: Error | undefined;
      try {
        await serviceWithRetries.getDevices();
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError).toBeInstanceOf(NetworkError);
      expect(caughtError?.message).toBe('Persistent connection failure');
    });

    it('should maintain error properties through retries', async () => {
      const customError = new GoveeApiError('Device offline', 400, 400, 'Device is offline');
      vi.mocked(mockRepository.findState).mockRejectedValue(customError);

      let caughtError: GoveeApiError | undefined;
      try {
        await serviceWithRetries.getDeviceState('device1', 'H6160');
      } catch (error) {
        caughtError = error as GoveeApiError;
      }

      expect(caughtError).toBeInstanceOf(GoveeApiError);
      expect(caughtError?.statusCode).toBe(400);
      expect(caughtError?.apiErrorCode).toBe(400);
      expect(caughtError?.apiMessage).toBe('Device is offline');
    });
  });
});
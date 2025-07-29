import { describe, test, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { Logger } from 'pino';
import { GoveeControlService, GoveeControlServiceConfig } from '../../../src/services/GoveeControlService';
import { IGoveeDeviceRepository } from '../../../src/domain/repositories/IGoveeDeviceRepository';
import { GoveeDevice } from '../../../src/domain/entities/GoveeDevice';
import { DeviceState } from '../../../src/domain/entities/DeviceState';
import { Command, CommandFactory } from '../../../src/domain/entities/Command';
import { Brightness, ColorRgb, ColorTemperature } from '../../../src/domain/value-objects';

describe('GoveeControlService with SlidingWindowRateLimiter', () => {
  let mockRepository: jest.Mocked<IGoveeDeviceRepository>;
  let mockLogger: Logger;
  let service: GoveeControlService;

  const mockDevice = new GoveeDevice(
    'device1',
    'model1',
    'Test Device',
    [
      { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
      { type: 'devices.capabilities.range', instance: 'brightness' },
      { type: 'devices.capabilities.color_setting', instance: 'colorRgb' },
      { type: 'devices.capabilities.color_setting', instance: 'colorTemperatureK' }
    ]
  );

  const mockDeviceState = new DeviceState(
    'device1',
    'model1', 
    true,
    {
      'powerSwitch': { value: 'on' as const },
      'brightness': { value: new Brightness(80) },
      'colorRgb': { value: new ColorRgb(255, 255, 255) },
      'colorTemperatureK': { value: new ColorTemperature(2700) }
    }
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockRepository = {
      findAll: vi.fn(),
      findState: vi.fn(),
      sendCommand: vi.fn(),
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    test('should initialize with default Govee API rate limiter', () => {
      const config: GoveeControlServiceConfig = {
        repository: mockRepository,
        logger: mockLogger,
      };

      service = new GoveeControlService(config);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestsPerMinute: 95,
          rateLimiterType: 'SlidingWindow',
          stats: expect.objectContaining({
            maxRequests: 95,
            windowMs: 60000,
          }),
        }),
        'Initialized GoveeControlService with sliding window rate limiting'
      );
    });

    test('should initialize with custom rate limit', () => {
      const config: GoveeControlServiceConfig = {
        repository: mockRepository,
        rateLimit: 50,
        logger: mockLogger,
      };

      service = new GoveeControlService(config);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestsPerMinute: 50,
          rateLimiterType: 'SlidingWindow',
          stats: expect.objectContaining({
            maxRequests: 50,
            windowMs: 60000,
          }),
        }),
        'Initialized GoveeControlService with sliding window rate limiting'
      );
    });

    test('should initialize with custom rate limiter configuration', () => {
      const config: GoveeControlServiceConfig = {
        repository: mockRepository,
        rateLimit: 30,
        rateLimiterConfig: {
          maxQueueSize: 500,
        },
        logger: mockLogger,
      };

      service = new GoveeControlService(config);

      const stats = service.getRateLimiterStats();
      expect(stats.maxRequests).toBe(30);
    });
  });

  describe('Rate Limiting Behavior', () => {
    beforeEach(() => {
      // Use very low limits for testing
      service = new GoveeControlService({
        repository: mockRepository,
        rateLimit: 2, // 2 requests per minute
        logger: mockLogger,
      });

      mockRepository.findAll.mockResolvedValue([mockDevice]);
      mockRepository.findState.mockResolvedValue(mockDeviceState);
      mockRepository.sendCommand.mockResolvedValue(undefined);
    });

    test('should allow requests within rate limit', async () => {
      const promise1 = service.getDevices();
      const promise2 = service.getDeviceState('device1', 'model1');

      const [devices, state] = await Promise.all([promise1, promise2]);

      expect(devices).toEqual([mockDevice]);
      expect(state).toBe(mockDeviceState);
      expect(mockRepository.findAll).toHaveBeenCalledOnce();
      expect(mockRepository.findState).toHaveBeenCalledOnce();
    });

    test('should queue requests exceeding rate limit', async () => {
      // Start 3 requests (1 over the limit of 2)
      const promise1 = service.getDevices();
      const promise2 = service.getDeviceState('device1', 'model1');
      const promise3 = service.sendCommand('device1', 'model1', CommandFactory.powerOn());

      // Check that one request is queued
      await vi.advanceTimersByTimeAsync(50);
      const stats = service.getRateLimiterStats();
      expect(stats.queueSize).toBe(1);
      expect(stats.currentRequests).toBe(2);

      // Advance time to allow queue processing
      await vi.advanceTimersByTimeAsync(60000);

      await Promise.all([promise1, promise2, promise3]);

      expect(mockRepository.findAll).toHaveBeenCalledOnce();
      expect(mockRepository.findState).toHaveBeenCalledOnce();
      expect(mockRepository.sendCommand).toHaveBeenCalledOnce();
    });

    test('should handle burst requests correctly', async () => {
      const mockFn = vi.fn().mockResolvedValue([mockDevice]);
      mockRepository.findAll = mockFn;

      // Send 5 requests simultaneously
      const promises = Array.from({ length: 5 }, () => service.getDevices());

      await vi.advanceTimersByTimeAsync(100);

      const stats = service.getRateLimiterStats();
      expect(stats.currentRequests).toBe(2); // Rate limit
      expect(stats.queueSize).toBe(3); // Remaining queued

      // Process queue over time
      await vi.advanceTimersByTimeAsync(180000); // 3 minutes to handle all requests
      await Promise.all(promises);

      expect(mockFn).toHaveBeenCalledTimes(5);
    });
  });

  describe('Service Method Rate Limiting', () => {
    beforeEach(() => {
      service = new GoveeControlService({
        repository: mockRepository,
        rateLimit: 10,
        logger: mockLogger,
      });

      mockRepository.findAll.mockResolvedValue([mockDevice]);
      mockRepository.findState.mockResolvedValue(mockDeviceState);
      mockRepository.sendCommand.mockResolvedValue(undefined);
    });

    test('should rate limit getDevices calls', async () => {
      const results = await Promise.all([
        service.getDevices(),
        service.getDevices(),
        service.getDevices(),
      ]);

      expect(results).toHaveLength(3);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(3);
    });

    test('should rate limit getDeviceState calls', async () => {
      const results = await Promise.all([
        service.getDeviceState('device1', 'model1'),
        service.getDeviceState('device2', 'model2'),
        service.getDeviceState('device3', 'model3'),
      ]);

      expect(results).toHaveLength(3);
      expect(mockRepository.findState).toHaveBeenCalledTimes(3);
    });

    test('should rate limit sendCommand calls', async () => {
      const commands = [
        CommandFactory.powerOn(),
        CommandFactory.powerOff(),
        CommandFactory.brightness(new Brightness(50)),
      ];

      await Promise.all([
        service.sendCommand('device1', 'model1', commands[0]),
        service.sendCommand('device1', 'model1', commands[1]),
        service.sendCommand('device1', 'model1', commands[2]),
      ]);

      expect(mockRepository.sendCommand).toHaveBeenCalledTimes(3);
    });

    test('should rate limit convenience methods', async () => {
      await Promise.all([
        service.turnOn('device1', 'model1'),
        service.turnOff('device1', 'model1'),
        service.setBrightness('device1', 'model1', new Brightness(75)),
        service.setColor('device1', 'model1', new ColorRgb(255, 0, 0)),
        service.setColorTemperature('device1', 'model1', new ColorTemperature(3000)),
      ]);

      expect(mockRepository.sendCommand).toHaveBeenCalledTimes(5);
    });
  });

  describe('Complex Convenience Methods', () => {
    beforeEach(() => {
      service = new GoveeControlService({
        repository: mockRepository,
        rateLimit: 20, // Higher limit for multiple commands
        logger: mockLogger,
      });

      mockRepository.sendCommand.mockResolvedValue(undefined);
    });

    test('should rate limit turnOnWithBrightness', async () => {
      await service.turnOnWithBrightness('device1', 'model1', new Brightness(80));

      // Should make 2 API calls (turnOn + setBrightness)
      expect(mockRepository.sendCommand).toHaveBeenCalledTimes(2);
      expect(mockRepository.sendCommand).toHaveBeenNthCalledWith(
        1,
        'device1',
        'model1',
        CommandFactory.powerOn()
      );
      expect(mockRepository.sendCommand).toHaveBeenNthCalledWith(
        2,
        'device1',
        'model1',
        CommandFactory.brightness(new Brightness(80))
      );
    });

    test('should rate limit turnOnWithColor', async () => {
      const color = new ColorRgb(255, 128, 0);
      const brightness = new Brightness(90);

      await service.turnOnWithColor('device1', 'model1', color, brightness);

      // Should make 3 API calls (turnOn + setColor + setBrightness)
      expect(mockRepository.sendCommand).toHaveBeenCalledTimes(3);
    });

    test('should rate limit turnOnWithColorTemperature', async () => {
      const colorTemp = new ColorTemperature(4000);
      const brightness = new Brightness(60);

      await service.turnOnWithColorTemperature('device1', 'model1', colorTemp, brightness);

      // Should make 3 API calls (turnOn + setColorTemperature + setBrightness)
      expect(mockRepository.sendCommand).toHaveBeenCalledTimes(3);
    });
  });

  describe('Rate Limiter Statistics', () => {
    beforeEach(() => {
      service = new GoveeControlService({
        repository: mockRepository,
        rateLimit: 5,
        logger: mockLogger,
      });

      mockRepository.findAll.mockResolvedValue([mockDevice]);
    });

    test('should provide accurate rate limiter statistics', async () => {
      const initialStats = service.getRateLimiterStats();
      expect(initialStats.currentRequests).toBe(0);
      expect(initialStats.maxRequests).toBe(5);
      expect(initialStats.queueSize).toBe(0);

      // Execute some requests
      const promises = [
        service.getDevices(),
        service.getDevices(),
        service.getDevices(),
      ];

      await vi.advanceTimersByTimeAsync(50);

      const activeStats = service.getRateLimiterStats();
      expect(activeStats.currentRequests).toBe(3);
      expect(activeStats.utilizationPercent).toBe(60); // 3/5 * 100

      await Promise.all(promises);
    });

    test('should show queue statistics when rate limited', async () => {
      // Send 7 requests (2 over limit)
      const promises = Array.from({ length: 7 }, () => service.getDevices());

      await vi.advanceTimersByTimeAsync(50);

      const stats = service.getRateLimiterStats();
      expect(stats.currentRequests).toBe(5);
      expect(stats.queueSize).toBe(2);
      expect(stats.utilizationPercent).toBe(100);
      expect(stats.canExecuteImmediately).toBe(false);

      await vi.advanceTimersByTimeAsync(60000);
      await Promise.all(promises);
    });
  });

  describe('Error Handling with Rate Limiting', () => {
    beforeEach(() => {
      service = new GoveeControlService({
        repository: mockRepository,
        rateLimit: 3,
        logger: mockLogger,
      });
    });

    test('should propagate repository errors through rate limiter', async () => {
      const error = new Error('Repository error');
      mockRepository.findAll.mockRejectedValue(error);

      await expect(service.getDevices()).rejects.toThrow('Repository error');
    });

    test('should continue processing after errors', async () => {
      mockRepository.findAll
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce([mockDevice])
        .mockRejectedValueOnce(new Error('Third error'));

      const results = await Promise.allSettled([
        service.getDevices(),
        service.getDevices(),
        service.getDevices(),
      ]);

      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('rejected');
    });
  });

  describe('Performance Characteristics', () => {
    test('should handle high concurrency efficiently', async () => {
      service = new GoveeControlService({
        repository: mockRepository,
        rateLimit: 50, // Higher limit for performance test
        logger: mockLogger,
      });

      mockRepository.findAll.mockResolvedValue([mockDevice]);

      const startTime = performance.now();
      
      // Execute 100 concurrent requests
      const promises = Array.from({ length: 100 }, () => service.getDevices());
      
      await vi.advanceTimersByTimeAsync(120000); // 2 minutes
      await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(mockRepository.findAll).toHaveBeenCalledTimes(100);
      
      // With proper rate limiting, this should complete efficiently
      // Note: In test environment with fake timers, duration reflects simulated time
      expect(duration).toBeLessThan(200000); // Should complete within 200 seconds of simulated time
    });

    test('should maintain memory efficiency with many requests', async () => {
      service = new GoveeControlService({
        repository: mockRepository,
        rateLimit: 10,
        rateLimiterConfig: {
          maxQueueSize: 50, // Reasonable queue size
        },
        logger: mockLogger,
      });

      mockRepository.findAll.mockResolvedValue([mockDevice]);

      // Test memory efficiency by checking stats don't grow unbounded
      const promises = Array.from({ length: 30 }, () => service.getDevices());

      await vi.advanceTimersByTimeAsync(100);

      const stats = service.getRateLimiterStats();
      expect(stats.queueSize).toBeLessThanOrEqual(50);
      expect(stats.currentRequests).toBeLessThanOrEqual(10);

      await vi.advanceTimersByTimeAsync(180000); // 3 minutes
      await Promise.all(promises);
    });
  });
});
import { Logger } from 'pino';
import { IGoveeDeviceRepository } from '../domain/repositories/IGoveeDeviceRepository';
import { GoveeDevice } from '../domain/entities/GoveeDevice';
import { DeviceState } from '../domain/entities/DeviceState';
import { Command, CommandFactory } from '../domain/entities/Command';
import { ColorRgb, ColorTemperature, Brightness } from '../domain/value-objects';
import { SlidingWindowRateLimiter, SlidingWindowRateLimiterConfig } from '../infrastructure';
import {
  RetryableRepository,
  RetryExecutor,
  RetryPolicy,
  RetryConfigPresets,
} from '../infrastructure/retry';

export interface GoveeControlServiceConfig {
  repository: IGoveeDeviceRepository;
  rateLimit?: number; // requests per minute
  logger?: Logger;
  rateLimiterConfig?: Partial<SlidingWindowRateLimiterConfig>;
  enableRetries?: boolean; // Enable retry functionality
  retryPolicy?: 'development' | 'testing' | 'production' | 'custom' | RetryPolicy;
}

export class GoveeControlService {
  private readonly repository: IGoveeDeviceRepository;
  private readonly logger: Logger | undefined;
  private readonly rateLimiter: SlidingWindowRateLimiter;
  private readonly enableRetries: boolean;

  constructor(config: GoveeControlServiceConfig) {
    this.validateConfig(config);

    // Set up retry functionality if enabled
    this.enableRetries = config.enableRetries ?? false;
    if (this.enableRetries) {
      this.repository = this.createRetryableRepository(config);
    } else {
      this.repository = config.repository;
    }
    this.logger = config.logger;

    // Default to 95 requests per minute (5 request buffer under Govee API limit)
    const requestsPerMinute = config.rateLimit ?? 95;

    // Initialize the sliding window rate limiter
    if (config.rateLimiterConfig) {
      // Use custom configuration
      this.rateLimiter = new SlidingWindowRateLimiter({
        maxRequests: requestsPerMinute,
        windowMs: 60 * 1000, // 1 minute
        logger: this.logger,
        ...config.rateLimiterConfig,
      });
    } else if (requestsPerMinute === 95) {
      // Use optimized factory for Govee API
      this.rateLimiter = SlidingWindowRateLimiter.forGoveeApi(this.logger);
    } else {
      // Use custom rate limit
      this.rateLimiter = SlidingWindowRateLimiter.custom(requestsPerMinute, this.logger);
    }

    this.logger?.info(
      {
        requestsPerMinute,
        rateLimiterType: 'SlidingWindow',
        enableRetries: this.enableRetries,
        retryPolicy: this.enableRetries ? config.retryPolicy || 'production' : 'disabled',
        stats: this.rateLimiter.getStats(),
      },
      'Initialized GoveeControlService with sliding window rate limiting'
    );
  }

  /**
   * Creates a retry-enabled repository wrapper
   */
  private createRetryableRepository(config: GoveeControlServiceConfig): IGoveeDeviceRepository {
    let retryPolicy: RetryPolicy;

    // Determine retry policy based on configuration
    if (config.retryPolicy instanceof RetryPolicy) {
      retryPolicy = config.retryPolicy;
    } else {
      const policyType = config.retryPolicy || 'production';
      switch (policyType) {
        case 'development':
          retryPolicy = new RetryPolicy(RetryConfigPresets.development(this.logger));
          break;
        case 'testing':
          retryPolicy = new RetryPolicy(RetryConfigPresets.testing(this.logger));
          break;
        case 'production':
          retryPolicy = new RetryPolicy(RetryConfigPresets.production(this.logger));
          break;
        case 'custom':
          // Use Govee-optimized defaults for custom
          retryPolicy = RetryPolicy.createGoveeOptimized(this.logger);
          break;
        default:
          retryPolicy = new RetryPolicy(RetryConfigPresets.production(this.logger));
      }
    }

    const retryExecutor = new RetryExecutor(retryPolicy, {
      logger: this.logger,
      enableRequestLogging: true,
      enablePerformanceTracking: true,
    });

    const retryableRepository = new RetryableRepository({
      repository: config.repository,
      retryExecutor,
      logger: this.logger,
      enableRequestIds: true,
    });

    this.logger?.info(
      {
        retryPolicy: retryPolicy.getMetrics().circuitBreakerState
          ? 'enabled_with_circuit_breaker'
          : 'enabled',
        maxAttempts: retryPolicy instanceof RetryPolicy ? 'configured' : 'default',
      },
      'Created retry-enabled repository wrapper'
    );

    return retryableRepository;
  }

  private validateConfig(config: GoveeControlServiceConfig): void {
    if (!config.repository) {
      throw new Error('Repository is required');
    }
    if (
      config.rateLimit !== undefined &&
      (!Number.isInteger(config.rateLimit) || config.rateLimit <= 0)
    ) {
      throw new Error('Rate limit must be a positive integer');
    }
  }

  /**
   * Retrieves all devices associated with the configured API key
   */
  async getDevices(): Promise<GoveeDevice[]> {
    this.logger?.info('Getting all devices');

    return this.rateLimiter.execute(async () => {
      const devices = await this.repository.findAll();
      this.logger?.info(`Retrieved ${devices.length} devices`);
      return devices;
    });
  }

  /**
   * Retrieves the current state of a specific device
   */
  async getDeviceState(deviceId: string, model: string): Promise<DeviceState> {
    this.validateDeviceParams(deviceId, model);
    this.logger?.info({ deviceId, model }, 'Getting device state');

    return this.rateLimiter.execute(async () => {
      const state = await this.repository.findState(deviceId, model);
      this.logger?.info({ deviceId, model, online: state.online }, 'Retrieved device state');
      return state;
    });
  }

  /**
   * Sends a command to control a specific device
   */
  async sendCommand(deviceId: string, model: string, command: Command): Promise<void> {
    this.validateDeviceParams(deviceId, model);
    this.logger?.info({ deviceId, model, command: command.toObject() }, 'Sending command');

    return this.rateLimiter.execute(async () => {
      await this.repository.sendCommand(deviceId, model, command);
      this.logger?.info({ deviceId, model }, 'Command sent successfully');
    });
  }

  /**
   * Turns a device on
   */
  async turnOn(deviceId: string, model: string): Promise<void> {
    this.logger?.info({ deviceId, model }, 'Turning device on');
    await this.sendCommand(deviceId, model, CommandFactory.powerOn());
  }

  /**
   * Turns a device off
   */
  async turnOff(deviceId: string, model: string): Promise<void> {
    this.logger?.info({ deviceId, model }, 'Turning device off');
    await this.sendCommand(deviceId, model, CommandFactory.powerOff());
  }

  /**
   * Sets the brightness of a device
   */
  async setBrightness(deviceId: string, model: string, brightness: Brightness): Promise<void> {
    this.logger?.info(
      { deviceId, model, brightness: brightness.level },
      'Setting device brightness'
    );
    await this.sendCommand(deviceId, model, CommandFactory.brightness(brightness));
  }

  /**
   * Sets the color of a device
   */
  async setColor(deviceId: string, model: string, color: ColorRgb): Promise<void> {
    this.logger?.info({ deviceId, model, color: color.toObject() }, 'Setting device color');
    await this.sendCommand(deviceId, model, CommandFactory.color(color));
  }

  /**
   * Sets the color temperature of a device
   */
  async setColorTemperature(
    deviceId: string,
    model: string,
    colorTemperature: ColorTemperature
  ): Promise<void> {
    this.logger?.info(
      { deviceId, model, colorTemperature: colorTemperature.kelvin },
      'Setting device color temperature'
    );
    await this.sendCommand(deviceId, model, CommandFactory.colorTemperature(colorTemperature));
  }

  /**
   * Convenience method to turn on a device and set its brightness
   */
  async turnOnWithBrightness(
    deviceId: string,
    model: string,
    brightness: Brightness
  ): Promise<void> {
    this.logger?.info(
      { deviceId, model, brightness: brightness.level },
      'Turning device on with brightness'
    );
    await this.turnOn(deviceId, model);
    await this.setBrightness(deviceId, model, brightness);
  }

  /**
   * Convenience method to turn on a device and set its color
   */
  async turnOnWithColor(
    deviceId: string,
    model: string,
    color: ColorRgb,
    brightness?: Brightness
  ): Promise<void> {
    this.logger?.info(
      { deviceId, model, color: color.toObject(), brightness: brightness?.level },
      'Turning device on with color'
    );
    await this.turnOn(deviceId, model);
    await this.setColor(deviceId, model, color);
    if (brightness) {
      await this.setBrightness(deviceId, model, brightness);
    }
  }

  /**
   * Convenience method to turn on a device and set its color temperature
   */
  async turnOnWithColorTemperature(
    deviceId: string,
    model: string,
    colorTemperature: ColorTemperature,
    brightness?: Brightness
  ): Promise<void> {
    this.logger?.info(
      { deviceId, model, colorTemperature: colorTemperature.kelvin, brightness: brightness?.level },
      'Turning device on with color temperature'
    );
    await this.turnOn(deviceId, model);
    await this.setColorTemperature(deviceId, model, colorTemperature);
    if (brightness) {
      await this.setBrightness(deviceId, model, brightness);
    }
  }

  /**
   * Convenience method to check if a device is online
   */
  async isDeviceOnline(deviceId: string, model: string): Promise<boolean> {
    const state = await this.getDeviceState(deviceId, model);
    return state.isOnline();
  }

  /**
   * Convenience method to check if a device is powered on
   */
  async isDevicePoweredOn(deviceId: string, model: string): Promise<boolean> {
    const state = await this.getDeviceState(deviceId, model);
    return state.isPoweredOn();
  }

  /**
   * Convenience method to get all controllable devices
   */
  async getControllableDevices(): Promise<GoveeDevice[]> {
    const devices = await this.getDevices();
    return devices.filter(device => device.canControl());
  }

  /**
   * Convenience method to get all retrievable devices
   */
  async getRetrievableDevices(): Promise<GoveeDevice[]> {
    const devices = await this.getDevices();
    return devices.filter(device => device.canRetrieve());
  }

  /**
   * Convenience method to find a device by name (case-insensitive)
   */
  async findDeviceByName(deviceName: string): Promise<GoveeDevice | undefined> {
    const devices = await this.getDevices();
    return devices.find(device =>
      device.deviceName.toLowerCase().includes(deviceName.toLowerCase())
    );
  }

  /**
   * Convenience method to find devices by model
   */
  async findDevicesByModel(model: string): Promise<GoveeDevice[]> {
    const devices = await this.getDevices();
    return devices.filter(device => device.model === model);
  }

  /**
   * Gets current rate limiter statistics for monitoring and debugging
   */
  getRateLimiterStats() {
    return this.rateLimiter.getStats();
  }

  /**
   * Gets retry metrics if retry functionality is enabled
   */
  getRetryMetrics() {
    if (!this.enableRetries) {
      return null;
    }

    if (this.repository instanceof RetryableRepository) {
      return this.repository.getRetryMetrics();
    }

    return null;
  }

  /**
   * Resets retry metrics if retry functionality is enabled
   */
  resetRetryMetrics(): void {
    if (!this.enableRetries) {
      return;
    }

    if (this.repository instanceof RetryableRepository) {
      this.repository.resetRetryMetrics();
      this.logger?.info('Retry metrics reset');
    }
  }

  /**
   * Gets comprehensive service statistics including rate limiter and retry metrics
   */
  getServiceStats() {
    const stats = {
      rateLimiter: this.getRateLimiterStats(),
      retries: this.getRetryMetrics(),
      configuration: {
        enableRetries: this.enableRetries,
        rateLimit: this.rateLimiter.getStats().maxRequests,
      },
    };

    return stats;
  }

  /**
   * Checks if retry functionality is enabled
   */
  isRetryEnabled(): boolean {
    return this.enableRetries;
  }

  private validateDeviceParams(deviceId: string, model: string): void {
    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      throw new Error('Device ID must be a non-empty string');
    }
    if (!model || typeof model !== 'string' || model.trim().length === 0) {
      throw new Error('Model must be a non-empty string');
    }
  }
}

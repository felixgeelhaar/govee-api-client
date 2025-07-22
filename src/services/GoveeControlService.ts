import pLimit from 'p-limit';
import { Logger } from 'pino';
import { IGoveeDeviceRepository } from '../domain/repositories/IGoveeDeviceRepository';
import { GoveeDevice } from '../domain/entities/GoveeDevice';
import { DeviceState } from '../domain/entities/DeviceState';
import { Command, CommandFactory } from '../domain/entities/Command';
import { ColorRgb, ColorTemperature, Brightness } from '../domain/value-objects';

export interface GoveeControlServiceConfig {
  repository: IGoveeDeviceRepository;
  rateLimit?: number; // requests per minute
  logger?: Logger;
}

export class GoveeControlService {
  private readonly repository: IGoveeDeviceRepository;
  private readonly logger: Logger | undefined;
  private readonly rateLimiter: (fn: () => Promise<any>) => Promise<any>;

  constructor(config: GoveeControlServiceConfig) {
    this.validateConfig(config);

    this.repository = config.repository;
    this.logger = config.logger;

    // Default to 100 requests per minute (Govee API limit)
    const requestsPerMinute = config.rateLimit ?? 100;
    const requestsPerSecond = requestsPerMinute / 60;
    const intervalMs = 1000 / requestsPerSecond;

    // Create rate limiter with proper interval
    this.rateLimiter = pLimit(1); // One request at a time

    this.logger?.info(
      { requestsPerMinute, intervalMs },
      'Initialized GoveeControlService with rate limiting'
    );
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

    return this.rateLimiter(async () => {
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

    return this.rateLimiter(async () => {
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

    return this.rateLimiter(async () => {
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

  private validateDeviceParams(deviceId: string, model: string): void {
    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      throw new Error('Device ID must be a non-empty string');
    }
    if (!model || typeof model !== 'string' || model.trim().length === 0) {
      throw new Error('Model must be a non-empty string');
    }
  }
}

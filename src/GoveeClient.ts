import pino, { Logger } from 'pino';
import { GoveeDeviceRepository } from './infrastructure/GoveeDeviceRepository';
import { GoveeControlService } from './services/GoveeControlService';
import { GoveeDevice } from './domain/entities/GoveeDevice';
import { DeviceState } from './domain/entities/DeviceState';
import { Command } from './domain/entities/Command';
import {
  ColorRgb,
  ColorTemperature,
  Brightness,
  LightScene,
  SegmentColor,
  MusicMode,
} from './domain/value-objects';
import { RetryPolicy } from './infrastructure/retry';

export interface GoveeClientConfig {
  apiKey?: string;
  timeout?: number;
  rateLimit?: number;
  logger?: Logger;
  enableRetries?: boolean;
  retryPolicy?: 'development' | 'testing' | 'production' | 'custom' | RetryPolicy;
}

export class GoveeClient {
  private readonly controlService: GoveeControlService;
  private readonly logger: Logger;

  constructor(config: GoveeClientConfig = {}) {
    // Resolve API key from config or environment variable
    const apiKey = config.apiKey ?? process.env.GOVEE_API_KEY;

    this.validateConfig({ ...config, apiKey });

    // Initialize logger (silent by default)
    this.logger = config.logger ?? pino({ level: 'silent' });

    // Initialize repository
    const repositoryConfig: any = {
      apiKey: apiKey!,
      logger: this.logger,
    };

    if (config.timeout !== undefined) {
      repositoryConfig.timeout = config.timeout;
    }

    const repository = new GoveeDeviceRepository(repositoryConfig);

    // Initialize control service
    const serviceConfig: any = {
      repository,
      logger: this.logger,
    };

    if (config.rateLimit !== undefined) {
      serviceConfig.rateLimit = config.rateLimit;
    }

    if (config.enableRetries !== undefined) {
      serviceConfig.enableRetries = config.enableRetries;
    }

    if (config.retryPolicy !== undefined) {
      serviceConfig.retryPolicy = config.retryPolicy;
    }

    this.controlService = new GoveeControlService(serviceConfig);

    this.logger.info('GoveeClient initialized successfully');
  }

  private validateConfig(config: GoveeClientConfig & { apiKey?: string }): void {
    if (!config.apiKey || typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
      throw new Error(
        'API key is required. Provide it via config.apiKey or set the GOVEE_API_KEY environment variable.'
      );
    }
    if (
      config.timeout !== undefined &&
      (!Number.isInteger(config.timeout) || config.timeout <= 0)
    ) {
      throw new Error('Timeout must be a positive integer');
    }
    if (
      config.rateLimit !== undefined &&
      (!Number.isInteger(config.rateLimit) || config.rateLimit <= 0)
    ) {
      throw new Error('Rate limit must be a positive integer');
    }
    if (config.enableRetries !== undefined && typeof config.enableRetries !== 'boolean') {
      throw new Error('enableRetries must be a boolean');
    }
    if (config.retryPolicy !== undefined) {
      const validPolicies = ['development', 'testing', 'production', 'custom'];
      if (
        !(config.retryPolicy instanceof RetryPolicy) &&
        !validPolicies.includes(config.retryPolicy as string)
      ) {
        throw new Error(
          'retryPolicy must be a RetryPolicy instance or one of: development, testing, production, custom'
        );
      }
    }
  }

  // Device management methods
  async getDevices(): Promise<GoveeDevice[]> {
    return this.controlService.getDevices();
  }

  async getDeviceState(deviceId: string, model: string): Promise<DeviceState> {
    return this.controlService.getDeviceState(deviceId, model);
  }

  async getControllableDevices(): Promise<GoveeDevice[]> {
    return this.controlService.getControllableDevices();
  }

  async getRetrievableDevices(): Promise<GoveeDevice[]> {
    return this.controlService.getRetrievableDevices();
  }

  async findDeviceByName(deviceName: string): Promise<GoveeDevice | undefined> {
    return this.controlService.findDeviceByName(deviceName);
  }

  async findDevicesByModel(model: string): Promise<GoveeDevice[]> {
    return this.controlService.findDevicesByModel(model);
  }

  // Device control methods
  async sendCommand(deviceId: string, model: string, command: Command): Promise<void> {
    return this.controlService.sendCommand(deviceId, model, command);
  }

  async turnOn(deviceId: string, model: string): Promise<void> {
    return this.controlService.turnOn(deviceId, model);
  }

  async turnOff(deviceId: string, model: string): Promise<void> {
    return this.controlService.turnOff(deviceId, model);
  }

  async setBrightness(deviceId: string, model: string, brightness: Brightness): Promise<void> {
    return this.controlService.setBrightness(deviceId, model, brightness);
  }

  async setColor(deviceId: string, model: string, color: ColorRgb): Promise<void> {
    return this.controlService.setColor(deviceId, model, color);
  }

  async setColorTemperature(
    deviceId: string,
    model: string,
    colorTemperature: ColorTemperature
  ): Promise<void> {
    return this.controlService.setColorTemperature(deviceId, model, colorTemperature);
  }

  async getDynamicScenes(deviceId: string, model: string): Promise<LightScene[]> {
    return this.controlService.getDynamicScenes(deviceId, model);
  }

  async setLightScene(deviceId: string, model: string, scene: LightScene): Promise<void> {
    return this.controlService.setLightScene(deviceId, model, scene);
  }

  async setSegmentColors(
    deviceId: string,
    model: string,
    segments: SegmentColor | SegmentColor[]
  ): Promise<void> {
    return this.controlService.setSegmentColors(deviceId, model, segments);
  }

  async setSegmentBrightness(
    deviceId: string,
    model: string,
    segments:
      | Array<{ index: number; brightness: Brightness }>
      | { index: number; brightness: Brightness }
  ): Promise<void> {
    return this.controlService.setSegmentBrightness(deviceId, model, segments);
  }

  async setMusicMode(deviceId: string, model: string, musicMode: MusicMode): Promise<void> {
    return this.controlService.setMusicMode(deviceId, model, musicMode);
  }

  async setNightlightToggle(deviceId: string, model: string, enabled: boolean): Promise<void> {
    return this.controlService.setNightlightToggle(deviceId, model, enabled);
  }

  async setGradientToggle(deviceId: string, model: string, enabled: boolean): Promise<void> {
    return this.controlService.setGradientToggle(deviceId, model, enabled);
  }

  /**
   * Toggles scene stage mode on a device (e.g., Curtain Lights)
   *
   * Scene Stage enables synchronized lighting displays across devices
   * with spatial awareness and coordination.
   *
   * @param deviceId - The device ID
   * @param model - The device model/SKU
   * @param enabled - Whether to enable or disable scene stage
   */
  async setSceneStageToggle(deviceId: string, model: string, enabled: boolean): Promise<void> {
    return this.controlService.setSceneStageToggle(deviceId, model, enabled);
  }

  async setNightlightScene(
    deviceId: string,
    model: string,
    sceneValue: string | number
  ): Promise<void> {
    return this.controlService.setNightlightScene(deviceId, model, sceneValue);
  }

  async setPresetScene(
    deviceId: string,
    model: string,
    sceneValue: string | number
  ): Promise<void> {
    return this.controlService.setPresetScene(deviceId, model, sceneValue);
  }

  // Convenience methods
  async turnOnWithBrightness(
    deviceId: string,
    model: string,
    brightness: Brightness
  ): Promise<void> {
    return this.controlService.turnOnWithBrightness(deviceId, model, brightness);
  }

  async turnOnWithColor(
    deviceId: string,
    model: string,
    color: ColorRgb,
    brightness?: Brightness
  ): Promise<void> {
    return this.controlService.turnOnWithColor(deviceId, model, color, brightness);
  }

  async turnOnWithColorTemperature(
    deviceId: string,
    model: string,
    colorTemperature: ColorTemperature,
    brightness?: Brightness
  ): Promise<void> {
    return this.controlService.turnOnWithColorTemperature(
      deviceId,
      model,
      colorTemperature,
      brightness
    );
  }

  async isDeviceOnline(deviceId: string, model: string): Promise<boolean> {
    return this.controlService.isDeviceOnline(deviceId, model);
  }

  async isDevicePoweredOn(deviceId: string, model: string): Promise<boolean> {
    return this.controlService.isDevicePoweredOn(deviceId, model);
  }

  // Monitoring and debugging methods
  getRateLimiterStats() {
    return this.controlService.getRateLimiterStats();
  }

  getRetryMetrics() {
    return this.controlService.getRetryMetrics();
  }

  getServiceStats() {
    return this.controlService.getServiceStats();
  }

  resetRetryMetrics(): void {
    return this.controlService.resetRetryMetrics();
  }

  isRetryEnabled(): boolean {
    return this.controlService.isRetryEnabled();
  }
}

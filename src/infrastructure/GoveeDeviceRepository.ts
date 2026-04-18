import axios, { AxiosInstance, AxiosError } from 'axios';
import { Logger } from 'pino';
import { IGoveeDeviceRepository } from '../domain/repositories/IGoveeDeviceRepository';
import { GoveeDevice } from '../domain/entities/GoveeDevice';
import {
  DeviceState,
  StateProperty,
  PowerState,
  ColorState,
  ColorTemperatureState,
  BrightnessState,
} from '../domain/entities/DeviceState';
import { Command } from '../domain/entities/Command';
import {
  ColorRgb,
  ColorTemperature,
  Brightness,
  LightScene,
  Snapshot,
  DiyScene,
  SegmentColor,
  MusicMode,
} from '../domain/value-objects';
import {
  GoveeApiError,
  InvalidApiKeyError,
  RateLimitError,
  NetworkError,
  ValidationError,
} from '../errors';
import {
  GoveeDevicesResponseSchema,
  GoveeStateResponseSchema,
  GoveeCommandResponseSchema,
  GoveeDynamicScenesResponseSchema,
  GoveeDiyScenesResponseSchema,
} from './response-schemas';

interface GoveeApiConfig {
  apiKey: string;
  timeout?: number;
  logger?: Logger;
}

interface GoveeCapability {
  type: string;
  instance: string;
  parameters?: {
    dataType: string;
    options?: Array<{
      name: string;
      value: unknown;
    }>;
    fields?: Array<{
      fieldName: string;
      dataType: string;
      options?: Array<{ name: string; value: unknown }>;
      range?: { min: number; max: number; precision: number };
    }>;
    range?: { min: number; max: number; precision: number };
  };
}

interface GoveeDeviceResponse {
  device: string;
  sku: string;
  deviceName: string;
  capabilities: GoveeCapability[];
}

interface GoveeDevicesResponse {
  code: number;
  message: string;
  data: GoveeDeviceResponse[];
}

interface GoveeStateProperty {
  online: boolean;
  powerSwitch: number;
  brightness?: number;
  color?: { r: number; g: number; b: number };
  colorTem?: number;
}

interface GoveeStateRequest {
  requestId: string;
  payload: {
    sku: string;
    device: string;
  };
}

interface GoveeStateResponse {
  code: number;
  message: string;
  data: {
    device: string;
    sku: string;
    capabilities: Array<{
      type: string;
      instance: string;
      state: {
        value: unknown;
      };
    }>;
  };
}

interface GoveeCommandRequest {
  requestId: string;
  payload: {
    sku: string;
    device: string;
    capability: {
      type: string;
      instance: string;
      value: unknown;
    };
  };
}

interface GoveeCommandResponse {
  code: number;
  message: string;
  msg?: string;
  data?: unknown;
}

export class GoveeDeviceRepository implements IGoveeDeviceRepository {
  private readonly httpClient: AxiosInstance;
  private readonly logger: Logger | undefined;
  private static readonly BASE_URL = 'https://openapi.api.govee.com';

  private generateRequestId(): string {
    return crypto.randomUUID();
  }

  constructor(config: GoveeApiConfig) {
    this.validateConfig(config);
    this.logger = config.logger;

    this.httpClient = axios.create({
      baseURL: GoveeDeviceRepository.BASE_URL,
      timeout: config.timeout ?? 30000,
      headers: {
        'Govee-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private validateConfig(config: GoveeApiConfig): void {
    if (!config.apiKey || typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
      throw new Error('API key is required and must be a non-empty string');
    }
    if (
      config.timeout !== undefined &&
      (!Number.isInteger(config.timeout) || config.timeout <= 0)
    ) {
      throw new Error('Timeout must be a positive integer');
    }
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.httpClient.interceptors.request.use(
      config => {
        this.logger?.debug(
          {
            method: config.method?.toUpperCase(),
            url: config.url,
            headers: { ...config.headers, 'Govee-API-Key': '[REDACTED]' },
          },
          'Sending request to Govee API'
        );
        return config;
      },
      error => {
        this.logger?.error(error, 'Request interceptor error');
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.httpClient.interceptors.response.use(
      response => {
        this.logger?.debug(
          {
            status: response.status,
            url: response.config.url,
            data: response.data,
          },
          'Received response from Govee API'
        );
        return response;
      },
      error => this.handleHttpError(error)
    );
  }

  private handleHttpError(error: AxiosError): never {
    this.logger?.error(error, 'HTTP request failed');

    if (
      error.code &&
      (error.code === 'ECONNABORTED' ||
        error.code.startsWith('ECONNR') ||
        error.code.startsWith('ETIMEOUT') ||
        error.code === 'ENOTFOUND')
    ) {
      throw NetworkError.fromAxiosError(error);
    }

    if (!error.response) {
      throw new NetworkError('Network request failed without response', 'unknown', error);
    }

    const { status, data, headers } = error.response;

    if (status === 401) {
      const responseData =
        typeof data === 'object' && data !== null ? (data as { message?: string }) : undefined;
      throw InvalidApiKeyError.fromUnauthorizedResponse(responseData);
    }

    if (status === 429) {
      throw RateLimitError.fromRateLimitResponse(headers as Record<string, string>);
    }

    const responseData =
      typeof data === 'string' ? data : (data as { code?: number; message?: string });
    throw GoveeApiError.fromResponse(status, responseData);
  }

  async findAll(): Promise<GoveeDevice[]> {
    this.logger?.info('Fetching all devices');

    try {
      const response = await this.httpClient.get('/router/api/v1/user/devices');

      // Validate response with Zod
      const validationResult = GoveeDevicesResponseSchema.safeParse(response.data);

      if (!validationResult.success) {
        this.logger?.error(
          { zodError: validationResult.error, rawData: response.data },
          'API response validation failed'
        );
        throw ValidationError.fromZodError(validationResult.error, response.data);
      }

      const apiResponse = validationResult.data;

      if (apiResponse.code !== 200) {
        throw new GoveeApiError(
          `API returned error code ${apiResponse.code}: ${apiResponse.message}`,
          response.status,
          apiResponse.code,
          apiResponse.message
        );
      }

      const devices = apiResponse.data
        .filter(device => {
          if (
            !device.device ||
            typeof device.device !== 'string' ||
            device.device.trim().length === 0
          ) {
            this.logger?.warn(
              { device: { ...device, device: '[INVALID]' } },
              'Filtering out device with invalid device ID'
            );
            return false;
          }
          if (!device.sku || typeof device.sku !== 'string' || device.sku.trim().length === 0) {
            this.logger?.warn(
              { device: { ...device, sku: '[INVALID]' } },
              'Filtering out device with invalid sku'
            );
            return false;
          }
          if (
            !device.deviceName ||
            typeof device.deviceName !== 'string' ||
            device.deviceName.trim().length === 0
          ) {
            this.logger?.warn(
              { device: { ...device, deviceName: '[INVALID]' } },
              'Filtering out device with invalid device name'
            );
            return false;
          }
          if (!Array.isArray(device.capabilities)) {
            this.logger?.warn(
              { device: { ...device, capabilities: '[INVALID]' } },
              'Filtering out device with invalid capabilities'
            );
            return false;
          }
          for (const capability of device.capabilities) {
            if (
              !capability.type ||
              typeof capability.type !== 'string' ||
              capability.type.trim().length === 0
            ) {
              this.logger?.warn(
                { device: { ...device, capabilities: '[INVALID]' } },
                'Filtering out device with invalid capability type'
              );
              return false;
            }
          }
          return true;
        })
        .map(
          device =>
            new GoveeDevice(
              device.device!,
              device.sku!,
              device.deviceName!,
              device.capabilities! as GoveeCapability[]
            )
        );

      const totalDevicesFromApi = apiResponse.data.length;
      const validDevices = devices.length;
      const filteredDevices = totalDevicesFromApi - validDevices;

      if (filteredDevices > 0) {
        this.logger?.info(
          `Successfully fetched ${validDevices} devices (filtered out ${filteredDevices} invalid devices from ${totalDevicesFromApi} total)`
        );
      } else {
        this.logger?.info(`Successfully fetched ${validDevices} devices`);
      }

      return devices;
    } catch (error) {
      this.logger?.error(error, 'Failed to fetch devices');
      throw error;
    }
  }

  async findState(deviceId: string, sku: string): Promise<DeviceState> {
    this.validateDeviceParams(deviceId, sku);
    this.logger?.info({ deviceId, sku }, 'Fetching device state');

    try {
      const requestBody: GoveeStateRequest = {
        requestId: this.generateRequestId(),
        payload: {
          sku: sku,
          device: deviceId,
        },
      };

      const response = await this.httpClient.post('/router/api/v1/device/state', requestBody);

      // Validate response with Zod
      const validationResult = GoveeStateResponseSchema.safeParse(response.data);

      if (!validationResult.success) {
        this.logger?.error(
          { zodError: validationResult.error, rawData: response.data },
          'Device state response validation failed'
        );
        throw ValidationError.fromZodError(validationResult.error, response.data);
      }

      const apiResponse = validationResult.data;

      if (apiResponse.code !== 200) {
        throw new GoveeApiError(
          `API returned error code ${apiResponse.code}: ${apiResponse.message}`,
          response.status,
          apiResponse.code,
          apiResponse.message
        );
      }

      // Parse capabilities into state properties
      const stateProperties = this.mapCapabilitiesToStateProperties(apiResponse.data.capabilities);

      // Parse the device's actual online state from the online capability.
      // Defaults to true when absent, matching pre-existing behavior — some
      // devices don't report online state explicitly but clearly respond.
      const online = this.parseOnlineState(apiResponse.data.capabilities);

      const deviceState = new DeviceState(deviceId, sku, online, stateProperties);

      this.logger?.info({ deviceId, sku }, 'Successfully fetched device state');
      return deviceState;
    } catch (error) {
      this.logger?.error(error, 'Failed to fetch device state');
      throw error;
    }
  }

  async sendCommand(deviceId: string, sku: string, command: Command): Promise<void> {
    this.validateDeviceParams(deviceId, sku);
    this.logger?.info({ deviceId, sku, command: command.toObject() }, 'Sending command to device');

    const requestBody: GoveeCommandRequest = {
      requestId: this.generateRequestId(),
      payload: {
        sku: sku,
        device: deviceId,
        capability: this.convertCommandToCapability(command),
      },
    };

    try {
      const response = await this.httpClient.post('/router/api/v1/device/control', requestBody);

      // Validate response with Zod
      const validationResult = GoveeCommandResponseSchema.safeParse(response.data);

      if (!validationResult.success) {
        this.logger?.error(
          { zodError: validationResult.error, rawData: response.data },
          'Command response validation failed'
        );
        throw ValidationError.fromZodError(validationResult.error, response.data);
      }

      const apiResponse = validationResult.data;

      if (apiResponse.code !== 200) {
        throw new GoveeApiError(
          `API returned error code ${apiResponse.code}: ${apiResponse.message}`,
          response.status,
          apiResponse.code,
          apiResponse.message
        );
      }

      this.logger?.info({ deviceId, sku }, 'Successfully sent command to device');
    } catch (error) {
      this.logger?.error(error, 'Failed to send command to device');
      throw error;
    }
  }

  async findDynamicScenes(deviceId: string, sku: string): Promise<LightScene[]> {
    this.validateDeviceParams(deviceId, sku);
    this.logger?.info({ deviceId, sku }, 'Fetching dynamic light scenes');

    try {
      const requestBody = {
        requestId: this.generateRequestId(),
        payload: {
          sku: sku,
          device: deviceId,
        },
      };

      const response = await this.httpClient.post('/router/api/v1/device/scenes', requestBody);

      // Validate response with Zod
      const validationResult = GoveeDynamicScenesResponseSchema.safeParse(response.data);

      if (!validationResult.success) {
        this.logger?.error(
          { zodError: validationResult.error, rawData: response.data },
          'Dynamic scenes response validation failed'
        );
        throw ValidationError.fromZodError(validationResult.error, response.data);
      }

      const apiResponse = validationResult.data;

      if (apiResponse.code !== 200) {
        throw new GoveeApiError(
          `API returned error code ${apiResponse.code}: ${apiResponse.msg}`,
          response.status,
          apiResponse.code,
          apiResponse.msg || 'Unknown error'
        );
      }

      // Extract scenes from capabilities
      const scenes: LightScene[] = [];

      for (const capability of apiResponse.payload.capabilities) {
        if (capability.type.includes('dynamic_scene') && capability.instance === 'lightScene') {
          for (const option of capability.parameters.options) {
            const parsedValue = this.parseStructuredDynamicSceneValue(option.value);
            if (!parsedValue) {
              this.logger?.debug(
                {
                  deviceId,
                  sku,
                  instance: capability.instance,
                  optionName: option.name,
                  value: option.value,
                },
                'Skipping lightScene entry with unsupported value shape'
              );
              continue;
            }
            scenes.push(new LightScene(parsedValue.id, parsedValue.paramId, option.name));
          }
        }
      }

      this.logger?.info(
        { deviceId, sku, sceneCount: scenes.length },
        'Successfully fetched dynamic scenes'
      );
      return scenes;
    } catch (error) {
      this.logger?.error(error, 'Failed to fetch dynamic scenes');
      throw error;
    }
  }

  async findSnapshots(deviceId: string, sku: string): Promise<Snapshot[]> {
    const snapshots = await this.findDynamicScenesByInstance<Snapshot>(
      deviceId,
      sku,
      'snapshot',
      opt => new Snapshot(opt.value.id, opt.value.paramId, opt.name)
    );

    if (snapshots.length > 0) {
      return snapshots;
    }

    return this.findSnapshotsFromDeviceCapabilities(deviceId, sku);
  }

  async findDiyScenes(deviceId: string, sku: string): Promise<DiyScene[]> {
    this.validateDeviceParams(deviceId, sku);
    this.logger?.info({ deviceId, sku }, 'Fetching DIY scenes');

    try {
      const requestBody = {
        requestId: this.generateRequestId(),
        payload: {
          sku,
          device: deviceId,
        },
      };

      const response = await this.httpClient.post('/router/api/v1/device/diy-scenes', requestBody);
      const validationResult = GoveeDiyScenesResponseSchema.safeParse(response.data);

      if (!validationResult.success) {
        this.logger?.error(
          { zodError: validationResult.error, rawData: response.data },
          'DIY scenes response validation failed'
        );
        throw ValidationError.fromZodError(validationResult.error, response.data);
      }

      const apiResponse = validationResult.data;
      if (apiResponse.code !== 200) {
        throw new GoveeApiError(
          `API returned error code ${apiResponse.code}: ${apiResponse.msg}`,
          response.status,
          apiResponse.code,
          apiResponse.msg || 'Unknown error'
        );
      }

      const scenes: DiyScene[] = [];
      for (const capability of apiResponse.payload.capabilities) {
        if (
          (capability.type.includes('dynamic_scene') ||
            capability.type.includes('diy_color_setting')) &&
          capability.instance === 'diyScene'
        ) {
          for (const option of capability.parameters.options) {
            const parsedValue = this.parseStructuredDynamicSceneValue(option.value);
            if (!parsedValue) {
              this.logger?.debug(
                {
                  deviceId,
                  sku,
                  instance: capability.instance,
                  optionName: option.name,
                  value: option.value,
                },
                'Skipping diyScene entry with unsupported value shape'
              );
              continue;
            }
            scenes.push(new DiyScene(parsedValue.id, parsedValue.paramId, option.name));
          }
        }
      }

      this.logger?.info({ deviceId, sku, count: scenes.length }, 'Successfully fetched DIY scenes');
      return scenes;
    } catch (error) {
      this.logger?.error(error, 'Failed to fetch DIY scenes');
      throw error;
    }
  }

  /**
   * Shared helper for querying the /device/scenes endpoint and
   * extracting entries by capability instance name.
   */
  private async findDynamicScenesByInstance<T>(
    deviceId: string,
    sku: string,
    instanceName: string,
    factory: (option: { name: string; value: { id: number; paramId: number } }) => T | null
  ): Promise<T[]> {
    this.validateDeviceParams(deviceId, sku);
    this.logger?.info(
      { deviceId, sku, instance: instanceName },
      `Fetching ${instanceName} entries`
    );

    try {
      const requestBody = {
        requestId: this.generateRequestId(),
        payload: { sku, device: deviceId },
      };

      const response = await this.httpClient.post('/router/api/v1/device/scenes', requestBody);
      const validationResult = GoveeDynamicScenesResponseSchema.safeParse(response.data);

      if (!validationResult.success) {
        this.logger?.error(
          { zodError: validationResult.error, rawData: response.data },
          `${instanceName} response validation failed`
        );
        throw ValidationError.fromZodError(validationResult.error, response.data);
      }

      const apiResponse = validationResult.data;
      if (apiResponse.code !== 200) {
        throw new GoveeApiError(
          `API returned error code ${apiResponse.code}: ${apiResponse.msg}`,
          response.status,
          apiResponse.code,
          apiResponse.msg || 'Unknown error'
        );
      }

      const results: T[] = [];
      for (const capability of apiResponse.payload.capabilities) {
        if (capability.type.includes('dynamic_scene') && capability.instance === instanceName) {
          for (const option of capability.parameters.options) {
            const parsedValue = this.parseStructuredDynamicSceneValue(option.value);
            if (!parsedValue) {
              this.logger?.debug(
                {
                  deviceId,
                  sku,
                  instance: instanceName,
                  optionName: option.name,
                  value: option.value,
                },
                'Skipping dynamic scene entry with unsupported value shape'
              );
              continue;
            }

            const result = factory({ name: option.name, value: parsedValue });
            if (result) {
              results.push(result);
            }
          }
        }
      }

      this.logger?.info(
        { deviceId, sku, count: results.length },
        `Successfully fetched ${instanceName} entries`
      );
      return results;
    } catch (error) {
      this.logger?.error(error, `Failed to fetch ${instanceName} entries`);
      throw error;
    }
  }

  private async findSnapshotsFromDeviceCapabilities(
    deviceId: string,
    sku: string
  ): Promise<Snapshot[]> {
    this.validateDeviceParams(deviceId, sku);
    this.logger?.info({ deviceId, sku }, 'Fetching snapshot entries from device capabilities');

    const devices = await this.findAll();
    const device = devices.find(entry => entry.deviceId === deviceId && entry.model === sku);
    if (!device) {
      return [];
    }

    const snapshots: Snapshot[] = [];
    const addOptions = (options: Array<{ name: string; value: unknown }> | undefined) => {
      if (!Array.isArray(options)) return;

      for (const option of options) {
        const parsedValue = this.parseStructuredDynamicSceneValue(option.value);
        if (!parsedValue) {
          this.logger?.debug(
            { deviceId, sku, instance: 'snapshot', optionName: option.name, value: option.value },
            'Skipping snapshot device capability entry with unsupported value shape'
          );
          continue;
        }

        snapshots.push(new Snapshot(parsedValue.id, parsedValue.paramId, option.name));
      }
    };

    for (const capability of device.capabilities) {
      if (!capability.type.includes('dynamic_scene') || capability.instance !== 'snapshot') {
        continue;
      }

      addOptions(capability.parameters?.options);
      for (const field of capability.parameters?.fields ?? []) {
        addOptions(field.options);
      }
    }

    this.logger?.info(
      { deviceId, sku, count: snapshots.length },
      'Successfully fetched snapshot entries from device capabilities'
    );
    return snapshots;
  }
  private validateDeviceParams(deviceId: string, sku: string): void {
    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      throw new Error('Device ID must be a non-empty string');
    }
    if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
      throw new Error('SKU must be a non-empty string');
    }
  }

  private parseStructuredDynamicSceneValue(value: unknown): { id: number; paramId: number } | null {
    if (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      'paramId' in value &&
      typeof value.id === 'number' &&
      Number.isInteger(value.id) &&
      value.id > 0 &&
      typeof value.paramId === 'number' &&
      Number.isInteger(value.paramId) &&
      value.paramId > 0
    ) {
      return {
        id: value.id,
        paramId: value.paramId,
      };
    }

    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return { id: value, paramId: value };
    }

    return null;
  }

  private convertCommandToCapability(command: Command): {
    type: string;
    instance: string;
    value: unknown;
  } {
    const cmdObj = command.toObject();

    // Map command names to capability types
    const capabilityTypeMap: Record<string, string> = {
      turn: 'devices.capabilities.on_off',
      brightness: 'devices.capabilities.range',
      color: 'devices.capabilities.color_setting',
      colorTem: 'devices.capabilities.color_setting',
      lightScene: 'devices.capabilities.dynamic_scene',
      snapshot: 'devices.capabilities.dynamic_scene',
      diyScene: 'devices.capabilities.dynamic_scene',
      segmentedColorRgb: 'devices.capabilities.segment_color_setting',
      segmentedBrightness: 'devices.capabilities.segment_color_setting',
      musicMode: 'devices.capabilities.music_setting',
      nightlightToggle: 'devices.capabilities.toggle',
      gradientToggle: 'devices.capabilities.toggle',
      sceneStageToggle: 'devices.capabilities.toggle',
      nightlightScene: 'devices.capabilities.mode',
      presetScene: 'devices.capabilities.mode',
    };

    // Map instances correctly according to Govee API specification
    let instance: string;
    let value: unknown;

    if (cmdObj.name === 'turn') {
      instance = 'powerSwitch';
      value = cmdObj.value === 'on' ? 1 : 0;
    } else if (cmdObj.name === 'color') {
      instance = 'colorRgb';
      value = this.packColorRgbValue(cmdObj.value);
    } else if (cmdObj.name === 'colorTem') {
      instance = 'colorTemperatureK';
      value = cmdObj.value;
    } else if (cmdObj.name === 'lightScene') {
      instance = 'lightScene';
      value = cmdObj.value;
    } else if (cmdObj.name === 'snapshot') {
      instance = 'snapshot';
      value = cmdObj.value;
    } else if (cmdObj.name === 'diyScene') {
      instance = 'diyScene';
      value = cmdObj.value;
    } else if (cmdObj.name === 'segmentedColorRgb') {
      instance = 'segmentedColorRgb';
      value = cmdObj.value;
    } else if (cmdObj.name === 'segmentedBrightness') {
      instance = 'segmentedBrightness';
      value = cmdObj.value;
    } else if (cmdObj.name === 'musicMode') {
      instance = 'musicMode';
      value = cmdObj.value;
    } else if (
      cmdObj.name === 'nightlightToggle' ||
      cmdObj.name === 'gradientToggle' ||
      cmdObj.name === 'sceneStageToggle'
    ) {
      instance = cmdObj.name;
      value = cmdObj.value;
    } else if (cmdObj.name === 'nightlightScene' || cmdObj.name === 'presetScene') {
      instance = cmdObj.name;
      value = cmdObj.value;
    } else {
      instance = cmdObj.name;
      value = cmdObj.value;
    }

    return {
      type: capabilityTypeMap[cmdObj.name] || `devices.capabilities.${cmdObj.name}`,
      instance,
      value,
    };
  }

  private packColorRgbValue(value: unknown): unknown {
    if (
      typeof value === 'object' &&
      value !== null &&
      'r' in value &&
      'g' in value &&
      'b' in value &&
      typeof value.r === 'number' &&
      typeof value.g === 'number' &&
      typeof value.b === 'number'
    ) {
      return value.r * 65536 + value.g * 256 + value.b;
    }

    return value;
  }

  private unpackColorRgbValue(value: unknown): { r: number; g: number; b: number } {
    if (typeof value === 'number') {
      return {
        r: Math.floor(value / 65536) & 0xff,
        g: Math.floor(value / 256) & 0xff,
        b: value & 0xff,
      };
    }

    return value as { r: number; g: number; b: number };
  }

  /**
   * Read the device's actual online state from the `devices.capabilities.online`
   * capability if present. Returns true when the capability is missing so we
   * don't regress behavior for devices that don't report online state yet
   * still respond to the state endpoint.
   */
  private parseOnlineState(
    capabilities: Array<{ type: string; instance: string; state: { value: unknown } }>
  ): boolean {
    for (const capability of capabilities) {
      if (capability.type.includes('online')) {
        const value = capability.state.value;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
          const lowered = value.toLowerCase();
          if (lowered === 'true' || lowered === 'online' || lowered === '1') return true;
          if (lowered === 'false' || lowered === 'offline' || lowered === '0') return false;
        }
      }
    }
    return true;
  }

  private parsePowerSwitch(value: unknown): 'on' | 'off' | undefined {
    if (value === 1 || value === true || value === 'on') {
      return 'on';
    }

    if (value === 0 || value === false || value === 'off') {
      return 'off';
    }

    return undefined;
  }

  private parseBrightness(value: unknown): Brightness | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
      return undefined;
    }

    return new Brightness(Math.round(value));
  }

  private parseColorTemperature(value: unknown): ColorTemperature | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 1000 || value > 50000) {
      return undefined;
    }

    return new ColorTemperature(Math.round(value));
  }

  private parseLightSceneValue(value: unknown): LightScene | undefined {
    const parsedValue = this.parseStructuredDynamicSceneValue(value);
    if (!parsedValue) {
      return undefined;
    }

    return new LightScene(parsedValue.id, parsedValue.paramId, 'Current Scene');
  }

  private parseMusicModeValue(value: unknown): MusicMode | undefined {
    if (typeof value === 'object' && value !== null) {
      if (
        'modeId' in value &&
        typeof value.modeId === 'number' &&
        Number.isInteger(value.modeId) &&
        value.modeId > 0
      ) {
        const sensitivity =
          'sensitivity' in value && typeof value.sensitivity === 'number'
            ? value.sensitivity
            : undefined;
        return new MusicMode(value.modeId, sensitivity);
      }

      if (
        'musicMode' in value &&
        typeof value.musicMode === 'number' &&
        Number.isInteger(value.musicMode) &&
        value.musicMode > 0
      ) {
        const sensitivity =
          'sensitivity' in value && typeof value.sensitivity === 'number'
            ? value.sensitivity
            : undefined;
        return new MusicMode(value.musicMode, sensitivity);
      }
    }

    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return new MusicMode(value);
    }

    return undefined;
  }

  private mapCapabilitiesToStateProperties(
    capabilities: Array<{ type: string; instance: string; state: { value: unknown } }>
  ): Record<string, StateProperty> {
    const result: Record<string, StateProperty> = {};

    for (const capability of capabilities) {
      if (capability.type.includes('on_off')) {
        const powerSwitch = this.parsePowerSwitch(capability.state.value);
        if (powerSwitch) {
          result.powerSwitch = { value: powerSwitch };
        }
      } else if (capability.type.includes('range') && capability.instance === 'brightness') {
        const brightness = this.parseBrightness(capability.state.value);
        if (brightness) {
          result.brightness = { value: brightness };
        }
      } else if (capability.type.includes('color_setting')) {
        if (capability.instance === 'colorRgb') {
          result.color = {
            value: ColorRgb.fromObject(this.unpackColorRgbValue(capability.state.value)),
          };
        } else if (capability.instance === 'colorTemperatureK') {
          const colorTemperature = this.parseColorTemperature(capability.state.value);
          if (colorTemperature) {
            result.colorTem = { value: colorTemperature };
          }
        }
      } else if (
        capability.type.includes('dynamic_scene') &&
        capability.instance === 'lightScene'
      ) {
        const lightScene = this.parseLightSceneValue(capability.state.value);
        if (lightScene) {
          result.lightScene = { value: lightScene };
        }
      } else if (capability.type.includes('segment_color_setting')) {
        if (capability.instance === 'segmentedColorRgb') {
          const groups = capability.state.value as Array<{
            segment: number | number[];
            rgb: unknown;
          }>;
          const flatSegments: SegmentColor[] = [];
          for (const group of groups) {
            const color = ColorRgb.fromObject(this.unpackColorRgbValue(group.rgb));
            const indices = Array.isArray(group.segment) ? group.segment : [group.segment];
            for (const index of indices) {
              flatSegments.push(new SegmentColor(index, color));
            }
          }
          result.segmentedColorRgb = {
            value: flatSegments,
          };
        } else if (capability.instance === 'segmentedBrightness') {
          const segments = capability.state.value as Array<{
            segment: number;
            brightness: number;
          }>;
          result.segmentedBrightness = {
            value: segments.map(seg => ({
              index: seg.segment,
              brightness: new Brightness(seg.brightness),
            })),
          };
        }
      } else if (capability.type.includes('music_setting') && capability.instance === 'musicMode') {
        const musicMode = this.parseMusicModeValue(capability.state.value);
        if (musicMode) {
          result.musicMode = { value: musicMode };
        }
      } else if (capability.type.includes('toggle')) {
        if (capability.instance === 'nightlightToggle') {
          result.nightlightToggle = {
            value: capability.state.value === 1 || capability.state.value === true,
          };
        } else if (capability.instance === 'gradientToggle') {
          result.gradientToggle = {
            value: capability.state.value === 1 || capability.state.value === true,
          };
        } else if (capability.instance === 'sceneStageToggle') {
          result.sceneStageToggle = {
            value: capability.state.value === 1 || capability.state.value === true,
          };
        }
      } else if (capability.type.includes('mode')) {
        if (capability.instance === 'nightlightScene') {
          result.nightlightScene = { value: capability.state.value as string | number };
        } else if (capability.instance === 'presetScene') {
          result.presetScene = { value: capability.state.value as string | number };
        }
      }
    }

    return result;
  }
}

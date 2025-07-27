import axios, { AxiosInstance, AxiosError } from 'axios';
import { Logger } from 'pino';
import { IGoveeDeviceRepository } from '../domain/repositories/IGoveeDeviceRepository';
import { GoveeDevice } from '../domain/entities/GoveeDevice';
import {
  DeviceState,
  PowerState,
  ColorState,
  ColorTemperatureState,
  BrightnessState,
} from '../domain/entities/DeviceState';
import { Command } from '../domain/entities/Command';
import { ColorRgb, ColorTemperature, Brightness } from '../domain/value-objects';
import { GoveeApiError, InvalidApiKeyError, RateLimitError, NetworkError } from '../errors';

interface GoveeApiConfig {
  apiKey: string;
  timeout?: number;
  logger?: Logger;
}

interface GoveeDeviceResponse {
  deviceId: string;
  model: string;
  deviceName: string;
  controllable: boolean;
  retrievable: boolean;
  supportCmds: string[];
}

interface GoveeDevicesResponse {
  code: number;
  message: string;
  data: {
    devices: GoveeDeviceResponse[];
  };
}

interface GoveeStateProperty {
  online: boolean;
  powerSwitch: number;
  brightness?: number;
  color?: { r: number; g: number; b: number };
  colorTem?: number;
}

interface GoveeStateResponse {
  code: number;
  message: string;
  data: {
    device: string;
    model: string;
    properties: GoveeStateProperty[];
  };
}

interface GoveeCommandRequest {
  device: string;
  model: string;
  cmd: {
    name: string;
    value: unknown;
  };
}

interface GoveeCommandResponse {
  code: number;
  message: string;
  data?: unknown;
}

export class GoveeDeviceRepository implements IGoveeDeviceRepository {
  private readonly httpClient: AxiosInstance;
  private readonly logger: Logger | undefined;
  private static readonly BASE_URL = 'https://developer-api.govee.com/v1';

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
      const response = await this.httpClient.get<GoveeDevicesResponse>('/devices');
      const apiResponse = response.data;

      if (apiResponse.code !== 200) {
        throw new GoveeApiError(
          `API returned error code ${apiResponse.code}: ${apiResponse.message}`,
          response.status,
          apiResponse.code,
          apiResponse.message
        );
      }

      const devices = apiResponse.data.devices
        .filter(device => {
          if (
            !device.deviceId ||
            typeof device.deviceId !== 'string' ||
            device.deviceId.trim().length === 0
          ) {
            this.logger?.warn(
              { device: { ...device, deviceId: '[INVALID]' } },
              'Filtering out device with invalid device ID'
            );
            return false;
          }
          if (
            !device.model ||
            typeof device.model !== 'string' ||
            device.model.trim().length === 0
          ) {
            this.logger?.warn(
              { device: { ...device, model: '[INVALID]' } },
              'Filtering out device with invalid model'
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
          if (!Array.isArray(device.supportCmds)) {
            this.logger?.warn(
              { device: { ...device, supportCmds: '[INVALID]' } },
              'Filtering out device with invalid supported commands'
            );
            return false;
          }
          for (const cmd of device.supportCmds) {
            if (typeof cmd !== 'string' || cmd.trim().length === 0) {
              this.logger?.warn(
                { device: { ...device, supportCmds: '[INVALID]' } },
                'Filtering out device with invalid supported command'
              );
              return false;
            }
          }
          return true;
        })
        .map(
          device =>
            new GoveeDevice(
              device.deviceId,
              device.model,
              device.deviceName,
              device.controllable,
              device.retrievable,
              device.supportCmds
            )
        );

      const totalDevicesFromApi = apiResponse.data.devices.length;
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

  async findState(deviceId: string, model: string): Promise<DeviceState> {
    this.validateDeviceParams(deviceId, model);
    this.logger?.info({ deviceId, model }, 'Fetching device state');

    try {
      const response = await this.httpClient.get<GoveeStateResponse>(
        `/devices/state?device=${encodeURIComponent(deviceId)}&model=${encodeURIComponent(model)}`
      );
      const apiResponse = response.data;

      if (apiResponse.code !== 200) {
        throw new GoveeApiError(
          `API returned error code ${apiResponse.code}: ${apiResponse.message}`,
          response.status,
          apiResponse.code,
          apiResponse.message
        );
      }

      const properties = this.parseStateProperties(apiResponse.data.properties);
      const online = properties.online ?? true;

      const deviceState = new DeviceState(
        deviceId,
        model,
        online,
        this.mapToStateProperties(properties)
      );

      this.logger?.info({ deviceId, model, online }, 'Successfully fetched device state');
      return deviceState;
    } catch (error) {
      this.logger?.error(error, 'Failed to fetch device state');
      throw error;
    }
  }

  async sendCommand(deviceId: string, model: string, command: Command): Promise<void> {
    this.validateDeviceParams(deviceId, model);
    this.logger?.info(
      { deviceId, model, command: command.toObject() },
      'Sending command to device'
    );

    const requestBody: GoveeCommandRequest = {
      device: deviceId,
      model: model,
      cmd: command.toObject(),
    };

    try {
      const response = await this.httpClient.put<GoveeCommandResponse>(
        '/devices/control',
        requestBody
      );
      const apiResponse = response.data;

      if (apiResponse.code !== 200) {
        throw new GoveeApiError(
          `API returned error code ${apiResponse.code}: ${apiResponse.message}`,
          response.status,
          apiResponse.code,
          apiResponse.message
        );
      }

      this.logger?.info({ deviceId, model }, 'Successfully sent command to device');
    } catch (error) {
      this.logger?.error(error, 'Failed to send command to device');
      throw error;
    }
  }

  private validateDeviceParams(deviceId: string, model: string): void {
    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      throw new Error('Device ID must be a non-empty string');
    }
    if (!model || typeof model !== 'string' || model.trim().length === 0) {
      throw new Error('Model must be a non-empty string');
    }
  }

  private parseStateProperties(properties: GoveeStateProperty[]): GoveeStateProperty {
    // Govee API returns an array of property objects, but typically contains a single object
    // with all the device properties
    return properties.reduce((acc, prop) => ({ ...acc, ...prop }), {} as GoveeStateProperty);
  }

  private mapToStateProperties(
    properties: GoveeStateProperty
  ): Record<string, PowerState | ColorState | ColorTemperatureState | BrightnessState> {
    const result: Record<
      string,
      PowerState | ColorState | ColorTemperatureState | BrightnessState
    > = {};

    // Map power state
    if (typeof properties.powerSwitch === 'number') {
      result.powerSwitch = { value: properties.powerSwitch === 1 ? 'on' : 'off' };
    }

    // Map brightness
    if (typeof properties.brightness === 'number') {
      result.brightness = { value: new Brightness(properties.brightness) };
    }

    // Map color
    if (properties.color && typeof properties.color === 'object') {
      result.color = { value: ColorRgb.fromObject(properties.color) };
    }

    // Map color temperature
    if (typeof properties.colorTem === 'number') {
      result.colorTem = { value: new ColorTemperature(properties.colorTem) };
    }

    return result;
  }
}

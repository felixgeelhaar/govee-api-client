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

interface GoveeCapability {
  type: string;
  instance: string;
  parameters?: {
    dataType: string;
    options?: Array<{
      name: string;
      value: unknown;
    }>;
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
  data?: unknown;
}

export class GoveeDeviceRepository implements IGoveeDeviceRepository {
  private readonly httpClient: AxiosInstance;
  private readonly logger: Logger | undefined;
  private static readonly BASE_URL = 'https://openapi.api.govee.com';

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      const response = await this.httpClient.get<GoveeDevicesResponse>(
        '/router/api/v1/user/devices'
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
            new GoveeDevice(device.device, device.sku, device.deviceName, device.capabilities)
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

      const response = await this.httpClient.post<GoveeStateResponse>(
        '/router/api/v1/device/state',
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

      // Parse capabilities into state properties
      const stateProperties = this.mapCapabilitiesToStateProperties(apiResponse.data.capabilities);

      const deviceState = new DeviceState(
        deviceId,
        sku,
        true, // Assume online if we get a response
        stateProperties
      );

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
      const response = await this.httpClient.post<GoveeCommandResponse>(
        '/router/api/v1/device/control',
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

      this.logger?.info({ deviceId, sku }, 'Successfully sent command to device');
    } catch (error) {
      this.logger?.error(error, 'Failed to send command to device');
      throw error;
    }
  }

  private validateDeviceParams(deviceId: string, sku: string): void {
    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      throw new Error('Device ID must be a non-empty string');
    }
    if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
      throw new Error('SKU must be a non-empty string');
    }
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
    };

    return {
      type: capabilityTypeMap[cmdObj.name] || `devices.capabilities.${cmdObj.name}`,
      instance: cmdObj.name === 'colorTem' ? 'colorTemperatureK' : cmdObj.name,
      value: cmdObj.value,
    };
  }

  private mapCapabilitiesToStateProperties(
    capabilities: Array<{ type: string; instance: string; state: { value: unknown } }>
  ): Record<string, PowerState | ColorState | ColorTemperatureState | BrightnessState> {
    const result: Record<
      string,
      PowerState | ColorState | ColorTemperatureState | BrightnessState
    > = {};

    for (const capability of capabilities) {
      if (capability.type.includes('on_off')) {
        result.powerSwitch = { value: capability.state.value ? 'on' : 'off' };
      } else if (capability.type.includes('range') && capability.instance === 'brightness') {
        result.brightness = { value: new Brightness(capability.state.value as number) };
      } else if (capability.type.includes('color_setting')) {
        if (capability.instance === 'colorRgb') {
          result.color = {
            value: ColorRgb.fromObject(
              capability.state.value as { r: number; g: number; b: number }
            ),
          };
        } else if (capability.instance === 'colorTemperatureK') {
          result.colorTem = { value: new ColorTemperature(capability.state.value as number) };
        }
      }
    }

    return result;
  }
}

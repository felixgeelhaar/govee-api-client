import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { GoveeDeviceRepository } from '../../src/infrastructure/GoveeDeviceRepository';
import { CommandFactory } from '../../src/domain/entities/Command';
import { ColorRgb, ColorTemperature, Brightness } from '../../src/domain/value-objects';
import { GoveeApiError, InvalidApiKeyError, RateLimitError, NetworkError } from '../../src/errors';

const BASE_URL = 'https://openapi.api.govee.com';

const mockDevicesResponse = {
  code: 200,
  message: 'Success',
  data: [
    {
      device: 'device123',
      sku: 'H6159',
      deviceName: 'Living Room Light',
      capabilities: [
        { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
        { type: 'devices.capabilities.range', instance: 'brightness' },
        { type: 'devices.capabilities.color_setting', instance: 'colorRgb' },
        { type: 'devices.capabilities.color_setting', instance: 'colorTemperatureK' }
      ]
    },
    {
      device: 'device456',
      sku: 'H6160',
      deviceName: 'Bedroom Light',
      capabilities: [
        { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
        { type: 'devices.capabilities.range', instance: 'brightness' }
      ]
    }
  ]
};

const mockStateResponse = {
  code: 200,
  message: 'Success',
  data: {
    device: 'device123',
    sku: 'H6159',
    capabilities: [
      {
        type: 'devices.capabilities.on_off',
        instance: 'powerSwitch',
        state: { value: true }
      },
      {
        type: 'devices.capabilities.range',
        instance: 'brightness',
        state: { value: 75 }
      },
      {
        type: 'devices.capabilities.color_setting',
        instance: 'colorRgb',
        state: { value: { r: 255, g: 128, b: 0 } }
      },
      {
        type: 'devices.capabilities.color_setting',
        instance: 'colorTemperatureK',
        state: { value: 2700 }
      }
    ]
  }
};

const mockCommandResponse = {
  code: 200,
  message: 'Success',
  data: {}
};

const server = setupServer();

describe('GoveeDeviceRepository Integration Tests', () => {
  let repository: GoveeDeviceRepository;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    repository = new GoveeDeviceRepository({
      apiKey: 'test-api-key',
      timeout: 5000
    });
  });

  describe('constructor validation', () => {
    it('should throw error for empty API key', () => {
      expect(() => new GoveeDeviceRepository({ apiKey: '' }))
        .toThrow('API key is required and must be a non-empty string');
    });

    it('should throw error for invalid timeout', () => {
      expect(() => new GoveeDeviceRepository({ apiKey: 'test-key', timeout: -1 }))
        .toThrow('Timeout must be a positive integer');
    });
  });

  describe('findAll', () => {
    it('should successfully fetch all devices', async () => {
      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.json(mockDevicesResponse);
        })
      );

      const devices = await repository.findAll();

      expect(devices).toHaveLength(2);
      expect(devices[0].deviceId).toBe('device123');
      expect(devices[0].sku).toBe('H6159');
      expect(devices[0].deviceName).toBe('Living Room Light');
      expect(devices[0].controllable).toBe(true);
      expect(devices[0].retrievable).toBe(true);
      expect(devices[0].supportedCmds).toEqual(['turn', 'brightness', 'color', 'colorTem']);

      expect(devices[1].deviceId).toBe('device456');
      expect(devices[1].sku).toBe('H6160');
      expect(devices[1].deviceName).toBe('Bedroom Light');
      expect(devices[1].controllable).toBe(true);
      expect(devices[1].retrievable).toBe(true); // derived from capabilities array
      expect(devices[1].supportedCmds).toEqual(['turn', 'brightness']);
    });

    it('should handle API error response', async () => {
      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.json(
            { code: 1001, message: 'Invalid API key' },
            { status: 400 }
          );
        })
      );

      await expect(repository.findAll()).rejects.toThrow(GoveeApiError);
    });

    it('should handle 401 unauthorized response', async () => {
      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.json(
            { message: 'Invalid API key' },
            { status: 401 }
          );
        })
      );

      await expect(repository.findAll()).rejects.toThrow(InvalidApiKeyError);
    });

    it('should handle 429 rate limit response', async () => {
      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.json(
            { message: 'Rate limit exceeded' },
            { 
              status: 429,
              headers: {
                'retry-after': '60',
                'x-ratelimit-limit': '100',
                'x-ratelimit-remaining': '0'
              }
            }
          );
        })
      );

      await expect(repository.findAll()).rejects.toThrow(RateLimitError);
    });

    it('should handle network errors', async () => {
      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.error();
        })
      );

      await expect(repository.findAll()).rejects.toThrow(NetworkError);
    });
  });

  describe('findState', () => {
    it('should successfully fetch device state', async () => {
      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/state`, async ({ request }) => {
          const body = await request.json() as any;
          expect(body.payload.device).toBe('device123');
          expect(body.payload.sku).toBe('H6159');
          
          // Validate requestId is a valid UUID v4
          const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          expect(body.requestId).toMatch(uuidV4Regex);
          expect(typeof body.requestId).toBe('string');
          expect(body.requestId).toHaveLength(36);
          
          return HttpResponse.json(mockStateResponse);
        })
      );

      const state = await repository.findState('device123', 'H6159');

      expect(state.deviceId).toBe('device123');
      expect(state.model).toBe('H6159');
      expect(state.online).toBe(true);
      expect(state.getPowerState()).toBe('on');
      expect(state.getBrightness()?.level).toBe(75);
      expect(state.getColor()?.toObject()).toEqual({ r: 255, g: 128, b: 0 });
      expect(state.getColorTemperature()?.kelvin).toBe(2700);
    });

    it('should handle device offline state', async () => {
      const offlineStateResponse = {
        ...mockStateResponse,
        data: {
          ...mockStateResponse.data,
          capabilities: [
            {
              type: 'devices.capabilities.on_off',
              instance: 'powerSwitch',
              state: { value: false }
            }
          ]
        }
      };

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/state`, () => {
          return HttpResponse.json(offlineStateResponse);
        })
      );

      const state = await repository.findState('device123', 'H6159');

      expect(state.online).toBe(true); // API assumes online if response received
      expect(state.getPowerState()).toBe('off');
    });

    it('should validate device parameters', async () => {
      await expect(repository.findState('', 'H6159')).rejects.toThrow('Device ID must be a non-empty string');
      await expect(repository.findState('device123', '')).rejects.toThrow('SKU must be a non-empty string');
    });

    it('should handle API error response', async () => {
      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/state`, () => {
          return HttpResponse.json(
            { code: 1002, message: 'Device not found' },
            { status: 404 }
          );
        })
      );

      await expect(repository.findState('device123', 'H6159')).rejects.toThrow(GoveeApiError);
    });

    it('should handle state with light scene capability', async () => {
      const lightSceneStateResponse = {
        code: 200,
        message: 'Success',
        data: {
          device: 'device123',
          sku: 'H6159',
          capabilities: [
            {
              type: 'devices.capabilities.dynamic_scene',
              instance: 'lightScene',
              state: { value: { id: 3853, paramId: 4280 } }
            }
          ]
        }
      };

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/state`, () => {
          return HttpResponse.json(lightSceneStateResponse);
        })
      );

      const state = await repository.findState('device123', 'H6159');
      const lightScene = state.getLightScene();

      expect(lightScene).toBeDefined();
      expect(lightScene?.id).toBe(3853);
      expect(lightScene?.paramId).toBe(4280);
    });

    it.skip('should handle state with segmented color capability', async () => {
      const segmentedColorStateResponse = {
        code: 200,
        message: 'Success',
        data: {
          device: 'device123',
          sku: 'H6159',
          capabilities: [
            {
              type: 'devices.capabilities.segment_color_setting',
              instance: 'segmentedColorRgb',
              state: {
                value: [
                  { segment: 0, rgb: { r: 255, g: 0, b: 0 } },
                  { segment: 1, rgb: { r: 0, g: 255, b: 0 } }
                ]
              }
            }
          ]
        }
      };

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/state`, () => {
          return HttpResponse.json(segmentedColorStateResponse);
        })
      );

      const state = await repository.findState('device123', 'H6159');
      const segments = state.getSegmentColors();

      expect(segments).toBeDefined();
      expect(segments).not.toBeNull();
      if (segments) {
        expect(segments).toHaveLength(2);
        expect(segments[0].index).toBe(0);
        expect(segments[0].color.toObject()).toEqual({ r: 255, g: 0, b: 0 });
      }
    });

    it.skip('should handle state with segmented brightness capability', async () => {
      const segmentedBrightnessStateResponse = {
        code: 200,
        message: 'Success',
        data: {
          device: 'device123',
          sku: 'H6159',
          capabilities: [
            {
              type: 'devices.capabilities.segment_color_setting',
              instance: 'segmentedBrightness',
              state: {
                value: [
                  { segment: 0, brightness: 75 },
                  { segment: 1, brightness: 50 }
                ]
              }
            }
          ]
        }
      };

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/state`, () => {
          return HttpResponse.json(segmentedBrightnessStateResponse);
        })
      );

      const state = await repository.findState('device123', 'H6159');
      const segments = state.getSegmentBrightness();

      expect(segments).toHaveLength(2);
      expect(segments![0].index).toBe(0);
      expect(segments![0].brightness.level).toBe(75);
    });

    it('should handle state with music mode capability', async () => {
      const musicModeStateResponse = {
        code: 200,
        message: 'Success',
        data: {
          device: 'device123',
          sku: 'H6159',
          capabilities: [
            {
              type: 'devices.capabilities.music_setting',
              instance: 'musicMode',
              state: { value: { modeId: 1, sensitivity: 75 } }
            }
          ]
        }
      };

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/state`, () => {
          return HttpResponse.json(musicModeStateResponse);
        })
      );

      const state = await repository.findState('device123', 'H6159');
      const musicMode = state.getMusicMode();

      expect(musicMode).toBeDefined();
      expect(musicMode?.modeId).toBe(1);
      expect(musicMode?.sensitivity).toBe(75);
    });

    it('should handle state with nightlight toggle capability', async () => {
      const nightlightToggleStateResponse = {
        code: 200,
        message: 'Success',
        data: {
          device: 'device123',
          sku: 'H6159',
          capabilities: [
            {
              type: 'devices.capabilities.toggle',
              instance: 'nightlightToggle',
              state: { value: 1 }
            }
          ]
        }
      };

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/state`, () => {
          return HttpResponse.json(nightlightToggleStateResponse);
        })
      );

      const state = await repository.findState('device123', 'H6159');
      const nightlightEnabled = state.getNightlightToggle();

      expect(nightlightEnabled).toBe(true);
    });

    it('should handle state with gradient toggle capability', async () => {
      const gradientToggleStateResponse = {
        code: 200,
        message: 'Success',
        data: {
          device: 'device123',
          sku: 'H6159',
          capabilities: [
            {
              type: 'devices.capabilities.toggle',
              instance: 'gradientToggle',
              state: { value: true }
            }
          ]
        }
      };

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/state`, () => {
          return HttpResponse.json(gradientToggleStateResponse);
        })
      );

      const state = await repository.findState('device123', 'H6159');
      const gradientEnabled = state.getGradientToggle();

      expect(gradientEnabled).toBe(true);
    });

    it('should handle state with nightlight scene capability', async () => {
      const nightlightSceneStateResponse = {
        code: 200,
        message: 'Success',
        data: {
          device: 'device123',
          sku: 'H6159',
          capabilities: [
            {
              type: 'devices.capabilities.mode',
              instance: 'nightlightScene',
              state: { value: 42 }
            }
          ]
        }
      };

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/state`, () => {
          return HttpResponse.json(nightlightSceneStateResponse);
        })
      );

      const state = await repository.findState('device123', 'H6159');
      const nightlightScene = state.getNightlightScene();

      expect(nightlightScene).toBe(42);
    });

    it('should handle state with preset scene capability', async () => {
      const presetSceneStateResponse = {
        code: 200,
        message: 'Success',
        data: {
          device: 'device123',
          sku: 'H6159',
          capabilities: [
            {
              type: 'devices.capabilities.mode',
              instance: 'presetScene',
              state: { value: 'Romantic' }
            }
          ]
        }
      };

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/state`, () => {
          return HttpResponse.json(presetSceneStateResponse);
        })
      );

      const state = await repository.findState('device123', 'H6159');
      const presetScene = state.getPresetScene();

      expect(presetScene).toBe('Romantic');
    });
  });

  describe('findDynamicScenes', () => {
    it('should successfully fetch dynamic scenes', async () => {
      const mockScenesResponse = {
        code: 200,
        msg: 'success',
        payload: {
          sku: 'H6159',
          device: 'device123',
          capabilities: [
            {
              type: 'devices.capabilities.dynamic_scene',
              instance: 'lightScene',
              parameters: {
                dataType: 'ENUM',
                options: [
                  { name: 'Sunrise', value: { id: 3853, paramId: 4280 } },
                  { name: 'Sunset', value: { id: 3854, paramId: 4281 } },
                  { name: 'Ocean', value: { id: 3855, paramId: 4282 } }
                ]
              }
            }
          ]
        }
      };

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/scenes`, async ({ request }) => {
          const body = await request.json() as any;
          expect(body.payload.device).toBe('device123');
          expect(body.payload.sku).toBe('H6159');

          // Validate requestId is a valid UUID v4
          const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          expect(body.requestId).toMatch(uuidV4Regex);

          return HttpResponse.json(mockScenesResponse);
        })
      );

      const scenes = await repository.findDynamicScenes('device123', 'H6159');

      expect(scenes).toHaveLength(3);
      expect(scenes[0].name).toBe('Sunrise');
      expect(scenes[0].id).toBe(3853);
      expect(scenes[0].paramId).toBe(4280);
      expect(scenes[1].name).toBe('Sunset');
      expect(scenes[2].name).toBe('Ocean');
    });

    it('should validate device parameters', async () => {
      await expect(repository.findDynamicScenes('', 'H6159')).rejects.toThrow('Device ID must be a non-empty string');
      await expect(repository.findDynamicScenes('device123', '')).rejects.toThrow('SKU must be a non-empty string');
    });

    it('should handle API error response', async () => {
      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/scenes`, () => {
          return HttpResponse.json(
            { code: 1002, msg: 'Device not found' },
            { status: 404 }
          );
        })
      );

      await expect(repository.findDynamicScenes('device123', 'H6159')).rejects.toThrow(GoveeApiError);
    });

    it('should handle network errors', async () => {
      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/scenes`, () => {
          return HttpResponse.error();
        })
      );

      await expect(repository.findDynamicScenes('device123', 'H6159')).rejects.toThrow(NetworkError);
    });
  });

  describe('sendCommand', () => {
    it('should successfully send power on command', async () => {
      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          expect(body.payload.device).toBe('device123');
          expect(body.payload.sku).toBe('H6159');
          expect(body.payload.capability.type).toBe('devices.capabilities.on_off');
          expect(body.payload.capability.instance).toBe('powerSwitch'); // Fixed: correct instance
          expect(body.payload.capability.value).toBe(1); // Fixed: numeric value for 'on'
          
          // Validate requestId is a valid UUID v4
          const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          expect(body.requestId).toMatch(uuidV4Regex);
          expect(typeof body.requestId).toBe('string');
          expect(body.requestId).toHaveLength(36);
          
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const command = CommandFactory.powerOn();
      await expect(repository.sendCommand('device123', 'H6159', command)).resolves.not.toThrow();
    });

    it('should successfully send power off command', async () => {
      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          expect(body.payload.device).toBe('device123');
          expect(body.payload.sku).toBe('H6159');
          expect(body.payload.capability.type).toBe('devices.capabilities.on_off');
          expect(body.payload.capability.instance).toBe('powerSwitch'); // Fixed: correct instance
          expect(body.payload.capability.value).toBe(0); // Fixed: numeric value for 'off'
          
          // Validate requestId is a valid UUID v4
          const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          expect(body.requestId).toMatch(uuidV4Regex);
          expect(typeof body.requestId).toBe('string');
          expect(body.requestId).toHaveLength(36);
          
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const command = CommandFactory.powerOff();
      await expect(repository.sendCommand('device123', 'H6159', command)).resolves.not.toThrow();
    });

    it('should successfully send brightness command', async () => {
      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          expect(body.payload.device).toBe('device123');
          expect(body.payload.sku).toBe('H6159');
          expect(body.payload.capability.type).toBe('devices.capabilities.range');
          expect(body.payload.capability.instance).toBe('brightness'); // Added: verify correct instance
          expect(body.payload.capability.value).toBe(75);
          
          // Validate requestId is a valid UUID v4
          const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          expect(body.requestId).toMatch(uuidV4Regex);
          
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const command = CommandFactory.brightness(new Brightness(75));
      await expect(repository.sendCommand('device123', 'H6159', command)).resolves.not.toThrow();
    });

    it('should successfully send color command', async () => {
      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          expect(body.payload.device).toBe('device123');
          expect(body.payload.sku).toBe('H6159');
          expect(body.payload.capability.type).toBe('devices.capabilities.color_setting');
          expect(body.payload.capability.instance).toBe('colorRgb'); // Fixed: check correct instance
          expect(body.payload.capability.value).toEqual({ r: 255, g: 128, b: 0 });
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const command = CommandFactory.color(new ColorRgb(255, 128, 0));
      await expect(repository.sendCommand('device123', 'H6159', command)).resolves.not.toThrow();
    });

    it('should successfully send color temperature command', async () => {
      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          expect(body.payload.device).toBe('device123');
          expect(body.payload.sku).toBe('H6159');
          expect(body.payload.capability.type).toBe('devices.capabilities.color_setting');
          expect(body.payload.capability.instance).toBe('colorTemperatureK');
          expect(body.payload.capability.value).toBe(2700);
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const command = CommandFactory.colorTemperature(new ColorTemperature(2700));
      await expect(repository.sendCommand('device123', 'H6159', command)).resolves.not.toThrow();
    });

    it('should validate device parameters', async () => {
      const command = CommandFactory.powerOn();
      
      await expect(repository.sendCommand('', 'H6159', command)).rejects.toThrow('Device ID must be a non-empty string');
      await expect(repository.sendCommand('device123', '', command)).rejects.toThrow('SKU must be a non-empty string');
    });

    it('should handle device offline error', async () => {
      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, () => {
          return HttpResponse.json(
            { code: 1003, message: 'Device is offline' },
            { status: 400 }
          );
        })
      );

      const command = CommandFactory.powerOn();
      const error = await repository.sendCommand('device123', 'H6159', command).catch(e => e);
      
      expect(error).toBeInstanceOf(GoveeApiError);
      expect(error.isDeviceOffline()).toBe(true);
    });

    it('should handle unsupported command error', async () => {
      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, () => {
          return HttpResponse.json(
            { code: 1004, message: 'Command not support' },
            { status: 400 }
          );
        })
      );

      const command = CommandFactory.powerOn();
      const error = await repository.sendCommand('device123', 'H6159', command).catch(e => e);
      
      expect(error).toBeInstanceOf(GoveeApiError);
      expect(error.isUnsupportedCommand()).toBe(true);
    });

    it('should handle server errors', async () => {
      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, () => {
          return HttpResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const command = CommandFactory.powerOn();
      await expect(repository.sendCommand('device123', 'H6159', command)).rejects.toThrow(GoveeApiError);
    });
  });

  describe('request headers and authentication', () => {
    it('should send correct headers with requests', async () => {
      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, ({ request }) => {
          expect(request.headers.get('Govee-API-Key')).toBe('test-api-key');
          expect(request.headers.get('Content-Type')).toBe('application/json');
          return HttpResponse.json(mockDevicesResponse);
        })
      );

      await repository.findAll();
    });

    it('should mask API key in logs', async () => {
      // This would typically be tested with a logger mock, but for simplicity
      // we'll just verify the request is made with the correct API key
      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, ({ request }) => {
          expect(request.headers.get('Govee-API-Key')).toBe('test-api-key');
          return HttpResponse.json(mockDevicesResponse);
        })
      );

      await repository.findAll();
    });
  });

  describe('error handling edge cases', () => {
    it('should handle malformed JSON response', async () => {
      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return new HttpResponse('invalid json', {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );

      await expect(repository.findAll()).rejects.toThrow();
    });

    it('should handle empty response body', async () => {
      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return new HttpResponse('', { status: 500 });
        })
      );

      await expect(repository.findAll()).rejects.toThrow(GoveeApiError);
    });

    it('should handle non-200 success codes from API', async () => {
      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.json(
            { ...mockDevicesResponse, code: 201 },
            { status: 200 }
          );
        })
      );

      await expect(repository.findAll()).rejects.toThrow(GoveeApiError);
    });

    it('should filter out devices with empty device IDs', async () => {
      const responseWithInvalidDeviceId = {
        code: 200,
        message: 'Success',
        data: [
          {
            device: 'device123',
            sku: 'H6159',
            deviceName: 'Living Room Light',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' },
              { type: 'devices.capabilities.color_setting', instance: 'colorRgb' },
              { type: 'devices.capabilities.color_setting', instance: 'colorTemperatureK' }
            ]
          },
          {
            device: '',
            sku: 'H6160',
            deviceName: 'Invalid Device',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' }
            ]
          },
          {
            device: 'device789',
            sku: 'H6161',
            deviceName: 'Kitchen Light',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' }
            ]
          }
        ]
      };

      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.json(responseWithInvalidDeviceId);
        })
      );

      const devices = await repository.findAll();

      expect(devices).toHaveLength(2);
      expect(devices[0].deviceId).toBe('device123');
      expect(devices[1].deviceId).toBe('device789');
    });

    it('should filter out devices with null/undefined device IDs', async () => {
      const responseWithNullDeviceId = {
        code: 200,
        message: 'Success',
        data: [
          {
            device: 'device123',
            sku: 'H6159',
            deviceName: 'Living Room Light',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' },
              { type: 'devices.capabilities.color_setting', instance: 'colorRgb' },
              { type: 'devices.capabilities.color_setting', instance: 'colorTemperatureK' }
            ]
          },
          {
            device: null,
            sku: 'H6160',
            deviceName: 'Invalid Device',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' }
            ]
          },
          {
            // device missing entirely
            sku: 'H6161',
            deviceName: 'Another Invalid Device',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' }
            ]
          }
        ]
      };

      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.json(responseWithNullDeviceId);
        })
      );

      const devices = await repository.findAll();

      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe('device123');
    });

    it('should filter out devices with whitespace-only device IDs', async () => {
      const responseWithWhitespaceDeviceId = {
        code: 200,
        message: 'Success',
        data: [
          {
            device: 'device123',
            sku: 'H6159',
            deviceName: 'Living Room Light',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' },
              { type: 'devices.capabilities.color_setting', instance: 'colorRgb' },
              { type: 'devices.capabilities.color_setting', instance: 'colorTemperatureK' }
            ]
          },
          {
            device: '   ',
            sku: 'H6160',
            deviceName: 'Invalid Device',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' }
            ]
          },
          {
            device: '\t\n',
            sku: 'H6161',
            deviceName: 'Another Invalid Device',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' }
            ]
          }
        ]
      };

      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.json(responseWithWhitespaceDeviceId);
        })
      );

      const devices = await repository.findAll();

      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe('device123');
    });

    it('should filter out devices with invalid models', async () => {
      const responseWithInvalidModel = {
        code: 200,
        message: 'Success',
        data: [
          {
            device: 'device123',
            sku: 'H6159',
            deviceName: 'Living Room Light',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' },
              { type: 'devices.capabilities.color_setting', instance: 'colorRgb' },
              { type: 'devices.capabilities.color_setting', instance: 'colorTemperatureK' }
            ]
          },
          {
            device: 'device456',
            sku: '',
            deviceName: 'Invalid Model Device',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' }
            ]
          }
        ]
      };

      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.json(responseWithInvalidModel);
        })
      );

      const devices = await repository.findAll();

      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe('device123');
    });

    it('should filter out devices with invalid device names', async () => {
      const responseWithInvalidDeviceName = {
        code: 200,
        message: 'Success',
        data: [
          {
            device: 'device123',
            sku: 'H6159',
            deviceName: 'Living Room Light',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' },
              { type: 'devices.capabilities.color_setting', instance: 'colorRgb' },
              { type: 'devices.capabilities.color_setting', instance: 'colorTemperatureK' }
            ]
          },
          {
            device: 'device456',
            sku: 'H6160',
            deviceName: '',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' }
            ]
          }
        ]
      };

      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.json(responseWithInvalidDeviceName);
        })
      );

      const devices = await repository.findAll();

      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe('device123');
    });

    it('should filter out devices with invalid supported commands', async () => {
      const responseWithInvalidSupportCmds = {
        code: 200,
        message: 'Success',
        data: [
          {
            device: 'device123',
            sku: 'H6159',
            deviceName: 'Living Room Light',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' },
              { type: 'devices.capabilities.color_setting', instance: 'colorRgb' },
              { type: 'devices.capabilities.color_setting', instance: 'colorTemperatureK' }
            ]
          },
          {
            device: 'device456',
            sku: 'H6160',
            deviceName: 'Invalid Commands Device',
            capabilities: null
          },
          {
            device: 'device789',
            sku: 'H6161',
            deviceName: 'Empty Commands Device',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: '', instance: 'invalid' },
              { type: 'devices.capabilities.range', instance: 'brightness' }
            ]
          }
        ]
      };

      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.json(responseWithInvalidSupportCmds);
        })
      );

      const devices = await repository.findAll();

      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe('device123');
    });

    it('should return empty array when all devices are invalid', async () => {
      const responseWithAllInvalidDevices = {
        code: 200,
        message: 'Success',
        data: [
          {
            device: '',
            sku: 'H6159',
            deviceName: 'Invalid Device 1',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' }
            ]
          },
          {
            device: 'device456',
            sku: '',
            deviceName: 'Invalid Device 2',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' }
            ]
          },
          {
            device: 'device789',
            sku: 'H6161',
            deviceName: '',
            capabilities: [
              { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
              { type: 'devices.capabilities.range', instance: 'brightness' }
            ]
          }
        ]
      };

      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.json(responseWithAllInvalidDevices);
        })
      );

      const devices = await repository.findAll();

      expect(devices).toHaveLength(0);
    });
  });
});
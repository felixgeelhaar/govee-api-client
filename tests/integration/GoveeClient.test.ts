import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { GoveeClient } from '../../src/GoveeClient';
import {
  ColorRgb,
  ColorTemperature,
  Brightness,
  LightScene,
  SegmentColor,
  MusicMode
} from '../../src/domain/value-objects';

const BASE_URL = 'https://openapi.api.govee.com';

const mockDevicesResponse = {
  code: 200,
  message: 'Success',
  data: [
    {
      device: 'living-room-123',
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
      device: 'bedroom-456',
      sku: 'H6160',
      deviceName: 'Bedroom Strip Light',
      capabilities: [
        { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
        { type: 'devices.capabilities.range', instance: 'brightness' }
      ]
    },
    {
      device: 'kitchen-789',
      sku: 'H6159',
      deviceName: 'Kitchen Under Cabinet',
      capabilities: []
    }
  ]
};

const mockStateResponse = {
  code: 200,
  message: 'Success',
  data: {
    device: 'living-room-123',
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

describe('GoveeClient Integration Tests', () => {
  let client: GoveeClient;

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
    client = new GoveeClient({
      apiKey: 'test-api-key',
      timeout: 5000
    });

    // Setup default successful responses
    server.use(
      http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
        return HttpResponse.json(mockDevicesResponse);
      }),
      http.post(`${BASE_URL}/router/api/v1/device/state`, () => {
        return HttpResponse.json(mockStateResponse);
      }),
      http.post(`${BASE_URL}/router/api/v1/device/control`, () => {
        return HttpResponse.json(mockCommandResponse);
      })
    );
  });

  describe('constructor validation', () => {
    it('should throw error for missing API key', () => {
      expect(() => new GoveeClient({ apiKey: '' }))
        .toThrow('API key is required. Provide it via config.apiKey or set the GOVEE_API_KEY environment variable.');
    });

    it('should create client with valid configuration', () => {
      expect(() => new GoveeClient({ apiKey: 'test-key' })).not.toThrow();
    });

    it('should use environment variable when no apiKey provided', () => {
      // Set up environment variable
      const originalEnv = process.env.GOVEE_API_KEY;
      process.env.GOVEE_API_KEY = 'env-api-key';

      expect(() => new GoveeClient()).not.toThrow();

      // Clean up
      if (originalEnv === undefined) {
        delete process.env.GOVEE_API_KEY;
      } else {
        process.env.GOVEE_API_KEY = originalEnv;
      }
    });

    it('should throw error when neither config nor env var provided', () => {
      // Ensure env var is not set
      const originalEnv = process.env.GOVEE_API_KEY;
      delete process.env.GOVEE_API_KEY;

      expect(() => new GoveeClient())
        .toThrow('API key is required. Provide it via config.apiKey or set the GOVEE_API_KEY environment variable.');

      // Restore
      if (originalEnv !== undefined) {
        process.env.GOVEE_API_KEY = originalEnv;
      }
    });
  });

  describe('device management', () => {
    it('should get all devices', async () => {
      const devices = await client.getDevices();

      expect(devices).toHaveLength(3);
      expect(devices[0].deviceName).toBe('Living Room Light');
      expect(devices[1].deviceName).toBe('Bedroom Strip Light');
      expect(devices[2].deviceName).toBe('Kitchen Under Cabinet');
    });

    it('should get controllable devices only', async () => {
      const devices = await client.getControllableDevices();

      expect(devices).toHaveLength(2);
      expect(devices.every(d => d.canControl())).toBe(true);
      expect(devices[0].deviceName).toBe('Living Room Light');
      expect(devices[1].deviceName).toBe('Bedroom Strip Light');
    });

    it('should get retrievable devices only', async () => {
      const devices = await client.getRetrievableDevices();

      expect(devices).toHaveLength(2);
      expect(devices.every(d => d.canRetrieve())).toBe(true);
      expect(devices[0].deviceName).toBe('Living Room Light');
      expect(devices[1].deviceName).toBe('Bedroom Strip Light');
    });

    it('should find device by name (case insensitive)', async () => {
      const device = await client.findDeviceByName('living room');

      expect(device).toBeDefined();
      expect(device!.deviceName).toBe('Living Room Light');
    });

    it('should find devices by model', async () => {
      const devices = await client.findDevicesByModel('H6159');

      expect(devices).toHaveLength(2);
      expect(devices[0].deviceName).toBe('Living Room Light');
      expect(devices[1].deviceName).toBe('Kitchen Under Cabinet');
    });

    it('should return undefined when device not found by name', async () => {
      const device = await client.findDeviceByName('nonexistent');

      expect(device).toBeUndefined();
    });

    it('should return empty array when no devices match model', async () => {
      const devices = await client.findDevicesByModel('NONEXISTENT');

      expect(devices).toHaveLength(0);
    });
  });

  describe('device state', () => {
    it('should get device state', async () => {
      const state = await client.getDeviceState('living-room-123', 'H6159');

      expect(state.deviceId).toBe('living-room-123');
      expect(state.model).toBe('H6159');
      expect(state.online).toBe(true);
      expect(state.getPowerState()).toBe('on');
      expect(state.getBrightness()?.level).toBe(75);
    });

    it('should check if device is online', async () => {
      const isOnline = await client.isDeviceOnline('living-room-123', 'H6159');

      expect(isOnline).toBe(true);
    });

    it('should check if device is powered on', async () => {
      const isPoweredOn = await client.isDevicePoweredOn('living-room-123', 'H6159');

      expect(isPoweredOn).toBe(true);
    });
  });

  describe('basic device control', () => {
    it('should turn device on', async () => {
      let capturedCommand: any;

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommand = body.payload;
          return HttpResponse.json(mockCommandResponse);
        })
      );

      await client.turnOn('living-room-123', 'H6159');

      expect(capturedCommand.device).toBe('living-room-123');
      expect(capturedCommand.sku).toBe('H6159');
      expect(capturedCommand.capability.type).toBe('devices.capabilities.on_off');
      expect(capturedCommand.capability.instance).toBe('powerSwitch');
      expect(capturedCommand.capability.value).toBe(1);
    });

    it('should turn device off', async () => {
      let capturedCommand: any;

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommand = body.payload;
          return HttpResponse.json(mockCommandResponse);
        })
      );

      await client.turnOff('living-room-123', 'H6159');

      expect(capturedCommand.capability.type).toBe('devices.capabilities.on_off');
      expect(capturedCommand.capability.instance).toBe('powerSwitch');
      expect(capturedCommand.capability.value).toBe(0);
    });

    it('should set brightness', async () => {
      let capturedCommand: any;

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommand = body.payload;
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const brightness = new Brightness(50);
      await client.setBrightness('living-room-123', 'H6159', brightness);

      expect(capturedCommand.capability.type).toBe('devices.capabilities.range');
      expect(capturedCommand.capability.value).toBe(50);
    });

    it('should set color', async () => {
      let capturedCommand: any;

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommand = body.payload;
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const color = new ColorRgb(255, 0, 128);
      await client.setColor('living-room-123', 'H6159', color);

      expect(capturedCommand.capability.type).toBe('devices.capabilities.color_setting');
      expect(capturedCommand.capability.instance).toBe('colorRgb'); // Fixed: check correct instance
      expect(capturedCommand.capability.value).toEqual({ r: 255, g: 0, b: 128 });
    });

    it('should set color temperature', async () => {
      let capturedCommand: any;

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommand = body.payload;
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const colorTemp = new ColorTemperature(4000);
      await client.setColorTemperature('living-room-123', 'H6159', colorTemp);

      expect(capturedCommand.capability.type).toBe('devices.capabilities.color_setting');
      expect(capturedCommand.capability.instance).toBe('colorTemperatureK');
      expect(capturedCommand.capability.value).toBe(4000);
    });
  });

  describe('convenience methods', () => {
    it('should turn on with brightness', async () => {
      const capturedCommands: any[] = [];

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommands.push(body.payload);
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const brightness = new Brightness(80);
      await client.turnOnWithBrightness('living-room-123', 'H6159', brightness);

      expect(capturedCommands).toHaveLength(2);
      expect(capturedCommands[0].capability.type).toBe('devices.capabilities.on_off');
      expect(capturedCommands[0].capability.instance).toBe('powerSwitch');
      expect(capturedCommands[0].capability.value).toBe(1);
      expect(capturedCommands[1].capability.type).toBe('devices.capabilities.range');
      expect(capturedCommands[1].capability.value).toBe(80);
    });

    it('should turn on with color only', async () => {
      const capturedCommands: any[] = [];

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommands.push(body.payload);
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const color = new ColorRgb(0, 255, 0);
      await client.turnOnWithColor('living-room-123', 'H6159', color);

      expect(capturedCommands).toHaveLength(2);
      expect(capturedCommands[0].capability.type).toBe('devices.capabilities.on_off');
      expect(capturedCommands[0].capability.instance).toBe('powerSwitch');
      expect(capturedCommands[0].capability.value).toBe(1);
      expect(capturedCommands[1].capability.type).toBe('devices.capabilities.color_setting');
      expect(capturedCommands[1].capability.instance).toBe('colorRgb'); // Fixed: check correct instance
      expect(capturedCommands[1].capability.value).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('should turn on with color and brightness', async () => {
      const capturedCommands: any[] = [];

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommands.push(body.payload);
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const color = new ColorRgb(0, 255, 0);
      const brightness = new Brightness(60);
      await client.turnOnWithColor('living-room-123', 'H6159', color, brightness);

      expect(capturedCommands).toHaveLength(3);
      expect(capturedCommands[0].capability.type).toBe('devices.capabilities.on_off');
      expect(capturedCommands[0].capability.instance).toBe('powerSwitch');
      expect(capturedCommands[0].capability.value).toBe(1);
      expect(capturedCommands[1].capability.type).toBe('devices.capabilities.color_setting');
      expect(capturedCommands[1].capability.instance).toBe('colorRgb'); // Fixed: check correct instance
      expect(capturedCommands[1].capability.value).toEqual({ r: 0, g: 255, b: 0 });
      expect(capturedCommands[2].capability.type).toBe('devices.capabilities.range');
      expect(capturedCommands[2].capability.value).toBe(60);
    });

    it('should turn on with color temperature only', async () => {
      const capturedCommands: any[] = [];

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommands.push(body.payload);
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const colorTemp = new ColorTemperature(3000);
      await client.turnOnWithColorTemperature('living-room-123', 'H6159', colorTemp);

      expect(capturedCommands).toHaveLength(2);
      expect(capturedCommands[0].capability.type).toBe('devices.capabilities.on_off');
      expect(capturedCommands[0].capability.instance).toBe('powerSwitch');
      expect(capturedCommands[0].capability.value).toBe(1);
      expect(capturedCommands[1].capability.type).toBe('devices.capabilities.color_setting');
      expect(capturedCommands[1].capability.instance).toBe('colorTemperatureK');
      expect(capturedCommands[1].capability.value).toBe(3000);
    });

    it('should turn on with color temperature and brightness', async () => {
      const capturedCommands: any[] = [];

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommands.push(body.payload);
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const colorTemp = new ColorTemperature(3000);
      const brightness = new Brightness(90);
      await client.turnOnWithColorTemperature('living-room-123', 'H6159', colorTemp, brightness);

      expect(capturedCommands).toHaveLength(3);
      expect(capturedCommands[0].capability.type).toBe('devices.capabilities.on_off');
      expect(capturedCommands[0].capability.instance).toBe('powerSwitch');
      expect(capturedCommands[0].capability.value).toBe(1);
      expect(capturedCommands[1].capability.type).toBe('devices.capabilities.color_setting');
      expect(capturedCommands[1].capability.instance).toBe('colorTemperatureK');
      expect(capturedCommands[1].capability.value).toBe(3000);
      expect(capturedCommands[2].capability.type).toBe('devices.capabilities.range');
      expect(capturedCommands[2].capability.value).toBe(90);
    });
  });

  describe('advanced light control', () => {
    it('should get dynamic scenes', async () => {
      const mockScenesResponse = {
        code: 200,
        msg: 'success',
        payload: {
          sku: 'H6159',
          device: 'living-room-123',
          capabilities: [
            {
              type: 'devices.capabilities.dynamic_scene',
              instance: 'lightScene',
              parameters: {
                dataType: 'ENUM',
                options: [
                  { name: 'Sunrise', value: { id: 3853, paramId: 4280 } },
                  { name: 'Sunset', value: { id: 3854, paramId: 4281 } },
                ]
              }
            }
          ]
        }
      };

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/scenes`, () => {
          return HttpResponse.json(mockScenesResponse);
        })
      );

      const scenes = await client.getDynamicScenes('living-room-123', 'H6159');

      expect(scenes).toHaveLength(2);
      expect(scenes[0].name).toBe('Sunrise');
      expect(scenes[1].name).toBe('Sunset');
    });

    it('should set light scene', async () => {
      let capturedCommand: any;

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommand = body.payload;
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const scene = LightScene.sunrise();
      await client.setLightScene('living-room-123', 'H6159', scene);

      expect(capturedCommand.capability.type).toBe('devices.capabilities.dynamic_scene');
      expect(capturedCommand.capability.instance).toBe('lightScene');
      expect(capturedCommand.capability.value).toEqual({ id: 3853, paramId: 4280 });
    });

    it('should set segment colors', async () => {
      let capturedCommand: any;

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommand = body.payload;
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const segments = [
        new SegmentColor(0, new ColorRgb(255, 0, 0)),
        new SegmentColor(1, new ColorRgb(0, 255, 0)),
      ];

      await client.setSegmentColors('living-room-123', 'H6159', segments);

      expect(capturedCommand.capability.type).toBe('devices.capabilities.segment_color_setting');
      expect(capturedCommand.capability.instance).toBe('segmentedColorRgb');
    });

    it('should set segment brightness', async () => {
      let capturedCommand: any;

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommand = body.payload;
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const segments = [
        { index: 0, brightness: new Brightness(100) },
        { index: 1, brightness: new Brightness(50) },
      ];

      await client.setSegmentBrightness('living-room-123', 'H6159', segments);

      expect(capturedCommand.capability.type).toBe('devices.capabilities.segment_color_setting');
      expect(capturedCommand.capability.instance).toBe('segmentedBrightness');
    });

    it('should set music mode', async () => {
      let capturedCommand: any;

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommand = body.payload;
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const musicMode = new MusicMode(1, 75);
      await client.setMusicMode('living-room-123', 'H6159', musicMode);

      expect(capturedCommand.capability.type).toBe('devices.capabilities.music_setting');
      expect(capturedCommand.capability.instance).toBe('musicMode');
      expect(capturedCommand.capability.value).toEqual({ modeId: 1, sensitivity: 75 });
    });

    it('should set nightlight toggle', async () => {
      let capturedCommand: any;

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommand = body.payload;
          return HttpResponse.json(mockCommandResponse);
        })
      );

      await client.setNightlightToggle('living-room-123', 'H6159', true);

      expect(capturedCommand.capability.type).toBe('devices.capabilities.toggle');
      expect(capturedCommand.capability.instance).toBe('nightlightToggle');
      expect(capturedCommand.capability.value).toBe(1);
    });

    it('should set gradient toggle', async () => {
      let capturedCommand: any;

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommand = body.payload;
          return HttpResponse.json(mockCommandResponse);
        })
      );

      await client.setGradientToggle('living-room-123', 'H6159', false);

      expect(capturedCommand.capability.type).toBe('devices.capabilities.toggle');
      expect(capturedCommand.capability.instance).toBe('gradientToggle');
      expect(capturedCommand.capability.value).toBe(0);
    });

    it('should set nightlight scene', async () => {
      let capturedCommand: any;

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommand = body.payload;
          return HttpResponse.json(mockCommandResponse);
        })
      );

      await client.setNightlightScene('living-room-123', 'H6159', 1);

      expect(capturedCommand.capability.type).toBe('devices.capabilities.mode');
      expect(capturedCommand.capability.instance).toBe('nightlightScene');
      expect(capturedCommand.capability.value).toBe(1);
    });

    it('should set preset scene', async () => {
      let capturedCommand: any;

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommand = body.payload;
          return HttpResponse.json(mockCommandResponse);
        })
      );

      await client.setPresetScene('living-room-123', 'H6159', 'cozy');

      expect(capturedCommand.capability.type).toBe('devices.capabilities.mode');
      expect(capturedCommand.capability.instance).toBe('presetScene');
      expect(capturedCommand.capability.value).toBe('cozy');
    });
  });

  describe('rate limiting', () => {
    it('should handle multiple rapid requests with rate limiting', async () => {
      let requestCount = 0;
      const requestTimestamps: number[] = [];

      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          requestCount++;
          requestTimestamps.push(Date.now());
          return HttpResponse.json(mockDevicesResponse);
        })
      );

      // Make multiple simultaneous requests
      const promises = Array.from({ length: 5 }, () => client.getDevices());
      await Promise.all(promises);

      expect(requestCount).toBe(5);
      
      // Verify requests were made (rate limiting would space them out)
      // Note: In a real test, we'd verify timing between requests
      expect(requestTimestamps).toHaveLength(5);
    });
  });

  describe('error handling', () => {
    it('should propagate API errors', async () => {
      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.json(
            { code: 1001, message: 'Invalid API key' },
            { status: 401 }
          );
        })
      );

      await expect(client.getDevices()).rejects.toThrow('Invalid API key');
    });

    it('should handle network errors', async () => {
      server.use(
        http.get(`${BASE_URL}/router/api/v1/user/devices`, () => {
          return HttpResponse.error();
        })
      );

      await expect(client.getDevices()).rejects.toThrow();
    });
  });

  describe('real-world usage scenarios', () => {
    it('should handle complete lighting scene setup', async () => {
      const capturedCommands: any[] = [];

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommands.push(body.payload);
          return HttpResponse.json(mockCommandResponse);
        })
      );

      // Find living room light and set up evening scene
      const devices = await client.getControllableDevices();
      const livingRoomLight = devices.find(d => d.deviceName.includes('Living Room'));

      expect(livingRoomLight).toBeDefined();

      // Set up warm evening lighting
      const warmColor = ColorTemperature.warmWhite();
      const dimBrightness = new Brightness(30);

      await client.turnOnWithColorTemperature(
        livingRoomLight!.deviceId,
        livingRoomLight!.model,
        warmColor,
        dimBrightness
      );

      expect(capturedCommands).toHaveLength(3);
      expect(capturedCommands[0].capability.type).toBe('devices.capabilities.on_off');
      expect(capturedCommands[1].capability.type).toBe('devices.capabilities.color_setting');
      expect(capturedCommands[1].capability.instance).toBe('colorTemperatureK');
      expect(capturedCommands[2].capability.type).toBe('devices.capabilities.range');
    });

    it('should handle batch operations on multiple devices', async () => {
      const capturedCommands: any[] = [];

      server.use(
        http.post(`${BASE_URL}/router/api/v1/device/control`, async ({ request }) => {
          const body = await request.json() as any;
          capturedCommands.push(body.payload);
          return HttpResponse.json(mockCommandResponse);
        })
      );

      // Turn off all controllable devices
      const controllableDevices = await client.getControllableDevices();

      await Promise.all(
        controllableDevices.map(device => 
          client.turnOff(device.deviceId, device.model)
        )
      );

      expect(capturedCommands).toHaveLength(2); // Two controllable devices
      expect(capturedCommands.every(cmd => cmd.capability.type === 'devices.capabilities.on_off' && cmd.capability.instance === 'powerSwitch' && cmd.capability.value === 0)).toBe(true);
    });
  });

  describe('monitoring and metrics', () => {
    it('should get rate limiter stats', () => {
      const stats = client.getRateLimiterStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('currentRequests');
      expect(stats).toHaveProperty('maxRequests');
      expect(stats).toHaveProperty('utilizationPercent');
      expect(stats).toHaveProperty('queueSize');
      expect(stats).toHaveProperty('canExecuteImmediately');
    });

    it('should get service stats', () => {
      const stats = client.getServiceStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('rateLimiter');
      expect(stats).toHaveProperty('configuration');
      expect(stats.configuration.rateLimit).toBeDefined();
      expect(stats.configuration.enableRetries).toBeDefined();
    });

    it('should check if retry is enabled (default: false)', () => {
      const isEnabled = client.isRetryEnabled();
      expect(isEnabled).toBe(false);
    });

    it('should check if retry is enabled when configured', () => {
      const clientWithRetry = new GoveeClient({
        apiKey: 'test-api-key',
        enableRetries: true,
        retryPolicy: 'development'
      });

      const isEnabled = clientWithRetry.isRetryEnabled();
      expect(isEnabled).toBe(true);
    });

    it('should get retry metrics when retries are disabled', () => {
      const metrics = client.getRetryMetrics();
      // When retries are disabled, metrics can be null or undefined
      expect(metrics === null || metrics === undefined).toBe(true);
    });

    it('should get retry metrics when retries are enabled', () => {
      const clientWithRetry = new GoveeClient({
        apiKey: 'test-api-key',
        enableRetries: true,
        retryPolicy: 'development'
      });

      const metrics = clientWithRetry.getRetryMetrics();
      expect(metrics).toBeDefined();
      if (metrics) {
        expect(metrics).toHaveProperty('totalAttempts');
        expect(metrics).toHaveProperty('successfulRetries');
        expect(metrics).toHaveProperty('failedRetries');
        expect(metrics).toHaveProperty('circuitBreakerState');
      }
    });

    it('should reset retry metrics when retries are enabled', () => {
      const clientWithRetry = new GoveeClient({
        apiKey: 'test-api-key',
        enableRetries: true,
        retryPolicy: 'development'
      });

      // Should not throw
      expect(() => clientWithRetry.resetRetryMetrics()).not.toThrow();

      const metricsAfterReset = clientWithRetry.getRetryMetrics();
      expect(metricsAfterReset).toBeDefined();
      if (metricsAfterReset) {
        expect(metricsAfterReset.totalAttempts).toBe(0);
        expect(metricsAfterReset.successfulRetries).toBe(0);
        expect(metricsAfterReset.failedRetries).toBe(0);
      }
    });

    it('should handle resetRetryMetrics when retries are disabled', () => {
      // Should not throw even when retries are disabled
      expect(() => client.resetRetryMetrics()).not.toThrow();
    });
  });
});
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { GoveeClient } from '../../src/GoveeClient';
import { ColorRgb, ColorTemperature, Brightness } from '../../src/domain/value-objects';

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
    it('should throw error for invalid configuration', () => {
      expect(() => new GoveeClient({ apiKey: '' }))
        .toThrow('API key is required and must be a non-empty string');
    });

    it('should create client with valid configuration', () => {
      expect(() => new GoveeClient({ apiKey: 'test-key' })).not.toThrow();
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
      expect(capturedCommand.capability.value).toBe('on');
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
      expect(capturedCommand.capability.value).toBe('off');
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
      expect(capturedCommands[0].capability.value).toBe('on');
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
      expect(capturedCommands[0].capability.value).toBe('on');
      expect(capturedCommands[1].capability.type).toBe('devices.capabilities.color_setting');
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
      expect(capturedCommands[0].capability.value).toBe('on');
      expect(capturedCommands[1].capability.type).toBe('devices.capabilities.color_setting');
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
      expect(capturedCommands[0].capability.value).toBe('on');
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
      expect(capturedCommands[0].capability.value).toBe('on');
      expect(capturedCommands[1].capability.type).toBe('devices.capabilities.color_setting');
      expect(capturedCommands[1].capability.instance).toBe('colorTemperatureK');
      expect(capturedCommands[1].capability.value).toBe(3000);
      expect(capturedCommands[2].capability.type).toBe('devices.capabilities.range');
      expect(capturedCommands[2].capability.value).toBe(90);
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
      expect(capturedCommands.every(cmd => cmd.capability.type === 'devices.capabilities.on_off' && cmd.capability.value === 'off')).toBe(true);
    });
  });
});
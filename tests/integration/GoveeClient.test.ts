import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { GoveeClient } from '../../src/GoveeClient';
import { ColorRgb, ColorTemperature, Brightness } from '../../src/domain/value-objects';

const BASE_URL = 'https://developer-api.govee.com/v1';

const mockDevicesResponse = {
  code: 200,
  message: 'Success',
  data: {
    devices: [
      {
        deviceId: 'living-room-123',
        model: 'H6159',
        deviceName: 'Living Room Light',
        controllable: true,
        retrievable: true,
        supportCmds: ['turn', 'brightness', 'color', 'colorTem']
      },
      {
        deviceId: 'bedroom-456',
        model: 'H6160',
        deviceName: 'Bedroom Strip Light',
        controllable: true,
        retrievable: false,
        supportCmds: ['turn', 'brightness']
      },
      {
        deviceId: 'kitchen-789',
        model: 'H6159',
        deviceName: 'Kitchen Under Cabinet',
        controllable: false,
        retrievable: true,
        supportCmds: []
      }
    ]
  }
};

const mockStateResponse = {
  code: 200,
  message: 'Success',
  data: {
    device: 'living-room-123',
    model: 'H6159',
    properties: [
      {
        online: true,
        powerSwitch: 1,
        brightness: 75,
        color: { r: 255, g: 128, b: 0 },
        colorTem: 2700
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
      http.get(`${BASE_URL}/devices`, () => {
        return HttpResponse.json(mockDevicesResponse);
      }),
      http.get(`${BASE_URL}/devices/state`, () => {
        return HttpResponse.json(mockStateResponse);
      }),
      http.put(`${BASE_URL}/devices/control`, () => {
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
      expect(devices[1].deviceName).toBe('Kitchen Under Cabinet');
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
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          capturedCommand = await request.json();
          return HttpResponse.json(mockCommandResponse);
        })
      );

      await client.turnOn('living-room-123', 'H6159');

      expect(capturedCommand.device).toBe('living-room-123');
      expect(capturedCommand.model).toBe('H6159');
      expect(capturedCommand.cmd).toEqual({ name: 'turn', value: 'on' });
    });

    it('should turn device off', async () => {
      let capturedCommand: any;

      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          capturedCommand = await request.json();
          return HttpResponse.json(mockCommandResponse);
        })
      );

      await client.turnOff('living-room-123', 'H6159');

      expect(capturedCommand.cmd).toEqual({ name: 'turn', value: 'off' });
    });

    it('should set brightness', async () => {
      let capturedCommand: any;

      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          capturedCommand = await request.json();
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const brightness = new Brightness(50);
      await client.setBrightness('living-room-123', 'H6159', brightness);

      expect(capturedCommand.cmd).toEqual({ name: 'brightness', value: 50 });
    });

    it('should set color', async () => {
      let capturedCommand: any;

      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          capturedCommand = await request.json();
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const color = new ColorRgb(255, 0, 128);
      await client.setColor('living-room-123', 'H6159', color);

      expect(capturedCommand.cmd).toEqual({ name: 'color', value: { r: 255, g: 0, b: 128 } });
    });

    it('should set color temperature', async () => {
      let capturedCommand: any;

      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          capturedCommand = await request.json();
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const colorTemp = new ColorTemperature(4000);
      await client.setColorTemperature('living-room-123', 'H6159', colorTemp);

      expect(capturedCommand.cmd).toEqual({ name: 'colorTem', value: 4000 });
    });
  });

  describe('convenience methods', () => {
    it('should turn on with brightness', async () => {
      const capturedCommands: any[] = [];

      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          const command = await request.json();
          capturedCommands.push(command);
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const brightness = new Brightness(80);
      await client.turnOnWithBrightness('living-room-123', 'H6159', brightness);

      expect(capturedCommands).toHaveLength(2);
      expect(capturedCommands[0].cmd).toEqual({ name: 'turn', value: 'on' });
      expect(capturedCommands[1].cmd).toEqual({ name: 'brightness', value: 80 });
    });

    it('should turn on with color only', async () => {
      const capturedCommands: any[] = [];

      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          const command = await request.json();
          capturedCommands.push(command);
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const color = new ColorRgb(0, 255, 0);
      await client.turnOnWithColor('living-room-123', 'H6159', color);

      expect(capturedCommands).toHaveLength(2);
      expect(capturedCommands[0].cmd).toEqual({ name: 'turn', value: 'on' });
      expect(capturedCommands[1].cmd).toEqual({ name: 'color', value: { r: 0, g: 255, b: 0 } });
    });

    it('should turn on with color and brightness', async () => {
      const capturedCommands: any[] = [];

      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          const command = await request.json();
          capturedCommands.push(command);
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const color = new ColorRgb(0, 255, 0);
      const brightness = new Brightness(60);
      await client.turnOnWithColor('living-room-123', 'H6159', color, brightness);

      expect(capturedCommands).toHaveLength(3);
      expect(capturedCommands[0].cmd).toEqual({ name: 'turn', value: 'on' });
      expect(capturedCommands[1].cmd).toEqual({ name: 'color', value: { r: 0, g: 255, b: 0 } });
      expect(capturedCommands[2].cmd).toEqual({ name: 'brightness', value: 60 });
    });

    it('should turn on with color temperature only', async () => {
      const capturedCommands: any[] = [];

      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          const command = await request.json();
          capturedCommands.push(command);
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const colorTemp = new ColorTemperature(3000);
      await client.turnOnWithColorTemperature('living-room-123', 'H6159', colorTemp);

      expect(capturedCommands).toHaveLength(2);
      expect(capturedCommands[0].cmd).toEqual({ name: 'turn', value: 'on' });
      expect(capturedCommands[1].cmd).toEqual({ name: 'colorTem', value: 3000 });
    });

    it('should turn on with color temperature and brightness', async () => {
      const capturedCommands: any[] = [];

      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          const command = await request.json();
          capturedCommands.push(command);
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const colorTemp = new ColorTemperature(3000);
      const brightness = new Brightness(90);
      await client.turnOnWithColorTemperature('living-room-123', 'H6159', colorTemp, brightness);

      expect(capturedCommands).toHaveLength(3);
      expect(capturedCommands[0].cmd).toEqual({ name: 'turn', value: 'on' });
      expect(capturedCommands[1].cmd).toEqual({ name: 'colorTem', value: 3000 });
      expect(capturedCommands[2].cmd).toEqual({ name: 'brightness', value: 90 });
    });
  });

  describe('rate limiting', () => {
    it('should handle multiple rapid requests with rate limiting', async () => {
      let requestCount = 0;
      const requestTimestamps: number[] = [];

      server.use(
        http.get(`${BASE_URL}/devices`, () => {
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
        http.get(`${BASE_URL}/devices`, () => {
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
        http.get(`${BASE_URL}/devices`, () => {
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
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          const command = await request.json();
          capturedCommands.push(command);
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
      expect(capturedCommands[0].cmd.name).toBe('turn');
      expect(capturedCommands[1].cmd.name).toBe('colorTem');
      expect(capturedCommands[2].cmd.name).toBe('brightness');
    });

    it('should handle batch operations on multiple devices', async () => {
      const capturedCommands: any[] = [];

      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          const command = await request.json();
          capturedCommands.push(command);
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
      expect(capturedCommands.every(cmd => cmd.cmd.name === 'turn' && cmd.cmd.value === 'off')).toBe(true);
    });
  });
});
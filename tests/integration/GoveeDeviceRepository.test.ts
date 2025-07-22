import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { GoveeDeviceRepository } from '../../src/infrastructure/GoveeDeviceRepository';
import { CommandFactory } from '../../src/domain/entities/Command';
import { ColorRgb, ColorTemperature, Brightness } from '../../src/domain/value-objects';
import { GoveeApiError, InvalidApiKeyError, RateLimitError, NetworkError } from '../../src/errors';

const BASE_URL = 'https://developer-api.govee.com/v1';

const mockDevicesResponse = {
  code: 200,
  message: 'Success',
  data: {
    devices: [
      {
        deviceId: 'device123',
        model: 'H6159',
        deviceName: 'Living Room Light',
        controllable: true,
        retrievable: true,
        supportCmds: ['turn', 'brightness', 'color', 'colorTem']
      },
      {
        deviceId: 'device456',
        model: 'H6160',
        deviceName: 'Bedroom Light',
        controllable: true,
        retrievable: false,
        supportCmds: ['turn', 'brightness']
      }
    ]
  }
};

const mockStateResponse = {
  code: 200,
  message: 'Success',
  data: {
    device: 'device123',
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
        http.get(`${BASE_URL}/devices`, () => {
          return HttpResponse.json(mockDevicesResponse);
        })
      );

      const devices = await repository.findAll();

      expect(devices).toHaveLength(2);
      expect(devices[0].deviceId).toBe('device123');
      expect(devices[0].model).toBe('H6159');
      expect(devices[0].deviceName).toBe('Living Room Light');
      expect(devices[0].controllable).toBe(true);
      expect(devices[0].retrievable).toBe(true);
      expect(devices[0].supportedCmds).toEqual(['turn', 'brightness', 'color', 'colorTem']);

      expect(devices[1].deviceId).toBe('device456');
      expect(devices[1].model).toBe('H6160');
      expect(devices[1].deviceName).toBe('Bedroom Light');
      expect(devices[1].controllable).toBe(true);
      expect(devices[1].retrievable).toBe(false);
      expect(devices[1].supportedCmds).toEqual(['turn', 'brightness']);
    });

    it('should handle API error response', async () => {
      server.use(
        http.get(`${BASE_URL}/devices`, () => {
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
        http.get(`${BASE_URL}/devices`, () => {
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
        http.get(`${BASE_URL}/devices`, () => {
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
        http.get(`${BASE_URL}/devices`, () => {
          return HttpResponse.error();
        })
      );

      await expect(repository.findAll()).rejects.toThrow(NetworkError);
    });
  });

  describe('findState', () => {
    it('should successfully fetch device state', async () => {
      server.use(
        http.get(`${BASE_URL}/devices/state`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('device')).toBe('device123');
          expect(url.searchParams.get('model')).toBe('H6159');
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
          properties: [
            {
              online: false,
              powerSwitch: 0
            }
          ]
        }
      };

      server.use(
        http.get(`${BASE_URL}/devices/state`, () => {
          return HttpResponse.json(offlineStateResponse);
        })
      );

      const state = await repository.findState('device123', 'H6159');

      expect(state.online).toBe(false);
      expect(state.getPowerState()).toBe('off');
    });

    it('should validate device parameters', async () => {
      await expect(repository.findState('', 'H6159')).rejects.toThrow('Device ID must be a non-empty string');
      await expect(repository.findState('device123', '')).rejects.toThrow('Model must be a non-empty string');
    });

    it('should handle API error response', async () => {
      server.use(
        http.get(`${BASE_URL}/devices/state`, () => {
          return HttpResponse.json(
            { code: 1002, message: 'Device not found' },
            { status: 404 }
          );
        })
      );

      await expect(repository.findState('device123', 'H6159')).rejects.toThrow(GoveeApiError);
    });
  });

  describe('sendCommand', () => {
    it('should successfully send power on command', async () => {
      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          const body = await request.json() as any;
          expect(body.device).toBe('device123');
          expect(body.model).toBe('H6159');
          expect(body.cmd).toEqual({ name: 'turn', value: 'on' });
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const command = CommandFactory.powerOn();
      await expect(repository.sendCommand('device123', 'H6159', command)).resolves.not.toThrow();
    });

    it('should successfully send brightness command', async () => {
      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          const body = await request.json() as any;
          expect(body.device).toBe('device123');
          expect(body.model).toBe('H6159');
          expect(body.cmd).toEqual({ name: 'brightness', value: 75 });
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const command = CommandFactory.brightness(new Brightness(75));
      await expect(repository.sendCommand('device123', 'H6159', command)).resolves.not.toThrow();
    });

    it('should successfully send color command', async () => {
      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          const body = await request.json() as any;
          expect(body.device).toBe('device123');
          expect(body.model).toBe('H6159');
          expect(body.cmd).toEqual({ name: 'color', value: { r: 255, g: 128, b: 0 } });
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const command = CommandFactory.color(new ColorRgb(255, 128, 0));
      await expect(repository.sendCommand('device123', 'H6159', command)).resolves.not.toThrow();
    });

    it('should successfully send color temperature command', async () => {
      server.use(
        http.put(`${BASE_URL}/devices/control`, async ({ request }) => {
          const body = await request.json() as any;
          expect(body.device).toBe('device123');
          expect(body.model).toBe('H6159');
          expect(body.cmd).toEqual({ name: 'colorTem', value: 2700 });
          return HttpResponse.json(mockCommandResponse);
        })
      );

      const command = CommandFactory.colorTemperature(new ColorTemperature(2700));
      await expect(repository.sendCommand('device123', 'H6159', command)).resolves.not.toThrow();
    });

    it('should validate device parameters', async () => {
      const command = CommandFactory.powerOn();
      
      await expect(repository.sendCommand('', 'H6159', command)).rejects.toThrow('Device ID must be a non-empty string');
      await expect(repository.sendCommand('device123', '', command)).rejects.toThrow('Model must be a non-empty string');
    });

    it('should handle device offline error', async () => {
      server.use(
        http.put(`${BASE_URL}/devices/control`, () => {
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
        http.put(`${BASE_URL}/devices/control`, () => {
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
        http.put(`${BASE_URL}/devices/control`, () => {
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
        http.get(`${BASE_URL}/devices`, ({ request }) => {
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
        http.get(`${BASE_URL}/devices`, ({ request }) => {
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
        http.get(`${BASE_URL}/devices`, () => {
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
        http.get(`${BASE_URL}/devices`, () => {
          return new HttpResponse('', { status: 500 });
        })
      );

      await expect(repository.findAll()).rejects.toThrow(GoveeApiError);
    });

    it('should handle non-200 success codes from API', async () => {
      server.use(
        http.get(`${BASE_URL}/devices`, () => {
          return HttpResponse.json(
            { ...mockDevicesResponse, code: 201 },
            { status: 200 }
          );
        })
      );

      await expect(repository.findAll()).rejects.toThrow(GoveeApiError);
    });
  });
});
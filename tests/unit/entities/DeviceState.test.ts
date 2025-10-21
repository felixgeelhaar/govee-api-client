import { describe, it, expect } from 'vitest';
import { DeviceState } from '../../../src/domain/entities/DeviceState';
import { Brightness, ColorRgb, ColorTemperature, LightScene, MusicMode } from '../../../src/domain/value-objects';

describe('DeviceState', () => {
  describe('constructor validation', () => {
    it('should create a valid device state', () => {
      const state = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'on' },
        brightness: { value: new Brightness(75) },
      });

      expect(state.deviceId).toBe('device123');
      expect(state.model).toBe('H6159');
      expect(state.online).toBe(true);
    });

    it('should throw error for empty device ID', () => {
      expect(() => new DeviceState('', 'H6159', true)).toThrow('Device ID must be a non-empty string');
    });

    it('should throw error for whitespace-only device ID', () => {
      expect(() => new DeviceState('   ', 'H6159', true)).toThrow('Device ID must be a non-empty string');
    });

    it('should throw error for non-string device ID', () => {
      expect(() => new DeviceState(null as any, 'H6159', true)).toThrow('Device ID must be a non-empty string');
    });

    it('should throw error for empty model', () => {
      expect(() => new DeviceState('device123', '', true)).toThrow('Model must be a non-empty string');
    });

    it('should throw error for whitespace-only model', () => {
      expect(() => new DeviceState('device123', '   ', true)).toThrow('Model must be a non-empty string');
    });

    it('should throw error for non-string model', () => {
      expect(() => new DeviceState('device123', undefined as any, true)).toThrow('Model must be a non-empty string');
    });
  });

  describe('power state accessors', () => {
    it('should get power state as "on"', () => {
      const state = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'on' },
      });

      expect(state.getPowerState()).toBe('on');
    });

    it('should get power state as "off"', () => {
      const state = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'off' },
      });

      expect(state.getPowerState()).toBe('off');
    });

    it('should return undefined when power state is missing', () => {
      const state = new DeviceState('device123', 'H6159', true, {});

      expect(state.getPowerState()).toBeUndefined();
    });

    it('should check if device is powered on', () => {
      const onState = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'on' },
      });
      const offState = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'off' },
      });

      expect(onState.isPoweredOn()).toBe(true);
      expect(offState.isPoweredOn()).toBe(false);
    });
  });

  describe('brightness accessors', () => {
    it('should get brightness', () => {
      const state = new DeviceState('device123', 'H6159', true, {
        brightness: { value: new Brightness(75) },
      });

      expect(state.getBrightness()?.level).toBe(75);
    });

    it('should return undefined when brightness is missing', () => {
      const state = new DeviceState('device123', 'H6159', true, {});

      expect(state.getBrightness()).toBeUndefined();
    });
  });

  describe('color accessors', () => {
    it('should get color', () => {
      const state = new DeviceState('device123', 'H6159', true, {
        color: { value: new ColorRgb(255, 128, 0) },
      });

      expect(state.getColor()?.toObject()).toEqual({ r: 255, g: 128, b: 0 });
    });

    it('should return undefined when color is missing', () => {
      const state = new DeviceState('device123', 'H6159', true, {});

      expect(state.getColor()).toBeUndefined();
    });
  });

  describe('color temperature accessors', () => {
    it('should get color temperature', () => {
      const state = new DeviceState('device123', 'H6159', true, {
        colorTem: { value: new ColorTemperature(2700) },
      });

      expect(state.getColorTemperature()?.kelvin).toBe(2700);
    });

    it('should return undefined when color temperature is missing', () => {
      const state = new DeviceState('device123', 'H6159', true, {});

      expect(state.getColorTemperature()).toBeUndefined();
    });
  });

  describe('advanced capability accessors', () => {
    it('should get light scene', () => {
      const state = new DeviceState('device123', 'H6159', true, {
        lightScene: { value: LightScene.sunrise() },
      });

      expect(state.getLightScene()).toBeDefined();
      expect(state.getLightScene()?.name).toBe('Sunrise');
    });

    it('should get music mode', () => {
      const state = new DeviceState('device123', 'H6159', true, {
        musicMode: { value: new MusicMode(1, 75) },
      });

      expect(state.getMusicMode()?.modeId).toBe(1);
      expect(state.getMusicMode()?.sensitivity).toBe(75);
    });

    it('should get nightlight toggle', () => {
      const stateOn = new DeviceState('device123', 'H6159', true, {
        nightlightToggle: { value: true },
      });
      const stateOff = new DeviceState('device123', 'H6159', true, {
        nightlightToggle: { value: false },
      });

      expect(stateOn.getNightlightToggle()).toBe(true);
      expect(stateOff.getNightlightToggle()).toBe(false);
    });

    it('should get gradient toggle', () => {
      const stateOn = new DeviceState('device123', 'H6159', true, {
        gradientToggle: { value: true },
      });
      const stateOff = new DeviceState('device123', 'H6159', true, {
        gradientToggle: { value: false },
      });

      expect(stateOn.getGradientToggle()).toBe(true);
      expect(stateOff.getGradientToggle()).toBe(false);
    });

    it('should get nightlight scene', () => {
      const state = new DeviceState('device123', 'H6159', true, {
        nightlightScene: { value: 42 },
      });

      expect(state.getNightlightScene()).toBe(42);
    });

    it('should get preset scene', () => {
      const state = new DeviceState('device123', 'H6159', true, {
        presetScene: { value: 'Romantic' },
      });

      expect(state.getPresetScene()).toBe('Romantic');
    });
  });

  describe('equality', () => {
    it('should return true for equal states', () => {
      const state1 = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'on' },
        brightness: { value: new Brightness(75) },
      });
      const state2 = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'on' },
        brightness: { value: new Brightness(75) },
      });

      expect(state1.equals(state2)).toBe(true);
    });

    it('should return false for different device IDs', () => {
      const state1 = new DeviceState('device123', 'H6159', true, {});
      const state2 = new DeviceState('device456', 'H6159', true, {});

      expect(state1.equals(state2)).toBe(false);
    });

    it('should return false for different models', () => {
      const state1 = new DeviceState('device123', 'H6159', true, {});
      const state2 = new DeviceState('device123', 'H6160', true, {});

      expect(state1.equals(state2)).toBe(false);
    });

    it('should return false for different online status', () => {
      const state1 = new DeviceState('device123', 'H6159', true, {});
      const state2 = new DeviceState('device123', 'H6159', false, {});

      expect(state1.equals(state2)).toBe(false);
    });

    it('should return false for different property counts', () => {
      const state1 = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'on' },
      });
      const state2 = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'on' },
        brightness: { value: new Brightness(75) },
      });

      expect(state1.equals(state2)).toBe(false);
    });

    it('should return false for different property values', () => {
      const state1 = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'on' },
      });
      const state2 = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'off' },
      });

      expect(state1.equals(state2)).toBe(false);
    });

    it('should return false when property is missing in other state', () => {
      const state1 = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'on' },
        brightness: { value: new Brightness(75) },
      });
      const state2 = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'on' },
      });

      expect(state1.equals(state2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation with online status and power', () => {
      const state = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'on' },
      });

      expect(state.toString()).toBe('DeviceState(device123, online, on)');
    });

    it('should return string representation with offline status', () => {
      const state = new DeviceState('device123', 'H6159', false, {
        powerSwitch: { value: 'off' },
      });

      expect(state.toString()).toBe('DeviceState(device123, offline, off)');
    });

    it('should return string representation with unknown power when missing', () => {
      const state = new DeviceState('device123', 'H6159', true, {});

      expect(state.toString()).toBe('DeviceState(device123, online, unknown)');
    });
  });

  describe('serialization', () => {
    it('should convert to object', () => {
      const state = new DeviceState('device123', 'H6159', true, {
        powerSwitch: { value: 'on' },
        brightness: { value: new Brightness(75) },
        color: { value: new ColorRgb(255, 128, 0) },
      });

      const obj = state.toObject();

      expect(obj.deviceId).toBe('device123');
      expect(obj.model).toBe('H6159');
      expect(obj.online).toBe(true);
      expect(obj.properties).toBeDefined();
      expect(obj.properties.powerSwitch).toEqual({ value: 'on' });
      expect(obj.properties.brightness).toBeDefined();
      expect(obj.properties.color).toBeDefined();
    });

    it('should convert empty properties to object', () => {
      const state = new DeviceState('device123', 'H6159', false, {});

      const obj = state.toObject();

      expect(obj.deviceId).toBe('device123');
      expect(obj.model).toBe('H6159');
      expect(obj.online).toBe(false);
      expect(obj.properties).toEqual({});
    });

    it('should create from object', () => {
      const obj = {
        deviceId: 'device456',
        model: 'H6160',
        online: true,
        properties: {
          powerSwitch: { value: 'off' },
          brightness: { value: new Brightness(50) },
        },
      };

      const state = DeviceState.fromObject(obj);

      expect(state.deviceId).toBe('device456');
      expect(state.model).toBe('H6160');
      expect(state.online).toBe(true);
      expect(state.getPowerState()).toBe('off');
      expect(state.getBrightness()?.level).toBe(50);
    });

    it('should round-trip through serialization', () => {
      const originalState = new DeviceState('device789', 'H6161', true, {
        powerSwitch: { value: 'on' },
        brightness: { value: new Brightness(100) },
        color: { value: new ColorRgb(0, 255, 0) },
        colorTem: { value: new ColorTemperature(4000) },
        lightScene: { value: LightScene.sunset() },
        musicMode: { value: new MusicMode(2, 80) },
        nightlightToggle: { value: true },
        gradientToggle: { value: false },
        nightlightScene: { value: 10 },
        presetScene: { value: 'Cozy' },
      });

      const obj = originalState.toObject();
      const restoredState = DeviceState.fromObject(obj);

      expect(restoredState.deviceId).toBe(originalState.deviceId);
      expect(restoredState.model).toBe(originalState.model);
      expect(restoredState.online).toBe(originalState.online);
      expect(restoredState.getPowerState()).toBe(originalState.getPowerState());
      expect(restoredState.getBrightness()?.level).toBe(originalState.getBrightness()?.level);
      expect(restoredState.getColor()?.toObject()).toEqual(originalState.getColor()?.toObject());
      expect(restoredState.getColorTemperature()?.kelvin).toBe(originalState.getColorTemperature()?.kelvin);
      expect(restoredState.getLightScene()?.name).toBe(originalState.getLightScene()?.name);
      expect(restoredState.getMusicMode()?.modeId).toBe(originalState.getMusicMode()?.modeId);
      expect(restoredState.getNightlightToggle()).toBe(originalState.getNightlightToggle());
      expect(restoredState.getGradientToggle()).toBe(originalState.getGradientToggle());
      expect(restoredState.getNightlightScene()).toBe(originalState.getNightlightScene());
      expect(restoredState.getPresetScene()).toBe(originalState.getPresetScene());
    });
  });
});

import { describe, it, expect } from 'vitest';
import { GoveeDevice } from '../../../src/domain/entities/GoveeDevice';

describe('GoveeDevice', () => {
  const validProps = {
    deviceId: 'device123',
    model: 'H6159',
    deviceName: 'Living Room Light',
    controllable: true,
    retrievable: true,
    supportedCmds: ['turn', 'brightness', 'color']
  };

  describe('constructor', () => {
    it('should create valid GoveeDevice with valid properties', () => {
      const device = new GoveeDevice(
        validProps.deviceId,
        validProps.model,
        validProps.deviceName,
        validProps.controllable,
        validProps.retrievable,
        validProps.supportedCmds
      );

      expect(device.deviceId).toBe(validProps.deviceId);
      expect(device.model).toBe(validProps.model);
      expect(device.deviceName).toBe(validProps.deviceName);
      expect(device.controllable).toBe(validProps.controllable);
      expect(device.retrievable).toBe(validProps.retrievable);
      expect(device.supportedCmds).toEqual(validProps.supportedCmds);
    });

    it('should create immutable supported commands array', () => {
      const device = new GoveeDevice(
        validProps.deviceId,
        validProps.model,
        validProps.deviceName,
        validProps.controllable,
        validProps.retrievable,
        validProps.supportedCmds
      );

      const commands = device.supportedCmds as string[];
      expect(() => commands.push('newCommand')).toThrow();
    });

    it('should throw error for empty device ID', () => {
      expect(() => new GoveeDevice('', validProps.model, validProps.deviceName, validProps.controllable, validProps.retrievable, validProps.supportedCmds))
        .toThrow('Device ID must be a non-empty string');
    });

    it('should throw error for whitespace-only device ID', () => {
      expect(() => new GoveeDevice('   ', validProps.model, validProps.deviceName, validProps.controllable, validProps.retrievable, validProps.supportedCmds))
        .toThrow('Device ID must be a non-empty string');
    });

    it('should throw error for empty model', () => {
      expect(() => new GoveeDevice(validProps.deviceId, '', validProps.deviceName, validProps.controllable, validProps.retrievable, validProps.supportedCmds))
        .toThrow('Model must be a non-empty string');
    });

    it('should throw error for whitespace-only model', () => {
      expect(() => new GoveeDevice(validProps.deviceId, '   ', validProps.deviceName, validProps.controllable, validProps.retrievable, validProps.supportedCmds))
        .toThrow('Model must be a non-empty string');
    });

    it('should throw error for empty device name', () => {
      expect(() => new GoveeDevice(validProps.deviceId, validProps.model, '', validProps.controllable, validProps.retrievable, validProps.supportedCmds))
        .toThrow('Device name must be a non-empty string');
    });

    it('should throw error for whitespace-only device name', () => {
      expect(() => new GoveeDevice(validProps.deviceId, validProps.model, '   ', validProps.controllable, validProps.retrievable, validProps.supportedCmds))
        .toThrow('Device name must be a non-empty string');
    });

    it('should throw error for non-array supported commands', () => {
      expect(() => new GoveeDevice(validProps.deviceId, validProps.model, validProps.deviceName, validProps.controllable, validProps.retrievable, 'invalid' as any))
        .toThrow('Supported commands must be an array');
    });

    it('should throw error for empty command in supported commands', () => {
      expect(() => new GoveeDevice(validProps.deviceId, validProps.model, validProps.deviceName, validProps.controllable, validProps.retrievable, ['turn', '', 'color']))
        .toThrow('All supported commands must be non-empty strings');
    });

    it('should throw error for whitespace-only command in supported commands', () => {
      expect(() => new GoveeDevice(validProps.deviceId, validProps.model, validProps.deviceName, validProps.controllable, validProps.retrievable, ['turn', '   ', 'color']))
        .toThrow('All supported commands must be non-empty strings');
    });

    it('should throw error for non-string command in supported commands', () => {
      expect(() => new GoveeDevice(validProps.deviceId, validProps.model, validProps.deviceName, validProps.controllable, validProps.retrievable, ['turn', 123, 'color'] as any))
        .toThrow('All supported commands must be non-empty strings');
    });
  });

  describe('equals', () => {
    it('should return true for devices with same deviceId and model', () => {
      const device1 = new GoveeDevice(
        validProps.deviceId,
        validProps.model,
        validProps.deviceName,
        validProps.controllable,
        validProps.retrievable,
        validProps.supportedCmds
      );

      const device2 = new GoveeDevice(
        validProps.deviceId,
        validProps.model,
        'Different Name',
        false,
        false,
        ['different', 'commands']
      );

      expect(device1.equals(device2)).toBe(true);
    });

    it('should return false for devices with different deviceId', () => {
      const device1 = new GoveeDevice(
        validProps.deviceId,
        validProps.model,
        validProps.deviceName,
        validProps.controllable,
        validProps.retrievable,
        validProps.supportedCmds
      );

      const device2 = new GoveeDevice(
        'different123',
        validProps.model,
        validProps.deviceName,
        validProps.controllable,
        validProps.retrievable,
        validProps.supportedCmds
      );

      expect(device1.equals(device2)).toBe(false);
    });

    it('should return false for devices with different model', () => {
      const device1 = new GoveeDevice(
        validProps.deviceId,
        validProps.model,
        validProps.deviceName,
        validProps.controllable,
        validProps.retrievable,
        validProps.supportedCmds
      );

      const device2 = new GoveeDevice(
        validProps.deviceId,
        'H6160',
        validProps.deviceName,
        validProps.controllable,
        validProps.retrievable,
        validProps.supportedCmds
      );

      expect(device1.equals(device2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return correct string representation', () => {
      const device = new GoveeDevice(
        validProps.deviceId,
        validProps.model,
        validProps.deviceName,
        validProps.controllable,
        validProps.retrievable,
        validProps.supportedCmds
      );

      expect(device.toString()).toBe('GoveeDevice(device123, H6159, "Living Room Light")');
    });
  });

  describe('utility methods', () => {
    let device: GoveeDevice;

    beforeEach(() => {
      device = new GoveeDevice(
        validProps.deviceId,
        validProps.model,
        validProps.deviceName,
        validProps.controllable,
        validProps.retrievable,
        validProps.supportedCmds
      );
    });

    it('should check if device supports command', () => {
      expect(device.supportsCommand('turn')).toBe(true);
      expect(device.supportsCommand('brightness')).toBe(true);
      expect(device.supportsCommand('color')).toBe(true);
      expect(device.supportsCommand('colorTem')).toBe(false);
    });

    it('should check if device can control', () => {
      expect(device.canControl()).toBe(true);
    });

    it('should check if device can retrieve', () => {
      expect(device.canRetrieve()).toBe(true);
    });

    it('should handle non-controllable device', () => {
      const nonControllable = new GoveeDevice(
        validProps.deviceId,
        validProps.model,
        validProps.deviceName,
        false,
        validProps.retrievable,
        validProps.supportedCmds
      );

      expect(nonControllable.canControl()).toBe(false);
    });

    it('should handle non-retrievable device', () => {
      const nonRetrievable = new GoveeDevice(
        validProps.deviceId,
        validProps.model,
        validProps.deviceName,
        validProps.controllable,
        false,
        validProps.supportedCmds
      );

      expect(nonRetrievable.canRetrieve()).toBe(false);
    });
  });

  describe('toObject and fromObject', () => {
    it('should convert to object correctly', () => {
      const device = new GoveeDevice(
        validProps.deviceId,
        validProps.model,
        validProps.deviceName,
        validProps.controllable,
        validProps.retrievable,
        validProps.supportedCmds
      );

      const obj = device.toObject();
      expect(obj).toEqual({
        deviceId: validProps.deviceId,
        model: validProps.model,
        deviceName: validProps.deviceName,
        controllable: validProps.controllable,
        retrievable: validProps.retrievable,
        supportedCmds: validProps.supportedCmds
      });
    });

    it('should create device from object correctly', () => {
      const device = GoveeDevice.fromObject({
        deviceId: validProps.deviceId,
        model: validProps.model,
        deviceName: validProps.deviceName,
        controllable: validProps.controllable,
        retrievable: validProps.retrievable,
        supportedCmds: validProps.supportedCmds
      });

      expect(device.deviceId).toBe(validProps.deviceId);
      expect(device.model).toBe(validProps.model);
      expect(device.deviceName).toBe(validProps.deviceName);
      expect(device.controllable).toBe(validProps.controllable);
      expect(device.retrievable).toBe(validProps.retrievable);
      expect(device.supportedCmds).toEqual(validProps.supportedCmds);
    });

    it('should create immutable arrays when converting from object', () => {
      const originalSupportedCmds = [...validProps.supportedCmds];
      const obj = {
        deviceId: validProps.deviceId,
        model: validProps.model,
        deviceName: validProps.deviceName,
        controllable: validProps.controllable,
        retrievable: validProps.retrievable,
        supportedCmds: [...validProps.supportedCmds]  // Create a copy
      };

      const device = GoveeDevice.fromObject(obj);
      
      // Modifying original object should not affect device
      obj.supportedCmds.push('newCommand');
      expect(device.supportedCmds).toEqual(originalSupportedCmds);
    });
  });
});
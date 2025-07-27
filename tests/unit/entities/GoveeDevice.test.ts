import { describe, it, expect } from 'vitest';
import { GoveeDevice } from '../../../src/domain/entities/GoveeDevice';

describe('GoveeDevice', () => {
  const validCapabilities = [
    { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
    { type: 'devices.capabilities.range', instance: 'brightness' },
    { type: 'devices.capabilities.color_setting', instance: 'colorRgb' }
  ];

  const validProps = {
    deviceId: 'device123',
    sku: 'H6159',
    deviceName: 'Living Room Light',
    capabilities: validCapabilities
  };

  describe('constructor', () => {
    it('should create valid GoveeDevice with valid properties', () => {
      const device = new GoveeDevice(
        validProps.deviceId,
        validProps.sku,
        validProps.deviceName,
        validProps.capabilities
      );

      expect(device.deviceId).toBe(validProps.deviceId);
      expect(device.sku).toBe(validProps.sku);
      expect(device.model).toBe(validProps.sku); // model getter returns sku for compatibility
      expect(device.deviceName).toBe(validProps.deviceName);
      expect(device.controllable).toBe(true); // derived from capabilities
      expect(device.retrievable).toBe(true); // derived from capabilities
      expect(device.supportedCmds).toEqual(['turn', 'brightness', 'color']); // derived from capabilities
    });

    it('should create immutable supported commands array', () => {
      const device = new GoveeDevice(
        validProps.deviceId,
        validProps.sku,
        validProps.deviceName,
        validProps.capabilities
      );

      const commands = device.supportedCmds as string[];
      expect(() => commands.push('newCommand')).toThrow();
    });

    it('should throw error for empty device ID', () => {
      expect(() => new GoveeDevice('', validProps.sku, validProps.deviceName, validProps.capabilities))
        .toThrow('Device ID must be a non-empty string');
    });

    it('should throw error for whitespace-only device ID', () => {
      expect(() => new GoveeDevice('   ', validProps.sku, validProps.deviceName, validProps.capabilities))
        .toThrow('Device ID must be a non-empty string');
    });

    it('should throw error for empty sku', () => {
      expect(() => new GoveeDevice(validProps.deviceId, '', validProps.deviceName, validProps.capabilities))
        .toThrow('SKU must be a non-empty string');
    });

    it('should throw error for whitespace-only sku', () => {
      expect(() => new GoveeDevice(validProps.deviceId, '   ', validProps.deviceName, validProps.capabilities))
        .toThrow('SKU must be a non-empty string');
    });

    it('should throw error for empty device name', () => {
      expect(() => new GoveeDevice(validProps.deviceId, validProps.sku, '', validProps.capabilities))
        .toThrow('Device name must be a non-empty string');
    });

    it('should throw error for whitespace-only device name', () => {
      expect(() => new GoveeDevice(validProps.deviceId, validProps.sku, '   ', validProps.capabilities))
        .toThrow('Device name must be a non-empty string');
    });

    it('should throw error for non-array capabilities', () => {
      expect(() => new GoveeDevice(validProps.deviceId, validProps.sku, validProps.deviceName, 'invalid' as any))
        .toThrow('Capabilities must be an array');
    });

    it('should throw error for capability with empty type', () => {
      const invalidCapabilities = [
        { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
        { type: '', instance: 'brightness' }
      ];
      expect(() => new GoveeDevice(validProps.deviceId, validProps.sku, validProps.deviceName, invalidCapabilities))
        .toThrow('All capabilities must have non-empty type strings');
    });

    it('should throw error for capability with whitespace-only type', () => {
      const invalidCapabilities = [
        { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
        { type: '   ', instance: 'brightness' }
      ];
      expect(() => new GoveeDevice(validProps.deviceId, validProps.sku, validProps.deviceName, invalidCapabilities))
        .toThrow('All capabilities must have non-empty type strings');
    });

    it('should throw error for capability with non-string type', () => {
      const invalidCapabilities = [
        { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
        { type: 123, instance: 'brightness' }
      ] as any;
      expect(() => new GoveeDevice(validProps.deviceId, validProps.sku, validProps.deviceName, invalidCapabilities))
        .toThrow('All capabilities must have non-empty type strings');
    });
  });

  describe('equals', () => {
    it('should return true for devices with same deviceId and sku', () => {
      const device1 = new GoveeDevice(
        validProps.deviceId,
        validProps.sku,
        validProps.deviceName,
        validProps.capabilities
      );

      const device2 = new GoveeDevice(
        validProps.deviceId,
        validProps.sku,
        'Different Name',
        [{ type: 'devices.capabilities.on_off', instance: 'powerSwitch' }]
      );

      expect(device1.equals(device2)).toBe(true);
    });

    it('should return false for devices with different deviceId', () => {
      const device1 = new GoveeDevice(
        validProps.deviceId,
        validProps.sku,
        validProps.deviceName,
        validProps.capabilities
      );

      const device2 = new GoveeDevice(
        'different123',
        validProps.sku,
        validProps.deviceName,
        validProps.capabilities
      );

      expect(device1.equals(device2)).toBe(false);
    });

    it('should return false for devices with different sku', () => {
      const device1 = new GoveeDevice(
        validProps.deviceId,
        validProps.sku,
        validProps.deviceName,
        validProps.capabilities
      );

      const device2 = new GoveeDevice(
        validProps.deviceId,
        'H6160',
        validProps.deviceName,
        validProps.capabilities
      );

      expect(device1.equals(device2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return correct string representation', () => {
      const device = new GoveeDevice(
        validProps.deviceId,
        validProps.sku,
        validProps.deviceName,
        validProps.capabilities
      );

      expect(device.toString()).toBe('GoveeDevice(device123, H6159, "Living Room Light")');
    });
  });

  describe('utility methods', () => {
    let device: GoveeDevice;

    beforeEach(() => {
      device = new GoveeDevice(
        validProps.deviceId,
        validProps.sku,
        validProps.deviceName,
        validProps.capabilities
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
      // Device with no control capabilities
      const nonControlCapabilities = [
        { type: 'devices.capabilities.status', instance: 'status' }
      ];
      const nonControllable = new GoveeDevice(
        validProps.deviceId,
        validProps.sku,
        validProps.deviceName,
        nonControlCapabilities
      );

      expect(nonControllable.canControl()).toBe(false);
    });

    it('should handle non-retrievable device', () => {
      // Device with no capabilities (empty array means not retrievable)
      const nonRetrievable = new GoveeDevice(
        validProps.deviceId,
        validProps.sku,
        validProps.deviceName,
        []
      );

      expect(nonRetrievable.canRetrieve()).toBe(false);
    });
  });

  describe('toObject and fromObject', () => {
    it('should convert to object correctly', () => {
      const device = new GoveeDevice(
        validProps.deviceId,
        validProps.sku,
        validProps.deviceName,
        validProps.capabilities
      );

      const obj = device.toObject();
      expect(obj).toEqual({
        deviceId: validProps.deviceId,
        model: validProps.sku, // model field returns sku for compatibility
        deviceName: validProps.deviceName,
        controllable: true, // derived from capabilities
        retrievable: true, // derived from capabilities
        supportedCmds: ['turn', 'brightness', 'color'] // derived from capabilities
      });
    });

    it('should create device from object correctly', () => {
      const device = GoveeDevice.fromObject({
        deviceId: validProps.deviceId,
        model: validProps.sku,
        deviceName: validProps.deviceName,
        controllable: true,
        retrievable: true,
        supportedCmds: ['turn', 'brightness', 'color']
      });

      expect(device.deviceId).toBe(validProps.deviceId);
      expect(device.sku).toBe(validProps.sku);
      expect(device.deviceName).toBe(validProps.deviceName);
      expect(device.controllable).toBe(true);
      expect(device.retrievable).toBe(true);
      expect(device.supportedCmds).toEqual(['turn', 'brightness', 'color']);
    });

    it('should create immutable arrays when converting from object', () => {
      const originalSupportedCmds = ['turn', 'brightness', 'color'];
      const obj = {
        deviceId: validProps.deviceId,
        model: validProps.sku,
        deviceName: validProps.deviceName,
        controllable: true,
        retrievable: true,
        supportedCmds: [...originalSupportedCmds]  // Create a copy
      };

      const device = GoveeDevice.fromObject(obj);
      
      // Modifying original object should not affect device
      obj.supportedCmds.push('newCommand');
      expect(device.supportedCmds).toEqual(originalSupportedCmds);
    });
  });
});
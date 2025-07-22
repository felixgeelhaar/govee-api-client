import { describe, it, expect } from 'vitest';
import { ColorTemperature } from '../../../src/domain/value-objects/ColorTemperature';

describe('ColorTemperature', () => {
  describe('constructor', () => {
    it('should create valid ColorTemperature with valid kelvin value', () => {
      const temp = new ColorTemperature(2700);
      expect(temp.kelvin).toBe(2700);
    });

    it('should round decimal values', () => {
      const temp = new ColorTemperature(2700.7);
      expect(temp.kelvin).toBe(2701);
    });

    it('should throw error for kelvin value below 1000', () => {
      expect(() => new ColorTemperature(999)).toThrow('Color temperature must be between 1000K and 50000K, got 999K');
    });

    it('should throw error for kelvin value above 50000', () => {
      expect(() => new ColorTemperature(50001)).toThrow('Color temperature must be between 1000K and 50000K, got 50001K');
    });

    it('should throw error for non-finite kelvin value', () => {
      expect(() => new ColorTemperature(Infinity)).toThrow('Color temperature must be a finite number');
    });

    it('should throw error for NaN kelvin value', () => {
      expect(() => new ColorTemperature(NaN)).toThrow('Color temperature must be a finite number');
    });

    it('should accept minimum valid value', () => {
      const temp = new ColorTemperature(1000);
      expect(temp.kelvin).toBe(1000);
    });

    it('should accept maximum valid value', () => {
      const temp = new ColorTemperature(50000);
      expect(temp.kelvin).toBe(50000);
    });
  });

  describe('equals', () => {
    it('should return true for identical temperatures', () => {
      const temp1 = new ColorTemperature(2700);
      const temp2 = new ColorTemperature(2700);
      expect(temp1.equals(temp2)).toBe(true);
    });

    it('should return false for different temperatures', () => {
      const temp1 = new ColorTemperature(2700);
      const temp2 = new ColorTemperature(6500);
      expect(temp1.equals(temp2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return correct string representation', () => {
      const temp = new ColorTemperature(2700);
      expect(temp.toString()).toBe('2700K');
    });
  });

  describe('toObject', () => {
    it('should return correct object representation', () => {
      const temp = new ColorTemperature(2700);
      expect(temp.toObject()).toEqual({ kelvin: 2700 });
    });
  });

  describe('fromObject', () => {
    it('should create ColorTemperature from valid object', () => {
      const temp = ColorTemperature.fromObject({ kelvin: 2700 });
      expect(temp.kelvin).toBe(2700);
    });
  });

  describe('static factory methods', () => {
    it('should create warm white temperature', () => {
      const temp = ColorTemperature.warmWhite();
      expect(temp.kelvin).toBe(2700);
    });

    it('should create cool white temperature', () => {
      const temp = ColorTemperature.coolWhite();
      expect(temp.kelvin).toBe(6500);
    });

    it('should create daylight temperature', () => {
      const temp = ColorTemperature.daylight();
      expect(temp.kelvin).toBe(5600);
    });
  });

  describe('temperature classification methods', () => {
    it('should identify warm temperatures', () => {
      const warm = new ColorTemperature(3000);
      expect(warm.isWarm()).toBe(true);
      expect(warm.isCool()).toBe(false);
      expect(warm.isNeutral()).toBe(false);
    });

    it('should identify cool temperatures', () => {
      const cool = new ColorTemperature(6000);
      expect(cool.isWarm()).toBe(false);
      expect(cool.isCool()).toBe(true);
      expect(cool.isNeutral()).toBe(false);
    });

    it('should identify neutral temperatures', () => {
      const neutral = new ColorTemperature(4000);
      expect(neutral.isWarm()).toBe(false);
      expect(neutral.isCool()).toBe(false);
      expect(neutral.isNeutral()).toBe(true);
    });

    it('should handle boundary values correctly', () => {
      const warmBoundary = new ColorTemperature(3500);
      expect(warmBoundary.isNeutral()).toBe(true);
      
      const coolBoundary = new ColorTemperature(5000);
      expect(coolBoundary.isNeutral()).toBe(true);
    });
  });
});
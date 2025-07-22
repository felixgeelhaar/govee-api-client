import { describe, it, expect } from 'vitest';
import { Brightness } from '../../../src/domain/value-objects/Brightness';

describe('Brightness', () => {
  describe('constructor', () => {
    it('should create valid Brightness with valid level', () => {
      const brightness = new Brightness(75);
      expect(brightness.level).toBe(75);
    });

    it('should round decimal values', () => {
      const brightness = new Brightness(75.7);
      expect(brightness.level).toBe(76);
    });

    it('should throw error for level below 0', () => {
      expect(() => new Brightness(-1)).toThrow('Brightness level must be between 0 and 100, got -1');
    });

    it('should throw error for level above 100', () => {
      expect(() => new Brightness(101)).toThrow('Brightness level must be between 0 and 100, got 101');
    });

    it('should throw error for non-finite level', () => {
      expect(() => new Brightness(Infinity)).toThrow('Brightness level must be a finite number');
    });

    it('should throw error for NaN level', () => {
      expect(() => new Brightness(NaN)).toThrow('Brightness level must be a finite number');
    });

    it('should accept minimum valid value', () => {
      const brightness = new Brightness(0);
      expect(brightness.level).toBe(0);
    });

    it('should accept maximum valid value', () => {
      const brightness = new Brightness(100);
      expect(brightness.level).toBe(100);
    });
  });

  describe('equals', () => {
    it('should return true for identical brightness levels', () => {
      const brightness1 = new Brightness(75);
      const brightness2 = new Brightness(75);
      expect(brightness1.equals(brightness2)).toBe(true);
    });

    it('should return false for different brightness levels', () => {
      const brightness1 = new Brightness(75);
      const brightness2 = new Brightness(50);
      expect(brightness1.equals(brightness2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return correct string representation', () => {
      const brightness = new Brightness(75);
      expect(brightness.toString()).toBe('75%');
    });
  });

  describe('toObject', () => {
    it('should return correct object representation', () => {
      const brightness = new Brightness(75);
      expect(brightness.toObject()).toEqual({ level: 75 });
    });
  });

  describe('fromObject', () => {
    it('should create Brightness from valid object', () => {
      const brightness = Brightness.fromObject({ level: 75 });
      expect(brightness.level).toBe(75);
    });
  });

  describe('static factory methods', () => {
    it('should create minimum brightness', () => {
      const brightness = Brightness.min();
      expect(brightness.level).toBe(0);
    });

    it('should create maximum brightness', () => {
      const brightness = Brightness.max();
      expect(brightness.level).toBe(100);
    });

    it('should create dim brightness', () => {
      const brightness = Brightness.dim();
      expect(brightness.level).toBe(25);
    });

    it('should create medium brightness', () => {
      const brightness = Brightness.medium();
      expect(brightness.level).toBe(50);
    });

    it('should create bright brightness', () => {
      const brightness = Brightness.bright();
      expect(brightness.level).toBe(75);
    });
  });

  describe('brightness classification methods', () => {
    it('should identify dim brightness', () => {
      const dim = new Brightness(20);
      expect(dim.isDim()).toBe(true);
      expect(dim.isMedium()).toBe(false);
      expect(dim.isBright()).toBe(false);
    });

    it('should identify medium brightness', () => {
      const medium = new Brightness(50);
      expect(medium.isDim()).toBe(false);
      expect(medium.isMedium()).toBe(true);
      expect(medium.isBright()).toBe(false);
    });

    it('should identify bright brightness', () => {
      const bright = new Brightness(80);
      expect(bright.isDim()).toBe(false);
      expect(bright.isMedium()).toBe(false);
      expect(bright.isBright()).toBe(true);
    });

    it('should handle boundary values correctly', () => {
      const dimBoundary = new Brightness(25);
      expect(dimBoundary.isDim()).toBe(true);
      
      const brightBoundary = new Brightness(75);
      expect(brightBoundary.isBright()).toBe(true);
    });

    it('should identify off state', () => {
      const off = new Brightness(0);
      expect(off.isOff()).toBe(true);
      expect(off.isMax()).toBe(false);
    });

    it('should identify max state', () => {
      const max = new Brightness(100);
      expect(max.isOff()).toBe(false);
      expect(max.isMax()).toBe(true);
    });
  });

  describe('percentage methods', () => {
    it('should convert to percentage correctly', () => {
      const brightness = new Brightness(75);
      expect(brightness.asPercent()).toBe(0.75);
    });

    it('should create from percentage correctly', () => {
      const brightness = Brightness.fromPercent(0.75);
      expect(brightness.level).toBe(75);
    });

    it('should throw error for invalid percentage below 0', () => {
      expect(() => Brightness.fromPercent(-0.1)).toThrow('Percent must be between 0 and 1, got -0.1');
    });

    it('should throw error for invalid percentage above 1', () => {
      expect(() => Brightness.fromPercent(1.1)).toThrow('Percent must be between 0 and 1, got 1.1');
    });

    it('should throw error for non-finite percentage', () => {
      expect(() => Brightness.fromPercent(Infinity)).toThrow('Percent must be between 0 and 1, got Infinity');
    });

    it('should handle edge percentage values', () => {
      const min = Brightness.fromPercent(0);
      expect(min.level).toBe(0);
      
      const max = Brightness.fromPercent(1);
      expect(max.level).toBe(100);
    });
  });
});
import { describe, it, expect } from 'vitest';
import { ColorRgb } from '../../../src/domain/value-objects/ColorRgb';

describe('ColorRgb', () => {
  describe('constructor', () => {
    it('should create valid ColorRgb with valid RGB values', () => {
      const color = new ColorRgb(255, 128, 0);
      expect(color.r).toBe(255);
      expect(color.g).toBe(128);
      expect(color.b).toBe(0);
    });

    it('should round decimal values', () => {
      const color = new ColorRgb(254.7, 128.3, 0.9);
      expect(color.r).toBe(255);
      expect(color.g).toBe(128);
      expect(color.b).toBe(1);
    });

    it('should throw error for red value below 0', () => {
      expect(() => new ColorRgb(-1, 128, 0)).toThrow('RGB red component must be between 0 and 255, got -1');
    });

    it('should throw error for red value above 255', () => {
      expect(() => new ColorRgb(256, 128, 0)).toThrow('RGB red component must be between 0 and 255, got 256');
    });

    it('should throw error for green value below 0', () => {
      expect(() => new ColorRgb(255, -1, 0)).toThrow('RGB green component must be between 0 and 255, got -1');
    });

    it('should throw error for green value above 255', () => {
      expect(() => new ColorRgb(255, 256, 0)).toThrow('RGB green component must be between 0 and 255, got 256');
    });

    it('should throw error for blue value below 0', () => {
      expect(() => new ColorRgb(255, 128, -1)).toThrow('RGB blue component must be between 0 and 255, got -1');
    });

    it('should throw error for blue value above 255', () => {
      expect(() => new ColorRgb(255, 128, 256)).toThrow('RGB blue component must be between 0 and 255, got 256');
    });

    it('should throw error for non-finite red value', () => {
      expect(() => new ColorRgb(Infinity, 128, 0)).toThrow('RGB red component must be a finite number');
    });

    it('should throw error for non-finite green value', () => {
      expect(() => new ColorRgb(255, NaN, 0)).toThrow('RGB green component must be a finite number');
    });

    it('should throw error for non-finite blue value', () => {
      expect(() => new ColorRgb(255, 128, -Infinity)).toThrow('RGB blue component must be a finite number');
    });
  });

  describe('equals', () => {
    it('should return true for identical colors', () => {
      const color1 = new ColorRgb(255, 128, 0);
      const color2 = new ColorRgb(255, 128, 0);
      expect(color1.equals(color2)).toBe(true);
    });

    it('should return false for different colors', () => {
      const color1 = new ColorRgb(255, 128, 0);
      const color2 = new ColorRgb(255, 128, 1);
      expect(color1.equals(color2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return correct string representation', () => {
      const color = new ColorRgb(255, 128, 0);
      expect(color.toString()).toBe('rgb(255, 128, 0)');
    });
  });

  describe('toHex', () => {
    it('should return correct hex representation', () => {
      const color = new ColorRgb(255, 128, 0);
      expect(color.toHex()).toBe('#ff8000');
    });

    it('should pad single digit hex values', () => {
      const color = new ColorRgb(1, 2, 3);
      expect(color.toHex()).toBe('#010203');
    });
  });

  describe('toObject', () => {
    it('should return correct object representation', () => {
      const color = new ColorRgb(255, 128, 0);
      expect(color.toObject()).toEqual({ r: 255, g: 128, b: 0 });
    });
  });

  describe('fromHex', () => {
    it('should create ColorRgb from valid hex string with hash', () => {
      const color = ColorRgb.fromHex('#ff8000');
      expect(color.r).toBe(255);
      expect(color.g).toBe(128);
      expect(color.b).toBe(0);
    });

    it('should create ColorRgb from valid hex string without hash', () => {
      const color = ColorRgb.fromHex('ff8000');
      expect(color.r).toBe(255);
      expect(color.g).toBe(128);
      expect(color.b).toBe(0);
    });

    it('should handle lowercase hex values', () => {
      const color = ColorRgb.fromHex('ff8000');
      expect(color.r).toBe(255);
      expect(color.g).toBe(128);
      expect(color.b).toBe(0);
    });

    it('should handle uppercase hex values', () => {
      const color = ColorRgb.fromHex('FF8000');
      expect(color.r).toBe(255);
      expect(color.g).toBe(128);
      expect(color.b).toBe(0);
    });

    it('should throw error for invalid hex format', () => {
      expect(() => ColorRgb.fromHex('invalid')).toThrow('Invalid hex color format: invalid');
    });

    it('should throw error for short hex format', () => {
      expect(() => ColorRgb.fromHex('#fff')).toThrow('Invalid hex color format: #fff');
    });

    it('should throw error for long hex format', () => {
      expect(() => ColorRgb.fromHex('#ff80000')).toThrow('Invalid hex color format: #ff80000');
    });
  });

  describe('fromObject', () => {
    it('should create ColorRgb from valid object', () => {
      const color = ColorRgb.fromObject({ r: 255, g: 128, b: 0 });
      expect(color.r).toBe(255);
      expect(color.g).toBe(128);
      expect(color.b).toBe(0);
    });
  });
});
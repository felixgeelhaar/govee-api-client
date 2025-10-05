import { describe, it, expect } from 'vitest';
import { SegmentColor } from '../../../src/domain/value-objects/SegmentColor';
import { ColorRgb } from '../../../src/domain/value-objects/ColorRgb';
import { Brightness } from '../../../src/domain/value-objects/Brightness';

describe('SegmentColor', () => {
  describe('constructor with color only', () => {
    it('should create a valid SegmentColor with index and color', () => {
      const color = new ColorRgb(255, 0, 0);
      const segment = new SegmentColor(0, color);

      expect(segment.index).toBe(0);
      expect(segment.color.equals(color)).toBe(true);
      expect(segment.brightness).toBeUndefined();
    });

    it('should create a valid SegmentColor with index, color, and brightness', () => {
      const color = new ColorRgb(255, 0, 0);
      const brightness = new Brightness(75);
      const segment = new SegmentColor(0, color, brightness);

      expect(segment.index).toBe(0);
      expect(segment.color.equals(color)).toBe(true);
      expect(segment.brightness?.equals(brightness)).toBe(true);
    });

    it('should throw error when index is negative', () => {
      const color = new ColorRgb(255, 0, 0);
      expect(() => new SegmentColor(-1, color)).toThrow('Segment index must be a non-negative integer');
    });

    it('should throw error when index is not an integer', () => {
      const color = new ColorRgb(255, 0, 0);
      expect(() => new SegmentColor(1.5, color)).toThrow('Segment index must be a non-negative integer');
      expect(() => new SegmentColor(NaN, color)).toThrow('Segment index must be a non-negative integer');
    });

    it('should throw error when color is not provided', () => {
      expect(() => new SegmentColor(0, null as any)).toThrow('Color must be a valid ColorRgb instance');
      expect(() => new SegmentColor(0, undefined as any)).toThrow('Color must be a valid ColorRgb instance');
    });

    it('should accept index 0', () => {
      const color = new ColorRgb(255, 0, 0);
      const segment = new SegmentColor(0, color);
      expect(segment.index).toBe(0);
    });

    it('should accept high index values for devices with many segments', () => {
      const color = new ColorRgb(255, 0, 0);
      const segment = new SegmentColor(100, color);
      expect(segment.index).toBe(100);
    });
  });

  describe('equals', () => {
    it('should return true for identical segments', () => {
      const color = new ColorRgb(255, 0, 0);
      const brightness = new Brightness(50);
      const segment1 = new SegmentColor(0, color, brightness);
      const segment2 = new SegmentColor(0, color, brightness);

      expect(segment1.equals(segment2)).toBe(true);
    });

    it('should return false for segments with different indices', () => {
      const color = new ColorRgb(255, 0, 0);
      const segment1 = new SegmentColor(0, color);
      const segment2 = new SegmentColor(1, color);

      expect(segment1.equals(segment2)).toBe(false);
    });

    it('should return false for segments with different colors', () => {
      const color1 = new ColorRgb(255, 0, 0);
      const color2 = new ColorRgb(0, 255, 0);
      const segment1 = new SegmentColor(0, color1);
      const segment2 = new SegmentColor(0, color2);

      expect(segment1.equals(segment2)).toBe(false);
    });

    it('should return false for segments with different brightness', () => {
      const color = new ColorRgb(255, 0, 0);
      const brightness1 = new Brightness(50);
      const brightness2 = new Brightness(75);
      const segment1 = new SegmentColor(0, color, brightness1);
      const segment2 = new SegmentColor(0, color, brightness2);

      expect(segment1.equals(segment2)).toBe(false);
    });

    it('should return false when one has brightness and other does not', () => {
      const color = new ColorRgb(255, 0, 0);
      const brightness = new Brightness(50);
      const segment1 = new SegmentColor(0, color, brightness);
      const segment2 = new SegmentColor(0, color);

      expect(segment1.equals(segment2)).toBe(false);
    });
  });

  describe('toObject', () => {
    it('should convert to plain object without brightness', () => {
      const color = new ColorRgb(255, 0, 0);
      const segment = new SegmentColor(0, color);
      const obj = segment.toObject();

      expect(obj).toEqual({
        index: 0,
        color: { r: 255, g: 0, b: 0 },
        brightness: undefined,
      });
    });

    it('should convert to plain object with brightness', () => {
      const color = new ColorRgb(255, 0, 0);
      const brightness = new Brightness(75);
      const segment = new SegmentColor(0, color, brightness);
      const obj = segment.toObject();

      expect(obj).toEqual({
        index: 0,
        color: { r: 255, g: 0, b: 0 },
        brightness: 75,
      });
    });

    it('should return a new object each time', () => {
      const color = new ColorRgb(255, 0, 0);
      const segment = new SegmentColor(0, color);
      const obj1 = segment.toObject();
      const obj2 = segment.toObject();

      expect(obj1).not.toBe(obj2);
      expect(obj1).toEqual(obj2);
    });
  });

  describe('fromObject', () => {
    it('should create SegmentColor from plain object without brightness', () => {
      const obj = { index: 0, color: { r: 255, g: 0, b: 0 } };
      const segment = SegmentColor.fromObject(obj);

      expect(segment.index).toBe(0);
      expect(segment.color.r).toBe(255);
      expect(segment.color.g).toBe(0);
      expect(segment.color.b).toBe(0);
      expect(segment.brightness).toBeUndefined();
    });

    it('should create SegmentColor from plain object with brightness', () => {
      const obj = { index: 0, color: { r: 255, g: 0, b: 0 }, brightness: 75 };
      const segment = SegmentColor.fromObject(obj);

      expect(segment.index).toBe(0);
      expect(segment.color.r).toBe(255);
      expect(segment.brightness?.level).toBe(75);
    });

    it('should validate object properties', () => {
      expect(() => SegmentColor.fromObject({ index: -1, color: { r: 255, g: 0, b: 0 } }))
        .toThrow('Segment index must be a non-negative integer');

      expect(() => SegmentColor.fromObject({ index: 0, color: { r: 300, g: 0, b: 0 } }))
        .toThrow('RGB red component must be between 0 and 255');

      expect(() => SegmentColor.fromObject({ index: 0, color: { r: 255, g: 0, b: 0 }, brightness: 150 }))
        .toThrow('Brightness level must be between 0 and 100');
    });
  });

  describe('toString', () => {
    it('should return readable string representation without brightness', () => {
      const color = new ColorRgb(255, 0, 0);
      const segment = new SegmentColor(0, color);
      expect(segment.toString()).toBe('SegmentColor(index=0, color=rgb(255, 0, 0))');
    });

    it('should return readable string representation with brightness', () => {
      const color = new ColorRgb(255, 0, 0);
      const brightness = new Brightness(75);
      const segment = new SegmentColor(0, color, brightness);
      expect(segment.toString()).toBe('SegmentColor(index=0, color=rgb(255, 0, 0), brightness=75)');
    });
  });

  describe('hasBrightness', () => {
    it('should return false when brightness is not set', () => {
      const color = new ColorRgb(255, 0, 0);
      const segment = new SegmentColor(0, color);
      expect(segment.hasBrightness()).toBe(false);
    });

    it('should return true when brightness is set', () => {
      const color = new ColorRgb(255, 0, 0);
      const brightness = new Brightness(75);
      const segment = new SegmentColor(0, color, brightness);
      expect(segment.hasBrightness()).toBe(true);
    });
  });

  describe('immutability', () => {
    it('should not allow modification of properties', () => {
      const color = new ColorRgb(255, 0, 0);
      const brightness = new Brightness(75);
      const segment = new SegmentColor(0, color, brightness);

      expect(() => {
        (segment as any).index = 999;
      }).toThrow();

      expect(() => {
        (segment as any).color = new ColorRgb(0, 0, 0);
      }).toThrow();

      expect(() => {
        (segment as any).brightness = new Brightness(50);
      }).toThrow();
    });
  });
});

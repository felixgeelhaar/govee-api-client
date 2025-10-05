import { describe, it, expect } from 'vitest';
import { MusicMode } from '../../../src/domain/value-objects/MusicMode';

describe('MusicMode', () => {
  describe('constructor', () => {
    it('should create a valid MusicMode with mode id and sensitivity', () => {
      const musicMode = new MusicMode(1, 50);

      expect(musicMode.modeId).toBe(1);
      expect(musicMode.sensitivity).toBe(50);
    });

    it('should create a valid MusicMode with only mode id', () => {
      const musicMode = new MusicMode(1);

      expect(musicMode.modeId).toBe(1);
      expect(musicMode.sensitivity).toBeUndefined();
    });

    it('should throw error when modeId is not a positive integer', () => {
      expect(() => new MusicMode(-1)).toThrow('Mode ID must be a positive integer');
      expect(() => new MusicMode(0)).toThrow('Mode ID must be a positive integer');
      expect(() => new MusicMode(1.5)).toThrow('Mode ID must be a positive integer');
      expect(() => new MusicMode(NaN)).toThrow('Mode ID must be a positive integer');
    });

    it('should throw error when sensitivity is out of range', () => {
      expect(() => new MusicMode(1, -1)).toThrow('Sensitivity must be between 0 and 100');
      expect(() => new MusicMode(1, 101)).toThrow('Sensitivity must be between 0 and 100');
      expect(() => new MusicMode(1, NaN)).toThrow('Sensitivity must be a finite number');
    });

    it('should accept sensitivity at boundaries', () => {
      const min = new MusicMode(1, 0);
      const max = new MusicMode(1, 100);

      expect(min.sensitivity).toBe(0);
      expect(max.sensitivity).toBe(100);
    });

    it('should round sensitivity to nearest integer', () => {
      const musicMode = new MusicMode(1, 75.7);
      expect(musicMode.sensitivity).toBe(76);
    });
  });

  describe('equals', () => {
    it('should return true for identical music modes', () => {
      const mode1 = new MusicMode(1, 50);
      const mode2 = new MusicMode(1, 50);

      expect(mode1.equals(mode2)).toBe(true);
    });

    it('should return false for modes with different modeIds', () => {
      const mode1 = new MusicMode(1, 50);
      const mode2 = new MusicMode(2, 50);

      expect(mode1.equals(mode2)).toBe(false);
    });

    it('should return false for modes with different sensitivity', () => {
      const mode1 = new MusicMode(1, 50);
      const mode2 = new MusicMode(1, 75);

      expect(mode1.equals(mode2)).toBe(false);
    });

    it('should return false when one has sensitivity and other does not', () => {
      const mode1 = new MusicMode(1, 50);
      const mode2 = new MusicMode(1);

      expect(mode1.equals(mode2)).toBe(false);
    });

    it('should return true when both have no sensitivity', () => {
      const mode1 = new MusicMode(1);
      const mode2 = new MusicMode(1);

      expect(mode1.equals(mode2)).toBe(true);
    });
  });

  describe('toObject', () => {
    it('should convert to plain object with sensitivity', () => {
      const musicMode = new MusicMode(1, 50);
      const obj = musicMode.toObject();

      expect(obj).toEqual({
        modeId: 1,
        sensitivity: 50,
      });
    });

    it('should convert to plain object without sensitivity', () => {
      const musicMode = new MusicMode(1);
      const obj = musicMode.toObject();

      expect(obj).toEqual({
        modeId: 1,
        sensitivity: undefined,
      });
    });

    it('should return a new object each time', () => {
      const musicMode = new MusicMode(1, 50);
      const obj1 = musicMode.toObject();
      const obj2 = musicMode.toObject();

      expect(obj1).not.toBe(obj2);
      expect(obj1).toEqual(obj2);
    });
  });

  describe('fromObject', () => {
    it('should create MusicMode from plain object with sensitivity', () => {
      const obj = { modeId: 1, sensitivity: 50 };
      const musicMode = MusicMode.fromObject(obj);

      expect(musicMode.modeId).toBe(1);
      expect(musicMode.sensitivity).toBe(50);
    });

    it('should create MusicMode from plain object without sensitivity', () => {
      const obj = { modeId: 1 };
      const musicMode = MusicMode.fromObject(obj);

      expect(musicMode.modeId).toBe(1);
      expect(musicMode.sensitivity).toBeUndefined();
    });

    it('should validate object properties', () => {
      expect(() => MusicMode.fromObject({ modeId: -1 }))
        .toThrow('Mode ID must be a positive integer');

      expect(() => MusicMode.fromObject({ modeId: 1, sensitivity: 150 }))
        .toThrow('Sensitivity must be between 0 and 100');
    });
  });

  describe('toString', () => {
    it('should return readable string representation with sensitivity', () => {
      const musicMode = new MusicMode(1, 50);
      expect(musicMode.toString()).toBe('MusicMode(modeId=1, sensitivity=50)');
    });

    it('should return readable string representation without sensitivity', () => {
      const musicMode = new MusicMode(1);
      expect(musicMode.toString()).toBe('MusicMode(modeId=1)');
    });
  });

  describe('hasSensitivity', () => {
    it('should return false when sensitivity is not set', () => {
      const musicMode = new MusicMode(1);
      expect(musicMode.hasSensitivity()).toBe(false);
    });

    it('should return true when sensitivity is set', () => {
      const musicMode = new MusicMode(1, 50);
      expect(musicMode.hasSensitivity()).toBe(true);
    });

    it('should return true when sensitivity is 0', () => {
      const musicMode = new MusicMode(1, 0);
      expect(musicMode.hasSensitivity()).toBe(true);
    });
  });

  describe('toApiValue', () => {
    it('should return API-compatible value with sensitivity', () => {
      const musicMode = new MusicMode(1, 50);
      const apiValue = musicMode.toApiValue();

      expect(apiValue).toEqual({
        modeId: 1,
        sensitivity: 50,
      });
    });

    it('should return API-compatible value without sensitivity', () => {
      const musicMode = new MusicMode(1);
      const apiValue = musicMode.toApiValue();

      expect(apiValue).toEqual({
        modeId: 1,
      });
    });
  });

  describe('immutability', () => {
    it('should not allow modification of properties', () => {
      const musicMode = new MusicMode(1, 50);

      expect(() => {
        (musicMode as any).modeId = 999;
      }).toThrow();

      expect(() => {
        (musicMode as any).sensitivity = 75;
      }).toThrow();
    });
  });
});

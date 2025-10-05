import { describe, it, expect, beforeEach } from 'vitest';
import { GoveeClient } from '../../src/GoveeClient';
import { LightScene, SegmentColor, MusicMode, ColorRgb, Brightness } from '../../src/domain/value-objects';
import { CommandFactory } from '../../src/domain/entities/Command';
import { DeviceState } from '../../src/domain/entities/DeviceState';

describe('Advanced Light Control Integration Tests', () => {
  let client: GoveeClient;
  const testDeviceId = 'TEST_DEVICE_ID';
  const testModel = 'H6159';

  beforeEach(() => {
    client = new GoveeClient({
      apiKey: process.env.GOVEE_API_KEY || 'test-api-key',
    });
  });

  describe('Dynamic Light Scenes', () => {
    it('should have factory methods for common scenes', () => {
      const sunrise = LightScene.sunrise();
      expect(sunrise.name).toBe('Sunrise');
      expect(sunrise.id).toBe(3853);
      expect(sunrise.paramId).toBe(4280);

      const sunset = LightScene.sunset();
      expect(sunset.name).toBe('Sunset');

      const rainbow = LightScene.rainbow();
      expect(rainbow.name).toBe('Rainbow');

      const aurora = LightScene.aurora();
      expect(aurora.name).toBe('Aurora');

      const candlelight = LightScene.candlelight();
      expect(candlelight.name).toBe('Candlelight');

      const nightlight = LightScene.nightlight();
      expect(nightlight.name).toBe('Nightlight');

      const romantic = LightScene.romantic();
      expect(romantic.name).toBe('Romantic');

      const blinking = LightScene.blinking();
      expect(blinking.name).toBe('Blinking');
    });

    it('should create custom light scenes', () => {
      const customScene = new LightScene(1234, 5678, 'Custom Scene');
      expect(customScene.name).toBe('Custom Scene');
      expect(customScene.id).toBe(1234);
      expect(customScene.paramId).toBe(5678);
    });

    it('should serialize to API format correctly', () => {
      const scene = LightScene.sunrise();
      const apiValue = scene.toApiValue();

      expect(apiValue).toEqual({
        paramId: 4280,
        id: 3853,
      });
    });

    it('should support equality comparison', () => {
      const scene1 = LightScene.sunrise();
      const scene2 = LightScene.sunrise();
      const scene3 = LightScene.sunset();

      expect(scene1.equals(scene2)).toBe(true);
      expect(scene1.equals(scene3)).toBe(false);
    });

    it('should serialize and deserialize correctly', () => {
      const original = new LightScene(1234, 5678, 'Test Scene');
      const object = original.toObject();
      const restored = LightScene.fromObject(object);

      expect(restored.equals(original)).toBe(true);
    });
  });

  describe('RGB IC Segment Control', () => {
    it('should create segment with color only', () => {
      const segment = new SegmentColor(0, new ColorRgb(255, 0, 0));

      expect(segment.index).toBe(0);
      expect(segment.color.r).toBe(255);
      expect(segment.color.g).toBe(0);
      expect(segment.color.b).toBe(0);
      expect(segment.hasBrightness()).toBe(false);
    });

    it('should create segment with color and brightness', () => {
      const segment = new SegmentColor(
        1,
        new ColorRgb(0, 255, 0),
        new Brightness(75)
      );

      expect(segment.index).toBe(1);
      expect(segment.color.g).toBe(255);
      expect(segment.brightness?.level).toBe(75);
      expect(segment.hasBrightness()).toBe(true);
    });

    it('should create rainbow effect segments', () => {
      const rainbow = [
        new SegmentColor(0, new ColorRgb(255, 0, 0)),   // Red
        new SegmentColor(1, new ColorRgb(255, 127, 0)), // Orange
        new SegmentColor(2, new ColorRgb(255, 255, 0)), // Yellow
        new SegmentColor(3, new ColorRgb(0, 255, 0)),   // Green
        new SegmentColor(4, new ColorRgb(0, 0, 255)),   // Blue
        new SegmentColor(5, new ColorRgb(75, 0, 130)),  // Indigo
      ];

      expect(rainbow).toHaveLength(6);
      expect(rainbow[0].color.r).toBe(255);
      expect(rainbow[3].color.g).toBe(255);
      expect(rainbow[4].color.b).toBe(255);
    });

    it('should support equality comparison', () => {
      const segment1 = new SegmentColor(0, new ColorRgb(255, 0, 0));
      const segment2 = new SegmentColor(0, new ColorRgb(255, 0, 0));
      const segment3 = new SegmentColor(0, new ColorRgb(0, 255, 0));

      expect(segment1.equals(segment2)).toBe(true);
      expect(segment1.equals(segment3)).toBe(false);
    });

    it('should serialize and deserialize correctly', () => {
      const original = new SegmentColor(
        2,
        new ColorRgb(128, 128, 128),
        new Brightness(50)
      );
      const object = original.toObject();
      const restored = SegmentColor.fromObject(object);

      expect(restored.equals(original)).toBe(true);
    });
  });

  describe('Music Mode', () => {
    it('should create music mode with sensitivity', () => {
      const mode = new MusicMode(1, 75);

      expect(mode.modeId).toBe(1);
      expect(mode.sensitivity).toBe(75);
      expect(mode.hasSensitivity()).toBe(true);
    });

    it('should create music mode without sensitivity', () => {
      const mode = new MusicMode(2);

      expect(mode.modeId).toBe(2);
      expect(mode.sensitivity).toBeUndefined();
      expect(mode.hasSensitivity()).toBe(false);
    });

    it('should serialize to API format correctly', () => {
      const modeWithSensitivity = new MusicMode(1, 90);
      expect(modeWithSensitivity.toApiValue()).toEqual({
        modeId: 1,
        sensitivity: 90,
      });

      const modeWithoutSensitivity = new MusicMode(2);
      expect(modeWithoutSensitivity.toApiValue()).toEqual({
        modeId: 2,
      });
    });

    it('should support equality comparison', () => {
      const mode1 = new MusicMode(1, 75);
      const mode2 = new MusicMode(1, 75);
      const mode3 = new MusicMode(1, 50);
      const mode4 = new MusicMode(2);

      expect(mode1.equals(mode2)).toBe(true);
      expect(mode1.equals(mode3)).toBe(false);
      expect(mode1.equals(mode4)).toBe(false);
    });

    it('should serialize and deserialize correctly', () => {
      const original = new MusicMode(3, 60);
      const object = original.toObject();
      const restored = MusicMode.fromObject(object);

      expect(restored.equals(original)).toBe(true);
    });

    it('should validate sensitivity range', () => {
      expect(() => new MusicMode(1, -1)).toThrow();
      expect(() => new MusicMode(1, 101)).toThrow();
      expect(() => new MusicMode(1, 0)).not.toThrow();
      expect(() => new MusicMode(1, 100)).not.toThrow();
      expect(() => new MusicMode(1, 50)).not.toThrow();
    });
  });

  describe('Command Factory Integration', () => {
    it('should create LightSceneCommand', () => {
      const command = CommandFactory.lightScene(LightScene.sunrise());

      expect(command.name).toBe('lightScene');
      expect(command.value).toEqual({ paramId: 4280, id: 3853 });
    });

    it('should create SegmentColorRgbCommand with single segment', () => {
      const segment = new SegmentColor(0, new ColorRgb(255, 0, 0));
      const command = CommandFactory.segmentColorRgb(segment);

      expect(command.name).toBe('segmentedColorRgb');
      expect(command.value).toHaveLength(1);
    });

    it('should create SegmentColorRgbCommand with multiple segments', () => {
      const segments = [
        new SegmentColor(0, new ColorRgb(255, 0, 0)),
        new SegmentColor(1, new ColorRgb(0, 255, 0)),
      ];
      const command = CommandFactory.segmentColorRgb(segments);

      expect(command.name).toBe('segmentedColorRgb');
      expect(command.value).toHaveLength(2);
    });

    it('should create SegmentBrightnessCommand', () => {
      const segments = [
        { index: 0, brightness: new Brightness(100) },
        { index: 1, brightness: new Brightness(50) },
      ];
      const command = CommandFactory.segmentBrightness(segments);

      expect(command.name).toBe('segmentedBrightness');
      expect(command.value).toHaveLength(2);
    });

    it('should create MusicModeCommand', () => {
      const mode = new MusicMode(1, 75);
      const command = CommandFactory.musicMode(mode);

      expect(command.name).toBe('musicMode');
      expect(command.value).toEqual({ modeId: 1, sensitivity: 75 });
    });

    it('should create ToggleCommand', () => {
      const enableCommand = CommandFactory.nightlightToggle(true);
      expect(enableCommand.name).toBe('nightlightToggle');
      expect(enableCommand.value).toBe(1);

      const disableCommand = CommandFactory.gradientToggle(false);
      expect(disableCommand.name).toBe('gradientToggle');
      expect(disableCommand.value).toBe(0);
    });

    it('should create ModeCommand', () => {
      const numericMode = CommandFactory.nightlightScene(1);
      expect(numericMode.name).toBe('nightlightScene');
      expect(numericMode.value).toBe(1);

      const stringMode = CommandFactory.presetScene('cozy');
      expect(stringMode.name).toBe('presetScene');
      expect(stringMode.value).toBe('cozy');
    });
  });

  describe('DeviceState Integration', () => {
    it('should have getters for all new state types', () => {
      const state = new DeviceState(
        'device-123',
        'H6159',
        true,
        {
          lightScene: { value: LightScene.sunrise() },
          segmentedColorRgb: {
            value: [new SegmentColor(0, new ColorRgb(255, 0, 0))],
          },
          segmentedBrightness: {
            value: [{ index: 0, brightness: new Brightness(75) }],
          },
          musicMode: { value: new MusicMode(1, 90) },
          nightlightToggle: { value: true },
          gradientToggle: { value: false },
          nightlightScene: { value: 1 },
          presetScene: { value: 'cozy' },
        }
      );

      expect(state.getLightScene()).toBeDefined();
      expect(state.getSegmentColors()).toHaveLength(1);
      expect(state.getSegmentBrightness()).toHaveLength(1);
      expect(state.getMusicMode()?.modeId).toBe(1);
      expect(state.getNightlightToggle()).toBe(true);
      expect(state.getGradientToggle()).toBe(false);
      expect(state.getNightlightScene()).toBe(1);
      expect(state.getPresetScene()).toBe('cozy');
    });
  });
});

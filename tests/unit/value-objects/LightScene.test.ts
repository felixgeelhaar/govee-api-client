import { describe, it, expect } from 'vitest';
import { LightScene } from '../../../src/domain/value-objects/LightScene';

describe('LightScene', () => {
  describe('constructor', () => {
    it('should create a valid LightScene with all required parameters', () => {
      const scene = new LightScene(3853, 4280, 'Sunrise');

      expect(scene.id).toBe(3853);
      expect(scene.paramId).toBe(4280);
      expect(scene.name).toBe('Sunrise');
    });

    it('should throw error when id is not a positive integer', () => {
      expect(() => new LightScene(-1, 4280, 'Sunrise')).toThrow('ID must be a positive integer');
      expect(() => new LightScene(0, 4280, 'Sunrise')).toThrow('ID must be a positive integer');
      expect(() => new LightScene(1.5, 4280, 'Sunrise')).toThrow('ID must be a positive integer');
      expect(() => new LightScene(NaN, 4280, 'Sunrise')).toThrow('ID must be a positive integer');
    });

    it('should throw error when paramId is not a positive integer', () => {
      expect(() => new LightScene(3853, -1, 'Sunrise')).toThrow('ParamId must be a positive integer');
      expect(() => new LightScene(3853, 0, 'Sunrise')).toThrow('ParamId must be a positive integer');
      expect(() => new LightScene(3853, 1.5, 'Sunrise')).toThrow('ParamId must be a positive integer');
      expect(() => new LightScene(3853, NaN, 'Sunrise')).toThrow('ParamId must be a positive integer');
    });

    it('should throw error when name is empty or invalid', () => {
      expect(() => new LightScene(3853, 4280, '')).toThrow('Name must be a non-empty string');
      expect(() => new LightScene(3853, 4280, '   ')).toThrow('Name must be a non-empty string');
      expect(() => new LightScene(3853, 4280, null as any)).toThrow('Name must be a non-empty string');
      expect(() => new LightScene(3853, 4280, undefined as any)).toThrow('Name must be a non-empty string');
    });

    it('should trim whitespace from name', () => {
      const scene = new LightScene(3853, 4280, '  Sunrise  ');
      expect(scene.name).toBe('Sunrise');
    });
  });

  describe('equals', () => {
    it('should return true for identical scenes', () => {
      const scene1 = new LightScene(3853, 4280, 'Sunrise');
      const scene2 = new LightScene(3853, 4280, 'Sunrise');

      expect(scene1.equals(scene2)).toBe(true);
    });

    it('should return false for scenes with different ids', () => {
      const scene1 = new LightScene(3853, 4280, 'Sunrise');
      const scene2 = new LightScene(3854, 4280, 'Sunrise');

      expect(scene1.equals(scene2)).toBe(false);
    });

    it('should return false for scenes with different paramIds', () => {
      const scene1 = new LightScene(3853, 4280, 'Sunrise');
      const scene2 = new LightScene(3853, 4281, 'Sunrise');

      expect(scene1.equals(scene2)).toBe(false);
    });

    it('should consider scenes equal even with different names but same ids', () => {
      const scene1 = new LightScene(3853, 4280, 'Sunrise');
      const scene2 = new LightScene(3853, 4280, 'Different Name');

      expect(scene1.equals(scene2)).toBe(true);
    });
  });

  describe('toObject', () => {
    it('should convert to plain object', () => {
      const scene = new LightScene(3853, 4280, 'Sunrise');
      const obj = scene.toObject();

      expect(obj).toEqual({
        id: 3853,
        paramId: 4280,
        name: 'Sunrise',
      });
    });

    it('should return a new object each time', () => {
      const scene = new LightScene(3853, 4280, 'Sunrise');
      const obj1 = scene.toObject();
      const obj2 = scene.toObject();

      expect(obj1).not.toBe(obj2);
      expect(obj1).toEqual(obj2);
    });
  });

  describe('fromObject', () => {
    it('should create LightScene from plain object', () => {
      const obj = { id: 3853, paramId: 4280, name: 'Sunrise' };
      const scene = LightScene.fromObject(obj);

      expect(scene.id).toBe(3853);
      expect(scene.paramId).toBe(4280);
      expect(scene.name).toBe('Sunrise');
    });

    it('should validate object properties', () => {
      expect(() => LightScene.fromObject({ id: -1, paramId: 4280, name: 'Sunrise' }))
        .toThrow('ID must be a positive integer');

      expect(() => LightScene.fromObject({ id: 3853, paramId: -1, name: 'Sunrise' }))
        .toThrow('ParamId must be a positive integer');

      expect(() => LightScene.fromObject({ id: 3853, paramId: 4280, name: '' }))
        .toThrow('Name must be a non-empty string');
    });
  });

  describe('toString', () => {
    it('should return readable string representation', () => {
      const scene = new LightScene(3853, 4280, 'Sunrise');
      expect(scene.toString()).toBe('LightScene(Sunrise, id=3853, paramId=4280)');
    });
  });

  describe('toApiValue', () => {
    it('should return API-compatible value object', () => {
      const scene = new LightScene(3853, 4280, 'Sunrise');
      const apiValue = scene.toApiValue();

      expect(apiValue).toEqual({
        paramId: 4280,
        id: 3853,
      });
    });
  });

  describe('common scene factory methods', () => {
    it('should create Sunrise scene', () => {
      const sunrise = LightScene.sunrise();
      expect(sunrise.name).toBe('Sunrise');
      expect(sunrise.id).toBe(3853);
      expect(sunrise.paramId).toBe(4280);
    });

    it('should create Sunset scene', () => {
      const sunset = LightScene.sunset();
      expect(sunset.name).toBe('Sunset');
      expect(sunset.id).toBe(3854);
      expect(sunset.paramId).toBe(4281);
    });

    it('should create Rainbow scene', () => {
      const rainbow = LightScene.rainbow();
      expect(rainbow.name).toBe('Rainbow');
      expect(rainbow.id).toBe(3858);
      expect(rainbow.paramId).toBe(4285);
    });

    it('should create Aurora scene', () => {
      const aurora = LightScene.aurora();
      expect(aurora.name).toBe('Aurora');
      expect(aurora.id).toBe(3857);
      expect(aurora.paramId).toBe(4284);
    });

    it('should create Candlelight scene', () => {
      const candlelight = LightScene.candlelight();
      expect(candlelight.name).toBe('Candlelight');
      expect(candlelight.id).toBe(3867);
      expect(candlelight.paramId).toBe(4294);
    });

    it('should create Nightlight scene', () => {
      const nightlight = LightScene.nightlight();
      expect(nightlight.name).toBe('Nightlight');
      expect(nightlight.id).toBe(3868);
      expect(nightlight.paramId).toBe(4295);
    });

    it('should create Romantic scene', () => {
      const romantic = LightScene.romantic();
      expect(romantic.name).toBe('Romantic');
      expect(romantic.id).toBe(3869);
      expect(romantic.paramId).toBe(4296);
    });

    it('should create Blinking scene', () => {
      const blinking = LightScene.blinking();
      expect(blinking.name).toBe('Blinking');
      expect(blinking.id).toBe(3870);
      expect(blinking.paramId).toBe(4297);
    });

    it('should create Forest scene', () => {
      const forest = LightScene.forest();
      expect(forest.name).toBe('Forest');
      expect(forest.id).toBe(3859);
      expect(forest.paramId).toBe(4286);
    });

    it('should create Ocean scene', () => {
      const ocean = LightScene.ocean();
      expect(ocean.name).toBe('Ocean');
      expect(ocean.id).toBe(3860);
      expect(ocean.paramId).toBe(4287);
    });

    it('should create Snowing scene', () => {
      const snowing = LightScene.snowing();
      expect(snowing.name).toBe('Snowing');
      expect(snowing.id).toBe(3861);
      expect(snowing.paramId).toBe(4288);
    });

    it('should create Spring Wind scene', () => {
      const springWind = LightScene.springWind();
      expect(springWind.name).toBe('Spring Wind');
      expect(springWind.id).toBe(3862);
      expect(springWind.paramId).toBe(4289);
    });

    it('should create Cloudy scene', () => {
      const cloudy = LightScene.cloudy();
      expect(cloudy.name).toBe('Cloudy');
      expect(cloudy.id).toBe(3863);
      expect(cloudy.paramId).toBe(4290);
    });

    it('should create Firefly scene', () => {
      const firefly = LightScene.firefly();
      expect(firefly.name).toBe('Firefly');
      expect(firefly.id).toBe(3864);
      expect(firefly.paramId).toBe(4291);
    });

    it('should create Fire scene', () => {
      const fire = LightScene.fire();
      expect(fire.name).toBe('Fire');
      expect(fire.id).toBe(3865);
      expect(fire.paramId).toBe(4292);
    });

    it('should create Waterfall scene', () => {
      const waterfall = LightScene.waterfall();
      expect(waterfall.name).toBe('Waterfall');
      expect(waterfall.id).toBe(3866);
      expect(waterfall.paramId).toBe(4293);
    });
  });

  describe('immutability', () => {
    it('should not allow modification of properties', () => {
      const scene = new LightScene(3853, 4280, 'Sunrise');

      expect(() => {
        (scene as any).id = 9999;
      }).toThrow();

      expect(() => {
        (scene as any).paramId = 9999;
      }).toThrow();

      expect(() => {
        (scene as any).name = 'Modified';
      }).toThrow();
    });
  });
});

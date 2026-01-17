import { describe, it, expect } from 'vitest';
import { 
  PowerOnCommand, 
  PowerOffCommand, 
  BrightnessCommand, 
  ColorCommand, 
  ColorTemperatureCommand,
  CommandFactory 
} from '../../../src/domain/entities/Command';
import { ColorRgb, ColorTemperature, Brightness } from '../../../src/domain/value-objects';

describe('Command classes', () => {
  describe('PowerOnCommand', () => {
    it('should have correct name and value', () => {
      const command = new PowerOnCommand();
      expect(command.name).toBe('turn');
      expect(command.value).toBe('on');
    });

    it('should convert to object correctly', () => {
      const command = new PowerOnCommand();
      expect(command.toObject()).toEqual({ name: 'turn', value: 'on' });
    });
  });

  describe('PowerOffCommand', () => {
    it('should have correct name and value', () => {
      const command = new PowerOffCommand();
      expect(command.name).toBe('turn');
      expect(command.value).toBe('off');
    });

    it('should convert to object correctly', () => {
      const command = new PowerOffCommand();
      expect(command.toObject()).toEqual({ name: 'turn', value: 'off' });
    });
  });

  describe('BrightnessCommand', () => {
    it('should have correct name and value', () => {
      const brightness = new Brightness(75);
      const command = new BrightnessCommand(brightness);
      
      expect(command.name).toBe('brightness');
      expect(command.value).toBe(75);
      expect(command.brightness).toBe(brightness);
    });

    it('should convert to object correctly', () => {
      const brightness = new Brightness(75);
      const command = new BrightnessCommand(brightness);
      
      expect(command.toObject()).toEqual({ name: 'brightness', value: 75 });
    });
  });

  describe('ColorCommand', () => {
    it('should have correct name and value', () => {
      const color = new ColorRgb(255, 128, 0);
      const command = new ColorCommand(color);
      
      expect(command.name).toBe('color');
      expect(command.value).toEqual({ r: 255, g: 128, b: 0 });
      expect(command.color).toBe(color);
    });

    it('should convert to object correctly', () => {
      const color = new ColorRgb(255, 128, 0);
      const command = new ColorCommand(color);
      
      expect(command.toObject()).toEqual({ 
        name: 'color', 
        value: { r: 255, g: 128, b: 0 } 
      });
    });
  });

  describe('ColorTemperatureCommand', () => {
    it('should have correct name and value', () => {
      const colorTemp = new ColorTemperature(2700);
      const command = new ColorTemperatureCommand(colorTemp);
      
      expect(command.name).toBe('colorTem');
      expect(command.value).toBe(2700);
      expect(command.colorTemperature).toBe(colorTemp);
    });

    it('should convert to object correctly', () => {
      const colorTemp = new ColorTemperature(2700);
      const command = new ColorTemperatureCommand(colorTemp);
      
      expect(command.toObject()).toEqual({ name: 'colorTem', value: 2700 });
    });
  });
});

describe('CommandFactory', () => {
  describe('powerOn', () => {
    it('should create PowerOnCommand', () => {
      const command = CommandFactory.powerOn();
      expect(command).toBeInstanceOf(PowerOnCommand);
      expect(command.name).toBe('turn');
      expect(command.value).toBe('on');
    });
  });

  describe('powerOff', () => {
    it('should create PowerOffCommand', () => {
      const command = CommandFactory.powerOff();
      expect(command).toBeInstanceOf(PowerOffCommand);
      expect(command.name).toBe('turn');
      expect(command.value).toBe('off');
    });
  });

  describe('brightness', () => {
    it('should create BrightnessCommand', () => {
      const brightness = new Brightness(75);
      const command = CommandFactory.brightness(brightness);
      
      expect(command).toBeInstanceOf(BrightnessCommand);
      expect(command.name).toBe('brightness');
      expect(command.value).toBe(75);
      expect((command as BrightnessCommand).brightness).toBe(brightness);
    });
  });

  describe('color', () => {
    it('should create ColorCommand', () => {
      const color = new ColorRgb(255, 128, 0);
      const command = CommandFactory.color(color);
      
      expect(command).toBeInstanceOf(ColorCommand);
      expect(command.name).toBe('color');
      expect(command.value).toEqual({ r: 255, g: 128, b: 0 });
      expect((command as ColorCommand).color).toBe(color);
    });
  });

  describe('colorTemperature', () => {
    it('should create ColorTemperatureCommand', () => {
      const colorTemp = new ColorTemperature(2700);
      const command = CommandFactory.colorTemperature(colorTemp);

      expect(command).toBeInstanceOf(ColorTemperatureCommand);
      expect(command.name).toBe('colorTem');
      expect(command.value).toBe(2700);
      expect((command as ColorTemperatureCommand).colorTemperature).toBe(colorTemp);
    });
  });

  describe('sceneStageToggle', () => {
    it('should create ToggleCommand with enabled=true', () => {
      const command = CommandFactory.sceneStageToggle(true);

      expect(command.name).toBe('sceneStageToggle');
      expect(command.value).toBe(1);
      expect(command.toObject()).toEqual({ name: 'sceneStageToggle', value: 1 });
    });

    it('should create ToggleCommand with enabled=false', () => {
      const command = CommandFactory.sceneStageToggle(false);

      expect(command.name).toBe('sceneStageToggle');
      expect(command.value).toBe(0);
      expect(command.toObject()).toEqual({ name: 'sceneStageToggle', value: 0 });
    });
  });

  describe('fromObject', () => {
    it('should create PowerOnCommand from object', () => {
      const command = CommandFactory.fromObject({ name: 'turn', value: 'on' });
      
      expect(command).toBeInstanceOf(PowerOnCommand);
      expect(command.name).toBe('turn');
      expect(command.value).toBe('on');
    });

    it('should create PowerOffCommand from object', () => {
      const command = CommandFactory.fromObject({ name: 'turn', value: 'off' });
      
      expect(command).toBeInstanceOf(PowerOffCommand);
      expect(command.name).toBe('turn');
      expect(command.value).toBe('off');
    });

    it('should create BrightnessCommand from object', () => {
      const command = CommandFactory.fromObject({ name: 'brightness', value: 75 });
      
      expect(command).toBeInstanceOf(BrightnessCommand);
      expect(command.name).toBe('brightness');
      expect(command.value).toBe(75);
    });

    it('should create ColorCommand from object', () => {
      const command = CommandFactory.fromObject({ 
        name: 'color', 
        value: { r: 255, g: 128, b: 0 } 
      });
      
      expect(command).toBeInstanceOf(ColorCommand);
      expect(command.name).toBe('color');
      expect(command.value).toEqual({ r: 255, g: 128, b: 0 });
    });

    it('should create ColorTemperatureCommand from object', () => {
      const command = CommandFactory.fromObject({ name: 'colorTem', value: 2700 });
      
      expect(command).toBeInstanceOf(ColorTemperatureCommand);
      expect(command.name).toBe('colorTem');
      expect(command.value).toBe(2700);
    });

    it('should throw error for invalid power command value', () => {
      expect(() => CommandFactory.fromObject({ name: 'turn', value: 'invalid' }))
        .toThrow('Invalid power command value: invalid');
    });

    it('should throw error for invalid brightness command value', () => {
      expect(() => CommandFactory.fromObject({ name: 'brightness', value: 'invalid' }))
        .toThrow('Invalid brightness command value: invalid');
    });

    it('should throw error for invalid color command value', () => {
      expect(() => CommandFactory.fromObject({ name: 'color', value: 'invalid' }))
        .toThrow('Invalid color command value: invalid');
    });

    it('should throw error for invalid color temperature command value', () => {
      expect(() => CommandFactory.fromObject({ name: 'colorTem', value: 'invalid' }))
        .toThrow('Invalid color temperature command value: invalid');
    });

    it('should throw error for unknown command name', () => {
      expect(() => CommandFactory.fromObject({ name: 'unknown', value: 'test' }))
        .toThrow('Unknown command name: unknown');
    });

    it('should throw error for null color value', () => {
      expect(() => CommandFactory.fromObject({ name: 'color', value: null }))
        .toThrow('Invalid color command value: null');
    });

    it('should throw error for invalid nightlightToggle command value', () => {
      expect(() => CommandFactory.fromObject({ name: 'nightlightToggle', value: 'invalid' }))
        .toThrow('Invalid toggle command value: invalid');
    });

    it('should throw error for invalid gradientToggle command value', () => {
      expect(() => CommandFactory.fromObject({ name: 'gradientToggle', value: null }))
        .toThrow('Invalid toggle command value: null');
    });

    it('should throw error for invalid sceneStageToggle command value', () => {
      expect(() => CommandFactory.fromObject({ name: 'sceneStageToggle', value: 'invalid' }))
        .toThrow('Invalid toggle command value: invalid');
    });

    it('should create sceneStageToggle command from object with number value', () => {
      const commandEnabled = CommandFactory.fromObject({ name: 'sceneStageToggle', value: 1 });
      expect(commandEnabled.name).toBe('sceneStageToggle');
      expect(commandEnabled.value).toBe(1);

      const commandDisabled = CommandFactory.fromObject({ name: 'sceneStageToggle', value: 0 });
      expect(commandDisabled.name).toBe('sceneStageToggle');
      expect(commandDisabled.value).toBe(0);
    });

    it('should create sceneStageToggle command from object with boolean value', () => {
      const commandEnabled = CommandFactory.fromObject({ name: 'sceneStageToggle', value: true });
      expect(commandEnabled.name).toBe('sceneStageToggle');
      expect(commandEnabled.value).toBe(1);

      const commandDisabled = CommandFactory.fromObject({ name: 'sceneStageToggle', value: false });
      expect(commandDisabled.name).toBe('sceneStageToggle');
      expect(commandDisabled.value).toBe(0);
    });

    it('should throw error for invalid nightlightScene command value', () => {
      expect(() => CommandFactory.fromObject({ name: 'nightlightScene', value: null }))
        .toThrow('Invalid mode command value: null');
    });

    it('should throw error for invalid presetScene command value', () => {
      expect(() => CommandFactory.fromObject({ name: 'presetScene', value: { invalid: true } }))
        .toThrow('Invalid mode command value: [object Object]');
    });
  });
});
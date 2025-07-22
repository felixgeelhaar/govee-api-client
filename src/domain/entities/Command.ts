import { ColorRgb, ColorTemperature, Brightness } from '../value-objects';

export abstract class Command {
  abstract readonly name: string;
  abstract readonly value: unknown;

  abstract toObject(): { name: string; value: unknown };
}

export class PowerOnCommand extends Command {
  readonly name = 'turn';
  readonly value = 'on';

  toObject(): { name: string; value: string } {
    return { name: this.name, value: this.value };
  }
}

export class PowerOffCommand extends Command {
  readonly name = 'turn';
  readonly value = 'off';

  toObject(): { name: string; value: string } {
    return { name: this.name, value: this.value };
  }
}

export class BrightnessCommand extends Command {
  readonly name = 'brightness';
  private readonly _brightness: Brightness;

  constructor(brightness: Brightness) {
    super();
    this._brightness = brightness;
  }

  get value(): number {
    return this._brightness.level;
  }

  get brightness(): Brightness {
    return this._brightness;
  }

  toObject(): { name: string; value: number } {
    return { name: this.name, value: this.value };
  }
}

export class ColorCommand extends Command {
  readonly name = 'color';
  private readonly _color: ColorRgb;

  constructor(color: ColorRgb) {
    super();
    this._color = color;
  }

  get value(): { r: number; g: number; b: number } {
    return this._color.toObject();
  }

  get color(): ColorRgb {
    return this._color;
  }

  toObject(): { name: string; value: { r: number; g: number; b: number } } {
    return { name: this.name, value: this.value };
  }
}

export class ColorTemperatureCommand extends Command {
  readonly name = 'colorTem';
  private readonly _colorTemperature: ColorTemperature;

  constructor(colorTemperature: ColorTemperature) {
    super();
    this._colorTemperature = colorTemperature;
  }

  get value(): number {
    return this._colorTemperature.kelvin;
  }

  get colorTemperature(): ColorTemperature {
    return this._colorTemperature;
  }

  toObject(): { name: string; value: number } {
    return { name: this.name, value: this.value };
  }
}

export class CommandFactory {
  static powerOn(): PowerOnCommand {
    return new PowerOnCommand();
  }

  static powerOff(): PowerOffCommand {
    return new PowerOffCommand();
  }

  static brightness(brightness: Brightness): BrightnessCommand {
    return new BrightnessCommand(brightness);
  }

  static color(color: ColorRgb): ColorCommand {
    return new ColorCommand(color);
  }

  static colorTemperature(colorTemperature: ColorTemperature): ColorTemperatureCommand {
    return new ColorTemperatureCommand(colorTemperature);
  }

  static fromObject(obj: { name: string; value: unknown }): Command {
    switch (obj.name) {
      case 'turn':
        if (obj.value === 'on') {
          return new PowerOnCommand();
        } else if (obj.value === 'off') {
          return new PowerOffCommand();
        }
        throw new Error(`Invalid power command value: ${obj.value}`);

      case 'brightness':
        if (typeof obj.value === 'number') {
          return new BrightnessCommand(new Brightness(obj.value));
        }
        throw new Error(`Invalid brightness command value: ${obj.value}`);

      case 'color':
        if (typeof obj.value === 'object' && obj.value !== null) {
          const colorValue = obj.value as { r: number; g: number; b: number };
          return new ColorCommand(ColorRgb.fromObject(colorValue));
        }
        throw new Error(`Invalid color command value: ${obj.value}`);

      case 'colorTem':
        if (typeof obj.value === 'number') {
          return new ColorTemperatureCommand(new ColorTemperature(obj.value));
        }
        throw new Error(`Invalid color temperature command value: ${obj.value}`);

      default:
        throw new Error(`Unknown command name: ${obj.name}`);
    }
  }
}

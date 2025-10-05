import {
  ColorRgb,
  ColorTemperature,
  Brightness,
  LightScene,
  SegmentColor,
  MusicMode,
} from '../value-objects';

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

export class LightSceneCommand extends Command {
  readonly name = 'lightScene';
  private readonly _scene: LightScene;

  constructor(scene: LightScene) {
    super();
    this._scene = scene;
  }

  get value(): { paramId: number; id: number } {
    return this._scene.toApiValue();
  }

  get scene(): LightScene {
    return this._scene;
  }

  toObject(): { name: string; value: { paramId: number; id: number } } {
    return { name: this.name, value: this.value };
  }
}

export class SegmentColorRgbCommand extends Command {
  readonly name = 'segmentedColorRgb';
  private readonly _segments: SegmentColor[];

  constructor(segments: SegmentColor | SegmentColor[]) {
    super();
    this._segments = Array.isArray(segments) ? segments : [segments];
  }

  get value(): Array<{ segment: number; rgb: { r: number; g: number; b: number } }> {
    return this._segments.map(seg => ({
      segment: seg.index,
      rgb: seg.color.toObject(),
    }));
  }

  get segments(): readonly SegmentColor[] {
    return Object.freeze([...this._segments]);
  }

  toObject(): {
    name: string;
    value: Array<{ segment: number; rgb: { r: number; g: number; b: number } }>;
  } {
    return { name: this.name, value: this.value };
  }
}

export class SegmentBrightnessCommand extends Command {
  readonly name = 'segmentedBrightness';
  private readonly _segments: Array<{ index: number; brightness: Brightness }>;

  constructor(
    segments:
      | Array<{ index: number; brightness: Brightness }>
      | { index: number; brightness: Brightness }
  ) {
    super();
    this._segments = Array.isArray(segments) ? segments : [segments];
  }

  get value(): Array<{ segment: number; brightness: number }> {
    return this._segments.map(seg => ({
      segment: seg.index,
      brightness: seg.brightness.level,
    }));
  }

  get segments(): ReadonlyArray<{ index: number; brightness: Brightness }> {
    return Object.freeze([...this._segments]);
  }

  toObject(): { name: string; value: Array<{ segment: number; brightness: number }> } {
    return { name: this.name, value: this.value };
  }
}

export class MusicModeCommand extends Command {
  readonly name = 'musicMode';
  private readonly _musicMode: MusicMode;

  constructor(musicMode: MusicMode) {
    super();
    this._musicMode = musicMode;
  }

  get value(): { modeId: number; sensitivity?: number } {
    return this._musicMode.toApiValue();
  }

  get musicMode(): MusicMode {
    return this._musicMode;
  }

  toObject(): { name: string; value: { modeId: number; sensitivity?: number } } {
    return { name: this.name, value: this.value };
  }
}

export class ToggleCommand extends Command {
  readonly name: string;
  private readonly _enabled: boolean;

  constructor(instance: string, enabled: boolean) {
    super();
    this.name = instance; // e.g., 'nightlightToggle', 'gradientToggle'
    this._enabled = enabled;
  }

  get value(): number {
    return this._enabled ? 1 : 0;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  toObject(): { name: string; value: number } {
    return { name: this.name, value: this.value };
  }
}

export class ModeCommand extends Command {
  readonly name: string;
  private readonly _modeValue: string | number;

  constructor(instance: string, modeValue: string | number) {
    super();
    this.name = instance; // e.g., 'nightlightScene', 'presetScene'
    this._modeValue = modeValue;
  }

  get value(): string | number {
    return this._modeValue;
  }

  get modeValue(): string | number {
    return this._modeValue;
  }

  toObject(): { name: string; value: string | number } {
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

  static lightScene(scene: LightScene): LightSceneCommand {
    return new LightSceneCommand(scene);
  }

  static segmentColorRgb(segments: SegmentColor | SegmentColor[]): SegmentColorRgbCommand {
    return new SegmentColorRgbCommand(segments);
  }

  static segmentBrightness(
    segments:
      | Array<{ index: number; brightness: Brightness }>
      | { index: number; brightness: Brightness }
  ): SegmentBrightnessCommand {
    return new SegmentBrightnessCommand(segments);
  }

  static musicMode(musicMode: MusicMode): MusicModeCommand {
    return new MusicModeCommand(musicMode);
  }

  static toggle(instance: string, enabled: boolean): ToggleCommand {
    return new ToggleCommand(instance, enabled);
  }

  static nightlightToggle(enabled: boolean): ToggleCommand {
    return new ToggleCommand('nightlightToggle', enabled);
  }

  static gradientToggle(enabled: boolean): ToggleCommand {
    return new ToggleCommand('gradientToggle', enabled);
  }

  static mode(instance: string, modeValue: string | number): ModeCommand {
    return new ModeCommand(instance, modeValue);
  }

  static nightlightScene(sceneValue: string | number): ModeCommand {
    return new ModeCommand('nightlightScene', sceneValue);
  }

  static presetScene(sceneValue: string | number): ModeCommand {
    return new ModeCommand('presetScene', sceneValue);
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

      case 'lightScene':
        if (typeof obj.value === 'object' && obj.value !== null) {
          const sceneValue = obj.value as { id: number; paramId: number };
          return new LightSceneCommand(new LightScene(sceneValue.id, sceneValue.paramId, 'Scene'));
        }
        throw new Error(`Invalid light scene command value: ${obj.value}`);

      case 'segmentedColorRgb':
        if (Array.isArray(obj.value)) {
          const segments = obj.value.map(
            (seg: any) => new SegmentColor(seg.segment, ColorRgb.fromObject(seg.rgb))
          );
          return new SegmentColorRgbCommand(segments);
        }
        throw new Error(`Invalid segmented color RGB command value: ${obj.value}`);

      case 'segmentedBrightness':
        if (Array.isArray(obj.value)) {
          const segments = obj.value.map((seg: any) => ({
            index: seg.segment,
            brightness: new Brightness(seg.brightness),
          }));
          return new SegmentBrightnessCommand(segments);
        }
        throw new Error(`Invalid segmented brightness command value: ${obj.value}`);

      case 'musicMode':
        if (typeof obj.value === 'object' && obj.value !== null) {
          const modeValue = obj.value as { modeId: number; sensitivity?: number };
          return new MusicModeCommand(new MusicMode(modeValue.modeId, modeValue.sensitivity));
        }
        throw new Error(`Invalid music mode command value: ${obj.value}`);

      case 'nightlightToggle':
      case 'gradientToggle':
        if (typeof obj.value === 'number' || typeof obj.value === 'boolean') {
          const enabled = typeof obj.value === 'number' ? obj.value === 1 : obj.value;
          return new ToggleCommand(obj.name, enabled);
        }
        throw new Error(`Invalid toggle command value: ${obj.value}`);

      case 'nightlightScene':
      case 'presetScene':
        if (typeof obj.value === 'string' || typeof obj.value === 'number') {
          return new ModeCommand(obj.name, obj.value);
        }
        throw new Error(`Invalid mode command value: ${obj.value}`);

      default:
        throw new Error(`Unknown command name: ${obj.name}`);
    }
  }
}

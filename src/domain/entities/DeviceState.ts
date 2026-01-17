import {
  ColorRgb,
  ColorTemperature,
  Brightness,
  LightScene,
  SegmentColor,
  MusicMode,
} from '../value-objects';

export interface PowerState {
  value: 'on' | 'off';
}

export interface ColorState {
  value: ColorRgb;
}

export interface ColorTemperatureState {
  value: ColorTemperature;
}

export interface BrightnessState {
  value: Brightness;
}

export interface LightSceneState {
  value: LightScene;
}

export interface SegmentColorState {
  value: SegmentColor[];
}

export interface SegmentBrightnessState {
  value: Array<{ index: number; brightness: Brightness }>;
}

export interface MusicModeState {
  value: MusicMode;
}

export interface ToggleState {
  value: boolean;
}

export interface ModeState {
  value: string | number;
}

export type StateProperty =
  | PowerState
  | ColorState
  | ColorTemperatureState
  | BrightnessState
  | LightSceneState
  | SegmentColorState
  | SegmentBrightnessState
  | MusicModeState
  | ToggleState
  | ModeState;

export class DeviceState {
  private readonly _deviceId: string;
  private readonly _model: string;
  private readonly _online: boolean;
  private readonly _properties: Map<string, StateProperty>;

  constructor(
    deviceId: string,
    model: string,
    online: boolean,
    properties: Record<string, StateProperty> = {}
  ) {
    this.validateDeviceId(deviceId);
    this.validateModel(model);

    this._deviceId = deviceId;
    this._model = model;
    this._online = online;
    this._properties = new Map(Object.entries(properties));
  }

  private validateDeviceId(deviceId: string): void {
    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      throw new Error('Device ID must be a non-empty string');
    }
  }

  private validateModel(model: string): void {
    if (!model || typeof model !== 'string' || model.trim().length === 0) {
      throw new Error('Model must be a non-empty string');
    }
  }

  get deviceId(): string {
    return this._deviceId;
  }

  get model(): string {
    return this._model;
  }

  get online(): boolean {
    return this._online;
  }

  get properties(): ReadonlyMap<string, StateProperty> {
    return this._properties;
  }

  getProperty<T extends StateProperty>(key: string): T | undefined {
    return this._properties.get(key) as T | undefined;
  }

  hasProperty(key: string): boolean {
    return this._properties.has(key);
  }

  getPowerState(): 'on' | 'off' | undefined {
    const powerState = this.getProperty<PowerState>('powerSwitch');
    return powerState?.value;
  }

  getBrightness(): Brightness | undefined {
    const brightnessState = this.getProperty<BrightnessState>('brightness');
    return brightnessState?.value;
  }

  getColor(): ColorRgb | undefined {
    const colorState = this.getProperty<ColorState>('color');
    return colorState?.value;
  }

  getColorTemperature(): ColorTemperature | undefined {
    const colorTempState = this.getProperty<ColorTemperatureState>('colorTem');
    return colorTempState?.value;
  }

  getLightScene(): LightScene | undefined {
    const sceneState = this.getProperty<LightSceneState>('lightScene');
    return sceneState?.value;
  }

  getSegmentColors(): SegmentColor[] | undefined {
    const segmentState = this.getProperty<SegmentColorState>('segmentedColorRgb');
    return segmentState?.value;
  }

  getSegmentBrightness(): Array<{ index: number; brightness: Brightness }> | undefined {
    const segmentState = this.getProperty<SegmentBrightnessState>('segmentedBrightness');
    return segmentState?.value;
  }

  getMusicMode(): MusicMode | undefined {
    const musicState = this.getProperty<MusicModeState>('musicMode');
    return musicState?.value;
  }

  getNightlightToggle(): boolean | undefined {
    const toggleState = this.getProperty<ToggleState>('nightlightToggle');
    return toggleState?.value;
  }

  getGradientToggle(): boolean | undefined {
    const toggleState = this.getProperty<ToggleState>('gradientToggle');
    return toggleState?.value;
  }

  getSceneStageToggle(): boolean | undefined {
    const toggleState = this.getProperty<ToggleState>('sceneStageToggle');
    return toggleState?.value;
  }

  getNightlightScene(): string | number | undefined {
    const modeState = this.getProperty<ModeState>('nightlightScene');
    return modeState?.value;
  }

  getPresetScene(): string | number | undefined {
    const modeState = this.getProperty<ModeState>('presetScene');
    return modeState?.value;
  }

  isPoweredOn(): boolean {
    return this.getPowerState() === 'on';
  }

  isPoweredOff(): boolean {
    return this.getPowerState() === 'off';
  }

  isOnline(): boolean {
    return this._online;
  }

  isOffline(): boolean {
    return !this._online;
  }

  equals(other: DeviceState): boolean {
    if (
      this._deviceId !== other._deviceId ||
      this._model !== other._model ||
      this._online !== other._online
    ) {
      return false;
    }

    if (this._properties.size !== other._properties.size) {
      return false;
    }

    const thisEntries = Array.from(this._properties.entries());
    for (const [key, value] of thisEntries) {
      const otherValue = other._properties.get(key);
      if (!otherValue || JSON.stringify(value) !== JSON.stringify(otherValue)) {
        return false;
      }
    }

    return true;
  }

  toString(): string {
    const status = this._online ? 'online' : 'offline';
    const power = this.getPowerState() || 'unknown';
    return `DeviceState(${this._deviceId}, ${status}, ${power})`;
  }

  toObject(): {
    deviceId: string;
    model: string;
    online: boolean;
    properties: Record<string, StateProperty>;
  } {
    const properties: Record<string, StateProperty> = {};
    const entries = Array.from(this._properties.entries());
    for (const [key, value] of entries) {
      properties[key] = value;
    }

    return {
      deviceId: this._deviceId,
      model: this._model,
      online: this._online,
      properties,
    };
  }

  static fromObject(obj: {
    deviceId: string;
    model: string;
    online: boolean;
    properties: Record<string, StateProperty>;
  }): DeviceState {
    return new DeviceState(obj.deviceId, obj.model, obj.online, obj.properties);
  }
}

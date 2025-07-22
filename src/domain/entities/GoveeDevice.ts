export class GoveeDevice {
  private readonly _deviceId: string;
  private readonly _model: string;
  private readonly _deviceName: string;
  private readonly _controllable: boolean;
  private readonly _retrievable: boolean;
  private readonly _supportedCmds: string[];

  constructor(
    deviceId: string,
    model: string,
    deviceName: string,
    controllable: boolean,
    retrievable: boolean,
    supportedCmds: string[]
  ) {
    this.validateDeviceId(deviceId);
    this.validateModel(model);
    this.validateDeviceName(deviceName);
    this.validateSupportedCmds(supportedCmds);

    this._deviceId = deviceId;
    this._model = model;
    this._deviceName = deviceName;
    this._controllable = controllable;
    this._retrievable = retrievable;
    this._supportedCmds = [...supportedCmds];
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

  private validateDeviceName(deviceName: string): void {
    if (!deviceName || typeof deviceName !== 'string' || deviceName.trim().length === 0) {
      throw new Error('Device name must be a non-empty string');
    }
  }

  private validateSupportedCmds(supportedCmds: string[]): void {
    if (!Array.isArray(supportedCmds)) {
      throw new Error('Supported commands must be an array');
    }
    for (const cmd of supportedCmds) {
      if (typeof cmd !== 'string' || cmd.trim().length === 0) {
        throw new Error('All supported commands must be non-empty strings');
      }
    }
  }

  get deviceId(): string {
    return this._deviceId;
  }

  get model(): string {
    return this._model;
  }

  get deviceName(): string {
    return this._deviceName;
  }

  get controllable(): boolean {
    return this._controllable;
  }

  get retrievable(): boolean {
    return this._retrievable;
  }

  get supportedCmds(): readonly string[] {
    return Object.freeze([...this._supportedCmds]);
  }

  equals(other: GoveeDevice): boolean {
    return this._deviceId === other._deviceId && this._model === other._model;
  }

  toString(): string {
    return `GoveeDevice(${this._deviceId}, ${this._model}, "${this._deviceName}")`;
  }

  supportsCommand(command: string): boolean {
    return this._supportedCmds.includes(command);
  }

  canControl(): boolean {
    return this._controllable;
  }

  canRetrieve(): boolean {
    return this._retrievable;
  }

  toObject(): {
    deviceId: string;
    model: string;
    deviceName: string;
    controllable: boolean;
    retrievable: boolean;
    supportedCmds: string[];
  } {
    return {
      deviceId: this._deviceId,
      model: this._model,
      deviceName: this._deviceName,
      controllable: this._controllable,
      retrievable: this._retrievable,
      supportedCmds: [...this._supportedCmds],
    };
  }

  static fromObject(obj: {
    deviceId: string;
    model: string;
    deviceName: string;
    controllable: boolean;
    retrievable: boolean;
    supportedCmds: string[];
  }): GoveeDevice {
    return new GoveeDevice(
      obj.deviceId,
      obj.model,
      obj.deviceName,
      obj.controllable,
      obj.retrievable,
      [...obj.supportedCmds] // Create a copy to prevent mutation
    );
  }
}

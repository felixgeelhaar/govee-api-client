interface GoveeCapability {
  type: string;
  instance: string;
  parameters?: {
    dataType: string;
    options?: Array<{
      name: string;
      value: unknown;
    }>;
  };
}

export class GoveeDevice {
  private readonly _deviceId: string;
  private readonly _sku: string;
  private readonly _deviceName: string;
  private readonly _capabilities: GoveeCapability[];
  private readonly _controllable: boolean;
  private readonly _retrievable: boolean;
  private readonly _supportedCmds: string[];

  constructor(deviceId: string, sku: string, deviceName: string, capabilities: GoveeCapability[]) {
    this.validateDeviceId(deviceId);
    this.validateSku(sku);
    this.validateDeviceName(deviceName);
    this.validateCapabilities(capabilities);

    this._deviceId = deviceId;
    this._sku = sku;
    this._deviceName = deviceName;
    this._capabilities = [...capabilities];
    this._controllable = this.deriveControllable(capabilities);
    this._retrievable = this.deriveRetrievable(capabilities);
    this._supportedCmds = this.deriveSupportedCommands(capabilities);
  }

  private validateDeviceId(deviceId: string): void {
    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      throw new Error('Device ID must be a non-empty string');
    }
  }

  private validateSku(sku: string): void {
    if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
      throw new Error('SKU must be a non-empty string');
    }
  }

  private validateDeviceName(deviceName: string): void {
    if (!deviceName || typeof deviceName !== 'string' || deviceName.trim().length === 0) {
      throw new Error('Device name must be a non-empty string');
    }
  }

  private validateCapabilities(capabilities: GoveeCapability[]): void {
    if (!Array.isArray(capabilities)) {
      throw new Error('Capabilities must be an array');
    }
    for (const capability of capabilities) {
      if (
        !capability.type ||
        typeof capability.type !== 'string' ||
        capability.type.trim().length === 0
      ) {
        throw new Error('All capabilities must have non-empty type strings');
      }
    }
  }

  private deriveControllable(capabilities: GoveeCapability[]): boolean {
    // Device is controllable if it has any control capabilities
    return capabilities.some(
      cap =>
        cap.type.includes('on_off') ||
        cap.type.includes('range') ||
        cap.type.includes('color_setting')
    );
  }

  private deriveRetrievable(capabilities: GoveeCapability[]): boolean {
    // Most devices with capabilities are retrievable
    return capabilities.length > 0;
  }

  private deriveSupportedCommands(capabilities: GoveeCapability[]): string[] {
    const commands = new Set<string>();

    for (const capability of capabilities) {
      if (capability.type.includes('on_off')) commands.add('turn');
      if (capability.type.includes('range') && capability.instance === 'brightness')
        commands.add('brightness');
      if (capability.type.includes('color_setting')) {
        if (capability.instance === 'colorRgb') commands.add('color');
        if (capability.instance === 'colorTemperatureK') commands.add('colorTem');
      }
    }

    return Array.from(commands);
  }

  get deviceId(): string {
    return this._deviceId;
  }

  get model(): string {
    return this._sku; // For backward compatibility
  }

  get sku(): string {
    return this._sku;
  }

  get capabilities(): readonly GoveeCapability[] {
    return Object.freeze([...this._capabilities]);
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
    return this._deviceId === other._deviceId && this._sku === other._sku;
  }

  toString(): string {
    return `GoveeDevice(${this._deviceId}, ${this._sku}, "${this._deviceName}")`;
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
      model: this._sku,
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
    // Convert old format to new capabilities format for backward compatibility
    const capabilities: GoveeCapability[] = [];

    if (obj.supportedCmds.includes('turn')) {
      capabilities.push({ type: 'devices.capabilities.on_off', instance: 'powerSwitch' });
    }
    if (obj.supportedCmds.includes('brightness')) {
      capabilities.push({ type: 'devices.capabilities.range', instance: 'brightness' });
    }
    if (obj.supportedCmds.includes('color')) {
      capabilities.push({ type: 'devices.capabilities.color_setting', instance: 'colorRgb' });
    }
    if (obj.supportedCmds.includes('colorTem')) {
      capabilities.push({
        type: 'devices.capabilities.color_setting',
        instance: 'colorTemperatureK',
      });
    }

    return new GoveeDevice(obj.deviceId, obj.model, obj.deviceName, capabilities);
  }
}

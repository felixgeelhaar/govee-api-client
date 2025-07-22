export class ColorTemperature {
  private readonly _kelvin: number;

  constructor(kelvin: number) {
    this.validateKelvin(kelvin);
    this._kelvin = Math.round(kelvin);
  }

  private validateKelvin(value: number): void {
    if (!Number.isFinite(value)) {
      throw new Error('Color temperature must be a finite number');
    }
    if (value < 1000 || value > 50000) {
      throw new Error(`Color temperature must be between 1000K and 50000K, got ${value}K`);
    }
  }

  get kelvin(): number {
    return this._kelvin;
  }

  equals(other: ColorTemperature): boolean {
    return this._kelvin === other._kelvin;
  }

  toString(): string {
    return `${this._kelvin}K`;
  }

  toObject(): { kelvin: number } {
    return { kelvin: this._kelvin };
  }

  static fromObject(obj: { kelvin: number }): ColorTemperature {
    return new ColorTemperature(obj.kelvin);
  }

  static warmWhite(): ColorTemperature {
    return new ColorTemperature(2700);
  }

  static coolWhite(): ColorTemperature {
    return new ColorTemperature(6500);
  }

  static daylight(): ColorTemperature {
    return new ColorTemperature(5600);
  }

  isWarm(): boolean {
    return this._kelvin < 3500;
  }

  isCool(): boolean {
    return this._kelvin > 5000;
  }

  isNeutral(): boolean {
    return this._kelvin >= 3500 && this._kelvin <= 5000;
  }
}

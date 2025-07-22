export class Brightness {
  private readonly _level: number;

  constructor(level: number) {
    this.validateLevel(level);
    this._level = Math.round(level);
  }

  private validateLevel(value: number): void {
    if (!Number.isFinite(value)) {
      throw new Error('Brightness level must be a finite number');
    }
    if (value < 0 || value > 100) {
      throw new Error(`Brightness level must be between 0 and 100, got ${value}`);
    }
  }

  get level(): number {
    return this._level;
  }

  equals(other: Brightness): boolean {
    return this._level === other._level;
  }

  toString(): string {
    return `${this._level}%`;
  }

  toObject(): { level: number } {
    return { level: this._level };
  }

  static fromObject(obj: { level: number }): Brightness {
    return new Brightness(obj.level);
  }

  static min(): Brightness {
    return new Brightness(0);
  }

  static max(): Brightness {
    return new Brightness(100);
  }

  static dim(): Brightness {
    return new Brightness(25);
  }

  static medium(): Brightness {
    return new Brightness(50);
  }

  static bright(): Brightness {
    return new Brightness(75);
  }

  isDim(): boolean {
    return this._level <= 25;
  }

  isBright(): boolean {
    return this._level >= 75;
  }

  isMedium(): boolean {
    return this._level > 25 && this._level < 75;
  }

  isOff(): boolean {
    return this._level === 0;
  }

  isMax(): boolean {
    return this._level === 100;
  }

  asPercent(): number {
    return this._level / 100;
  }

  static fromPercent(percent: number): Brightness {
    if (!Number.isFinite(percent) || percent < 0 || percent > 1) {
      throw new Error(`Percent must be between 0 and 1, got ${percent}`);
    }
    return new Brightness(percent * 100);
  }
}

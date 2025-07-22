export class ColorRgb {
  private readonly _r: number;
  private readonly _g: number;
  private readonly _b: number;

  constructor(r: number, g: number, b: number) {
    this.validateComponent(r, 'red');
    this.validateComponent(g, 'green');
    this.validateComponent(b, 'blue');

    this._r = Math.round(r);
    this._g = Math.round(g);
    this._b = Math.round(b);
  }

  private validateComponent(value: number, component: string): void {
    if (!Number.isFinite(value)) {
      throw new Error(`RGB ${component} component must be a finite number`);
    }

    const rounded = Math.round(value);
    if (rounded < 0 || rounded > 255) {
      throw new Error(`RGB ${component} component must be between 0 and 255, got ${value}`);
    }
  }

  get r(): number {
    return this._r;
  }

  get g(): number {
    return this._g;
  }

  get b(): number {
    return this._b;
  }

  equals(other: ColorRgb): boolean {
    return this._r === other._r && this._g === other._g && this._b === other._b;
  }

  toString(): string {
    return `rgb(${this._r}, ${this._g}, ${this._b})`;
  }

  toHex(): string {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(this._r)}${toHex(this._g)}${toHex(this._b)}`;
  }

  toObject(): { r: number; g: number; b: number } {
    return { r: this._r, g: this._g, b: this._b };
  }

  static fromHex(hex: string): ColorRgb {
    const cleanHex = hex.replace('#', '');
    if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
      throw new Error(`Invalid hex color format: ${hex}`);
    }

    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    return new ColorRgb(r, g, b);
  }

  static fromObject(obj: { r: number; g: number; b: number }): ColorRgb {
    return new ColorRgb(obj.r, obj.g, obj.b);
  }
}

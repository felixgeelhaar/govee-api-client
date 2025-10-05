import { ColorRgb } from './ColorRgb';
import { Brightness } from './Brightness';

/**
 * SegmentColor value object represents a color configuration for a specific
 * LED segment on RGB IC lights that support per-segment control.
 *
 * @example
 * const red = new ColorRgb(255, 0, 0);
 * const segment = new SegmentColor(0, red); // First segment, red color
 * const segmentWithBrightness = new SegmentColor(1, red, new Brightness(75));
 */
export class SegmentColor {
  private readonly _index: number;
  private readonly _color: ColorRgb;
  private readonly _brightness: Brightness | undefined;

  constructor(index: number, color: ColorRgb, brightness?: Brightness) {
    this.validateIndex(index);
    this.validateColor(color);

    this._index = index;
    this._color = color;
    this._brightness = brightness;

    Object.freeze(this);
  }

  private validateIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error('Segment index must be a non-negative integer');
    }
  }

  private validateColor(color: ColorRgb): void {
    if (!(color instanceof ColorRgb)) {
      throw new Error('Color must be a valid ColorRgb instance');
    }
  }

  get index(): number {
    return this._index;
  }

  get color(): ColorRgb {
    return this._color;
  }

  get brightness(): Brightness | undefined {
    return this._brightness;
  }

  /**
   * Checks if brightness is set for this segment.
   */
  hasBrightness(): boolean {
    return this._brightness !== undefined;
  }

  /**
   * Compares this SegmentColor with another for equality.
   */
  equals(other: SegmentColor): boolean {
    const colorEquals = this._color.equals(other._color);
    const indexEquals = this._index === other._index;

    if (!colorEquals || !indexEquals) {
      return false;
    }

    // Check brightness equality
    if (this._brightness === undefined && other._brightness === undefined) {
      return true;
    }

    if (this._brightness === undefined || other._brightness === undefined) {
      return false;
    }

    return this._brightness.equals(other._brightness);
  }

  /**
   * Converts the SegmentColor to a plain object.
   */
  toObject(): { index: number; color: { r: number; g: number; b: number }; brightness?: number } {
    return {
      index: this._index,
      color: this._color.toObject(),
      brightness: this._brightness?.level,
    };
  }

  /**
   * Creates a SegmentColor from a plain object.
   */
  static fromObject(obj: {
    index: number;
    color: { r: number; g: number; b: number };
    brightness?: number;
  }): SegmentColor {
    const color = ColorRgb.fromObject(obj.color);
    const brightness = obj.brightness !== undefined ? new Brightness(obj.brightness) : undefined;
    return new SegmentColor(obj.index, color, brightness);
  }

  /**
   * Returns a string representation of the SegmentColor.
   */
  toString(): string {
    const brightnessStr = this._brightness ? `, brightness=${this._brightness.level}` : '';
    return `SegmentColor(index=${this._index}, color=${this._color.toString()}${brightnessStr})`;
  }
}

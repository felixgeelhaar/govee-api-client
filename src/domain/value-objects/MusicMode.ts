/**
 * MusicMode value object represents a music-reactive lighting mode
 * configuration for Govee devices that support music synchronization.
 *
 * @example
 * const musicMode = new MusicMode(1, 50); // Mode 1 with 50% sensitivity
 * const modeOnly = new MusicMode(2); // Mode 2 with default sensitivity
 */
export class MusicMode {
  private readonly _modeId: number;
  private readonly _sensitivity: number | undefined;

  constructor(modeId: number, sensitivity?: number) {
    this.validateModeId(modeId);
    if (sensitivity !== undefined) {
      this.validateSensitivity(sensitivity);
    }

    this._modeId = modeId;
    this._sensitivity = sensitivity !== undefined ? Math.round(sensitivity) : undefined;

    Object.freeze(this);
  }

  private validateModeId(modeId: number): void {
    if (!Number.isInteger(modeId) || modeId <= 0) {
      throw new Error('Mode ID must be a positive integer');
    }
  }

  private validateSensitivity(sensitivity: number): void {
    if (!Number.isFinite(sensitivity)) {
      throw new Error('Sensitivity must be a finite number');
    }
    if (sensitivity < 0 || sensitivity > 100) {
      throw new Error('Sensitivity must be between 0 and 100');
    }
  }

  get modeId(): number {
    return this._modeId;
  }

  get sensitivity(): number | undefined {
    return this._sensitivity;
  }

  /**
   * Checks if sensitivity is set for this music mode.
   */
  hasSensitivity(): boolean {
    return this._sensitivity !== undefined;
  }

  /**
   * Compares this MusicMode with another for equality.
   */
  equals(other: MusicMode): boolean {
    if (this._modeId !== other._modeId) {
      return false;
    }

    // Check sensitivity equality
    if (this._sensitivity === undefined && other._sensitivity === undefined) {
      return true;
    }

    if (this._sensitivity === undefined || other._sensitivity === undefined) {
      return false;
    }

    return this._sensitivity === other._sensitivity;
  }

  /**
   * Converts the MusicMode to a plain object.
   */
  toObject(): { modeId: number; sensitivity?: number } {
    return {
      modeId: this._modeId,
      sensitivity: this._sensitivity,
    };
  }

  /**
   * Creates a MusicMode from a plain object.
   */
  static fromObject(obj: { modeId: number; sensitivity?: number }): MusicMode {
    return new MusicMode(obj.modeId, obj.sensitivity);
  }

  /**
   * Returns a string representation of the MusicMode.
   */
  toString(): string {
    const sensitivityStr =
      this._sensitivity !== undefined ? `, sensitivity=${this._sensitivity}` : '';
    return `MusicMode(modeId=${this._modeId}${sensitivityStr})`;
  }

  /**
   * Converts to API-compatible value format for command payloads.
   */
  toApiValue(): { modeId: number; sensitivity?: number } {
    const value: { modeId: number; sensitivity?: number } = {
      modeId: this._modeId,
    };

    if (this._sensitivity !== undefined) {
      value.sensitivity = this._sensitivity;
    }

    return value;
  }
}

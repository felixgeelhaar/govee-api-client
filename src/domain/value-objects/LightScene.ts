/**
 * LightScene value object represents a dynamic light scene
 * available on Govee lighting devices.
 *
 * @example
 * const sunrise = LightScene.sunrise();
 * const custom = new LightScene(3853, 4280, 'Sunrise');
 * const fromApi = LightScene.fromObject({ id: 3853, paramId: 4280, name: 'Sunrise' });
 */
export class LightScene {
  private readonly _id: number;
  private readonly _paramId: number;
  private readonly _name: string;

  constructor(id: number, paramId: number, name: string) {
    this.validateId(id);
    this.validateParamId(paramId);
    this.validateName(name);

    this._id = id;
    this._paramId = paramId;
    this._name = name.trim();

    Object.freeze(this);
  }

  private validateId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('ID must be a positive integer');
    }
  }

  private validateParamId(paramId: number): void {
    if (!Number.isInteger(paramId) || paramId <= 0) {
      throw new Error('ParamId must be a positive integer');
    }
  }

  private validateName(name: string): void {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Name must be a non-empty string');
    }
  }

  get id(): number {
    return this._id;
  }

  get paramId(): number {
    return this._paramId;
  }

  get name(): string {
    return this._name;
  }

  /**
   * Compares this LightScene with another for equality.
   * Two scenes are equal if they have the same id and paramId.
   */
  equals(other: LightScene): boolean {
    return this._id === other._id && this._paramId === other._paramId;
  }

  /**
   * Converts the LightScene to a plain object.
   */
  toObject(): { id: number; paramId: number; name: string } {
    return {
      id: this._id,
      paramId: this._paramId,
      name: this._name,
    };
  }

  /**
   * Creates a LightScene from a plain object.
   */
  static fromObject(obj: { id: number; paramId: number; name: string }): LightScene {
    return new LightScene(obj.id, obj.paramId, obj.name);
  }

  /**
   * Returns a string representation of the LightScene.
   */
  toString(): string {
    return `LightScene(${this._name}, id=${this._id}, paramId=${this._paramId})`;
  }

  /**
   * Converts to API-compatible value format for command payloads.
   */
  toApiValue(): { paramId: number; id: number } {
    return {
      paramId: this._paramId,
      id: this._id,
    };
  }

  // Factory methods for common scenes based on Govee API documentation

  static sunrise(): LightScene {
    return new LightScene(3853, 4280, 'Sunrise');
  }

  static sunset(): LightScene {
    return new LightScene(3854, 4281, 'Sunset');
  }

  static sunsetGlow(): LightScene {
    return new LightScene(3855, 4282, 'Sunset Glow');
  }

  static spring(): LightScene {
    return new LightScene(3856, 4283, 'Spring');
  }

  static aurora(): LightScene {
    return new LightScene(3857, 4284, 'Aurora');
  }

  static rainbow(): LightScene {
    return new LightScene(3858, 4285, 'Rainbow');
  }

  static forest(): LightScene {
    return new LightScene(3859, 4286, 'Forest');
  }

  static ocean(): LightScene {
    return new LightScene(3860, 4287, 'Ocean');
  }

  static snowing(): LightScene {
    return new LightScene(3861, 4288, 'Snowing');
  }

  static springWind(): LightScene {
    return new LightScene(3862, 4289, 'Spring Wind');
  }

  static cloudy(): LightScene {
    return new LightScene(3863, 4290, 'Cloudy');
  }

  static firefly(): LightScene {
    return new LightScene(3864, 4291, 'Firefly');
  }

  static fire(): LightScene {
    return new LightScene(3865, 4292, 'Fire');
  }

  static waterfall(): LightScene {
    return new LightScene(3866, 4293, 'Waterfall');
  }

  static candlelight(): LightScene {
    return new LightScene(3867, 4294, 'Candlelight');
  }

  static nightlight(): LightScene {
    return new LightScene(3868, 4295, 'Nightlight');
  }

  static romantic(): LightScene {
    return new LightScene(3869, 4296, 'Romantic');
  }

  static blinking(): LightScene {
    return new LightScene(3870, 4297, 'Blinking');
  }
}

/**
 * DiyScene value object represents a user-designed dynamic animation
 * on a Govee lighting device.
 *
 * DIY scenes are animations the user has built in the Govee mobile app
 * (custom colors, transitions, speeds, blending rules) and saved to the
 * device. They differ from {@link LightScene} (Govee's curated gallery)
 * and {@link Snapshot} (static point-in-time configuration) by being
 * both *dynamic* and *user-authored*.
 *
 * On the API surface they share the shape `{ id, paramId, name }` with
 * other `devices.capabilities.dynamic_scene` entries, but their
 * `instance` is `"diyScene"`.
 *
 * @example
 * const mySparkles = new DiyScene(5001, 6001, 'Party Sparkles');
 * await client.setDiyScene(deviceId, model, mySparkles);
 */
export class DiyScene {
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
   * Two DIY scenes are equal if they have the same id and paramId.
   */
  equals(other: DiyScene): boolean {
    return this._id === other._id && this._paramId === other._paramId;
  }

  toObject(): { id: number; paramId: number; name: string } {
    return {
      id: this._id,
      paramId: this._paramId,
      name: this._name,
    };
  }

  static fromObject(obj: { id: number; paramId: number; name: string }): DiyScene {
    return new DiyScene(obj.id, obj.paramId, obj.name);
  }

  toString(): string {
    return `DiyScene(${this._name}, id=${this._id}, paramId=${this._paramId})`;
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
}

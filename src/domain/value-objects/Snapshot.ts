/**
 * Snapshot value object represents a user-created saved light state
 * on a Govee lighting device.
 *
 * Snapshots are static "preset slots" — a point-in-time configuration
 * (specific color, brightness, or mid-scene state) the user has saved
 * in the Govee mobile app and named (e.g. "Reading", "Movie night").
 * Unlike {@link LightScene} (Govee's curated dynamic animations) or
 * {@link DiyScene} (user-designed animations), snapshots capture a
 * frozen moment and are recalled exactly as saved.
 *
 * On the API surface they share the shape `{ id, paramId, name }` with
 * other `devices.capabilities.dynamic_scene` entries, but their
 * `instance` is `"snapshot"`.
 *
 * @example
 * const readingPreset = new Snapshot(1001, 2001, 'Reading');
 * await client.setSnapshot(deviceId, model, readingPreset);
 */
export class Snapshot {
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
   * Two snapshots are equal if they have the same id and paramId.
   */
  equals(other: Snapshot): boolean {
    return this._id === other._id && this._paramId === other._paramId;
  }

  toObject(): { id: number; paramId: number; name: string } {
    return {
      id: this._id,
      paramId: this._paramId,
      name: this._name,
    };
  }

  static fromObject(obj: { id: number; paramId: number; name: string }): Snapshot {
    return new Snapshot(obj.id, obj.paramId, obj.name);
  }

  toString(): string {
    return `Snapshot(${this._name}, id=${this._id}, paramId=${this._paramId})`;
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

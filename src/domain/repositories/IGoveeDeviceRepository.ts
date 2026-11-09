import type { CommandOptions } from './CommandOptions.js';
import { GoveeDevice, DeviceState } from '../entities/index.js';
import { Command } from '../entities/Command.js';
import { LightScene } from '../value-objects/index.js';
import { Snapshot } from '../value-objects/Snapshot.js';
import { DiyScene } from '../value-objects/DiyScene.js';

export interface IGoveeDeviceRepository {
  findAll(): Promise<GoveeDevice[]>;
  findState(deviceId: string, sku: string): Promise<DeviceState>;
  sendCommand(
    deviceId: string,
    sku: string,
    command: Command,
    options?: CommandOptions
  ): Promise<void>;
  findDynamicScenes(deviceId: string, sku: string): Promise<LightScene[]>;
  findSnapshots(deviceId: string, sku: string): Promise<Snapshot[]>;
  findDiyScenes(deviceId: string, sku: string): Promise<DiyScene[]>;
}

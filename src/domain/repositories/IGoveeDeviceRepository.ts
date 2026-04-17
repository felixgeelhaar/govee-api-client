import { GoveeDevice } from '../entities/GoveeDevice';
import { DeviceState } from '../entities/DeviceState';
import { Command } from '../entities/Command';
import { LightScene } from '../value-objects/LightScene';
import { Snapshot } from '../value-objects/Snapshot';
import { DiyScene } from '../value-objects/DiyScene';

export interface IGoveeDeviceRepository {
  findAll(): Promise<GoveeDevice[]>;
  findState(deviceId: string, sku: string): Promise<DeviceState>;
  sendCommand(deviceId: string, sku: string, command: Command): Promise<void>;
  findDynamicScenes(deviceId: string, sku: string): Promise<LightScene[]>;
  findSnapshots(deviceId: string, sku: string): Promise<Snapshot[]>;
  findDiyScenes(deviceId: string, sku: string): Promise<DiyScene[]>;
}

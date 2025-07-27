import { GoveeDevice } from '../entities/GoveeDevice';
import { DeviceState } from '../entities/DeviceState';
import { Command } from '../entities/Command';

export interface IGoveeDeviceRepository {
  /**
   * Retrieves all devices associated with the configured API key
   */
  findAll(): Promise<GoveeDevice[]>;

  /**
   * Retrieves the current state of a specific device
   */
  findState(deviceId: string, sku: string): Promise<DeviceState>;

  /**
   * Sends a command to control a specific device
   */
  sendCommand(deviceId: string, sku: string, command: Command): Promise<void>;
}

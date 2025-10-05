import { Logger } from 'pino';
import { IGoveeDeviceRepository } from '../../domain/repositories/IGoveeDeviceRepository';
import { GoveeDevice } from '../../domain/entities/GoveeDevice';
import { DeviceState } from '../../domain/entities/DeviceState';
import { Command } from '../../domain/entities/Command';
import { LightScene } from '../../domain/value-objects';
import {
  RetryExecutor,
  RetryableRequest,
  RetryExecutorFactory,
  RetryResult,
} from './RetryableRequest';
import { RetryPolicy } from './RetryPolicy';

/**
 * Configuration for RetryableRepository
 */
export interface RetryableRepositoryConfig {
  /** The underlying repository to wrap */
  repository: IGoveeDeviceRepository;
  /** Retry executor to use */
  retryExecutor?: RetryExecutor;
  /** Logger for retry operations */
  logger?: Logger;
  /** Enable request ID generation */
  enableRequestIds?: boolean;
}

/**
 * Repository wrapper that adds retry functionality to any IGoveeDeviceRepository implementation
 */
export class RetryableRepository implements IGoveeDeviceRepository {
  private readonly repository: IGoveeDeviceRepository;
  private readonly retryExecutor: RetryExecutor;
  private readonly logger?: Logger;
  private readonly enableRequestIds: boolean;
  private requestIdCounter = 0;

  constructor(config: RetryableRepositoryConfig) {
    this.repository = config.repository;
    this.retryExecutor =
      config.retryExecutor || RetryExecutorFactory.createForGoveeApi(config.logger);
    this.logger = config.logger;
    this.enableRequestIds = config.enableRequestIds ?? true;
  }

  /**
   * Generates a unique request ID
   */
  private generateRequestId(operation: string): string {
    if (!this.enableRequestIds) {
      return `${operation}-${Date.now()}`;
    }

    return `${operation}-${++this.requestIdCounter}-${Date.now()}`;
  }

  /**
   * Finds all devices with retry logic
   */
  async findAll(): Promise<GoveeDevice[]> {
    const request: RetryableRequest<GoveeDevice[]> = {
      id: this.generateRequestId('findAll'),
      description: 'Fetch all Govee devices',
      execute: () => this.repository.findAll(),
      context: {
        operation: 'findAll',
        timestamp: new Date().toISOString(),
      },
    };

    return this.retryExecutor.execute(request);
  }

  /**
   * Finds device state with retry logic
   */
  async findState(deviceId: string, sku: string): Promise<DeviceState> {
    const request: RetryableRequest<DeviceState> = {
      id: this.generateRequestId('findState'),
      description: `Fetch state for device ${deviceId} (${sku})`,
      execute: () => this.repository.findState(deviceId, sku),
      context: {
        operation: 'findState',
        deviceId,
        sku,
        timestamp: new Date().toISOString(),
      },
    };

    return this.retryExecutor.execute(request);
  }

  /**
   * Sends command with retry logic
   */
  async sendCommand(deviceId: string, sku: string, command: Command): Promise<void> {
    const request: RetryableRequest<void> = {
      id: this.generateRequestId('sendCommand'),
      description: `Send ${command.toObject().name} command to device ${deviceId} (${sku})`,
      execute: () => this.repository.sendCommand(deviceId, sku, command),
      context: {
        operation: 'sendCommand',
        deviceId,
        sku,
        command: command.toObject(),
        timestamp: new Date().toISOString(),
      },
    };

    return this.retryExecutor.execute(request);
  }

  /**
   * Finds dynamic scenes with retry logic
   */
  async findDynamicScenes(deviceId: string, sku: string): Promise<LightScene[]> {
    const request: RetryableRequest<LightScene[]> = {
      id: this.generateRequestId('findDynamicScenes'),
      description: `Fetch dynamic scenes for device ${deviceId} (${sku})`,
      execute: () => this.repository.findDynamicScenes(deviceId, sku),
      context: {
        operation: 'findDynamicScenes',
        deviceId,
        sku,
        timestamp: new Date().toISOString(),
      },
    };

    return this.retryExecutor.execute(request);
  }

  /**
   * Gets detailed retry result for findAll operation
   */
  async findAllWithRetryResult(): Promise<RetryResult<GoveeDevice[]>> {
    const request: RetryableRequest<GoveeDevice[]> = {
      id: this.generateRequestId('findAll'),
      description: 'Fetch all Govee devices (with retry details)',
      execute: () => this.repository.findAll(),
      context: {
        operation: 'findAll',
        timestamp: new Date().toISOString(),
      },
    };

    return this.retryExecutor.executeWithResult(request);
  }

  /**
   * Gets detailed retry result for findState operation
   */
  async findStateWithRetryResult(deviceId: string, sku: string): Promise<RetryResult<DeviceState>> {
    const request: RetryableRequest<DeviceState> = {
      id: this.generateRequestId('findState'),
      description: `Fetch state for device ${deviceId} (${sku}) with retry details`,
      execute: () => this.repository.findState(deviceId, sku),
      context: {
        operation: 'findState',
        deviceId,
        sku,
        timestamp: new Date().toISOString(),
      },
    };

    return this.retryExecutor.executeWithResult(request);
  }

  /**
   * Gets detailed retry result for sendCommand operation
   */
  async sendCommandWithRetryResult(
    deviceId: string,
    sku: string,
    command: Command
  ): Promise<RetryResult<void>> {
    const request: RetryableRequest<void> = {
      id: this.generateRequestId('sendCommand'),
      description: `Send ${command.toObject().name} command to device ${deviceId} (${sku}) with retry details`,
      execute: () => this.repository.sendCommand(deviceId, sku, command),
      context: {
        operation: 'sendCommand',
        deviceId,
        sku,
        command: command.toObject(),
        timestamp: new Date().toISOString(),
      },
    };

    return this.retryExecutor.executeWithResult(request);
  }

  /**
   * Gets current retry metrics
   */
  getRetryMetrics() {
    return this.retryExecutor.getMetrics();
  }

  /**
   * Resets retry metrics
   */
  resetRetryMetrics(): void {
    this.retryExecutor.resetMetrics();
  }

  /**
   * Gets the underlying repository (for direct access when needed)
   */
  getUnderlyingRepository(): IGoveeDeviceRepository {
    return this.repository;
  }
}

/**
 * Import the RetryResult type for convenience
 */
export { RetryResult, RetryAttempt } from './RetryableRequest';

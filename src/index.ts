export type { CommandOptions } from './domain/repositories/CommandOptions.js';

// Main client
export { GoveeClient, type GoveeClientConfig } from './GoveeClient.js';

// Domain entities
export {
  GoveeDevice,
  DeviceState,
  Command,
  PowerOnCommand,
  PowerOffCommand,
  BrightnessCommand,
  ColorCommand,
  ColorTemperatureCommand,
  LightSceneCommand,
  SnapshotCommand,
  DiySceneCommand,
  SegmentColorRgbCommand,
  SegmentBrightnessCommand,
  MusicModeCommand,
  ToggleCommand,
  ModeCommand,
  CommandFactory,
  type PowerState,
  type ColorState,
  type ColorTemperatureState,
  type BrightnessState,
  type LightSceneState,
  type SegmentColorState,
  type SegmentBrightnessState,
  type MusicModeState,
  type ToggleState,
  type ModeState,
  type StateProperty,
} from './domain/entities/index.js';

// Value objects
export {
  ColorRgb,
  ColorTemperature,
  Brightness,
  LightScene,
  Snapshot,
  DiyScene,
  SegmentColor,
  MusicMode,
} from './domain/value-objects/index.js';

// Error classes
export {
  GoveeApiClientError,
  GoveeApiError,
  InvalidApiKeyError,
  RateLimitError,
  NetworkError,
  ValidationError,
} from './errors/index.js';

// Services and repositories (for advanced usage)
export { GoveeControlService, type GoveeControlServiceConfig } from './services/index.js';
export { GoveeDeviceRepository } from './infrastructure/index.js';
export { type IGoveeDeviceRepository } from './domain/repositories/index.js';

// Retry infrastructure (for custom retry policies)
export {
  RetryPolicy,
  type RetryPolicyConfig,
  type BackoffStrategy,
  type JitterConfig,
  type RetryCondition,
  type CircuitBreakerConfig,
  type RetryMetrics,
} from './infrastructure/retry/index.js';

// Validation schemas (for advanced usage)
export {
  GoveeDevicesResponseSchema,
  GoveeStateResponseSchema,
  GoveeCommandResponseSchema,
  GoveeDynamicScenesResponseSchema,
  type GoveeDevicesResponse,
  type GoveeStateResponse,
  type GoveeCommandResponse,
  type GoveeDynamicScenesResponse,
} from './infrastructure/response-schemas.js';

// Main client
export { GoveeClient, type GoveeClientConfig } from './GoveeClient';

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
  CommandFactory,
  type PowerState,
  type ColorState,
  type ColorTemperatureState,
  type BrightnessState,
  type StateProperty,
} from './domain/entities';

// Value objects
export { ColorRgb, ColorTemperature, Brightness } from './domain/value-objects';

// Error classes
export {
  GoveeApiClientError,
  GoveeApiError,
  InvalidApiKeyError,
  RateLimitError,
  NetworkError,
  ValidationError,
} from './errors';

// Services and repositories (for advanced usage)
export { GoveeControlService, type GoveeControlServiceConfig } from './services';
export { GoveeDeviceRepository } from './infrastructure';
export { type IGoveeDeviceRepository } from './domain/repositories';

// Retry infrastructure (for custom retry policies)
export {
  RetryPolicy,
  type RetryPolicyConfig,
  type BackoffStrategy,
  type JitterConfig,
  type RetryCondition,
  type CircuitBreakerConfig,
  type RetryMetrics,
} from './infrastructure/retry';

// Validation schemas (for advanced usage)
export {
  GoveeDevicesResponseSchema,
  GoveeStateResponseSchema,
  GoveeCommandResponseSchema,
  type GoveeDevicesResponse,
  type GoveeStateResponse,
  type GoveeCommandResponse,
} from './infrastructure/response-schemas';

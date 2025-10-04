# Govee API Client - Type Definitions

This document provides comprehensive type definitions for the Govee API Client library. All types are fully documented with TypeScript definitions.

## Table of Contents

- [Configuration Types](#configuration-types)
- [Domain Entity Types](#domain-entity-types)
- [Value Object Types](#value-object-types)
- [Command Types](#command-types)
- [State Types](#state-types)
- [Error Types](#error-types)
- [Validation Types](#validation-types)
- [Retry & Rate Limiting Types](#retry--rate-limiting-types)
- [Utility Types](#utility-types)

## Configuration Types

### GoveeClientConfig

Main configuration interface for initializing the GoveeClient.

```typescript
interface GoveeClientConfig {
  apiKey?: string; // Optional: Govee API key (uses GOVEE_API_KEY env var if not provided)
  timeout?: number; // Optional: Request timeout in milliseconds (default: 30000)
  rateLimit?: number; // Optional: Max requests per minute (default: 95)
  logger?: Logger; // Optional: Pino logger instance
  enableRetries?: boolean; // Optional: Enable retry logic (default: false)
  retryPolicy?: RetryPolicyType; // Optional: Retry policy configuration
}

type RetryPolicyType = 'development' | 'testing' | 'production' | 'custom' | RetryPolicy;
```

**API Key Resolution:**

- If `apiKey` is provided in config, it will be used
- Otherwise, the client reads from the `GOVEE_API_KEY` environment variable
- If neither is available, an error is thrown with a helpful message

**Example:**

```typescript
// Uses GOVEE_API_KEY environment variable
const client = new GoveeClient();

// Explicit API key (overrides environment variable)
const client = new GoveeClient({ apiKey: 'your-key-here' });
```

### GoveeControlServiceConfig

Configuration for the internal control service.

```typescript
interface GoveeControlServiceConfig {
  repository: IGoveeDeviceRepository;
  logger?: Logger;
  rateLimit?: number;
  enableRetries?: boolean;
  retryPolicy?: RetryPolicyType;
}
```

### GoveeDeviceRepositoryConfig

Configuration for the device repository.

```typescript
interface GoveeDeviceRepositoryConfig {
  apiKey: string;
  timeout?: number;
  logger?: Logger;
}
```

## Domain Entity Types

### GoveeDevice

Represents a Govee smart device.

```typescript
class GoveeDevice {
  readonly deviceId: string;
  readonly model: string; // Alias for sku (backward compatibility)
  readonly sku: string;
  readonly deviceName: string;
  readonly controllable: boolean;
  readonly retrievable: boolean;
  readonly supportedCmds: readonly string[];
  readonly capabilities: readonly GoveeCapability[];

  equals(other: GoveeDevice): boolean;
  supportsCommand(command: string): boolean;
  canControl(): boolean;
  canRetrieve(): boolean;
  toString(): string;
  toObject(): DeviceObject;
  static fromObject(obj: DeviceObject): GoveeDevice;
}

interface DeviceObject {
  deviceId: string;
  model: string;
  deviceName: string;
  controllable: boolean;
  retrievable: boolean;
  supportedCmds: string[];
}

interface GoveeCapability {
  type: string;
  instance: string;
  parameters?: {
    dataType: string;
    options?: Array<{
      name: string;
      value: unknown;
    }>;
  };
}
```

### DeviceState

Represents the current state of a device.

```typescript
class DeviceState {
  readonly deviceId: string;
  readonly model: string;
  readonly properties: readonly StateProperty[];

  getPowerState(): PowerState | undefined;
  getBrightness(): number | undefined; // 0-100
  getColor(): ColorState | undefined;
  getColorTemperature(): number | undefined; // Kelvin
  isOnline(): boolean;
  hasProperty(type: string, instance: string): boolean;
  getProperty(type: string, instance: string): StateProperty | undefined;
}

interface StateProperty {
  type: string;
  instance: string;
  value: unknown;
}

type PowerState = 'on' | 'off';
type ColorState = { r: number; g: number; b: number };
type ColorTemperatureState = number; // Kelvin
type BrightnessState = number; // 0-100
```

### Command Types

Base command class and specific command implementations.

```typescript
abstract class Command {
  abstract readonly name: string;
  abstract readonly value: unknown;
  abstract toApiFormat(): { name: string; value: unknown };
}

class PowerOnCommand extends Command {
  readonly name = 'turn';
  readonly value = 1;
  toApiFormat(): { name: string; value: number };
}

class PowerOffCommand extends Command {
  readonly name = 'turn';
  readonly value = 0;
  toApiFormat(): { name: string; value: number };
}

class BrightnessCommand extends Command {
  readonly name = 'brightness';
  readonly value: number;
  constructor(brightness: Brightness);
  toApiFormat(): { name: string; value: number };
}

class ColorCommand extends Command {
  readonly name = 'color';
  readonly value: { r: number; g: number; b: number };
  constructor(color: ColorRgb);
  toApiFormat(): { name: string; value: { r: number; g: number; b: number } };
}

class ColorTemperatureCommand extends Command {
  readonly name = 'colorTem';
  readonly value: number;
  constructor(colorTemperature: ColorTemperature);
  toApiFormat(): { name: string; value: number };
}
```

### CommandFactory

Static factory for creating commands.

```typescript
class CommandFactory {
  static powerOn(): PowerOnCommand;
  static powerOff(): PowerOffCommand;
  static brightness(brightness: Brightness): BrightnessCommand;
  static color(color: ColorRgb): ColorCommand;
  static colorTemperature(temp: ColorTemperature): ColorTemperatureCommand;
}
```

## Value Object Types

### ColorRgb

Represents RGB color values (0-255 per component).

```typescript
class ColorRgb {
  readonly r: number; // 0-255
  readonly g: number; // 0-255
  readonly b: number; // 0-255

  constructor(r: number, g: number, b: number);
  equals(other: ColorRgb): boolean;
  toString(): string; // "rgb(r, g, b)"
  toHex(): string; // "#rrggbb"
  toObject(): ColorRgbObject;

  static fromHex(hex: string): ColorRgb;
  static fromObject(obj: ColorRgbObject): ColorRgb;
}

interface ColorRgbObject {
  r: number;
  g: number;
  b: number;
}
```

### ColorTemperature

Represents color temperature in Kelvin (2000-9000K).

```typescript
class ColorTemperature {
  readonly kelvin: number; // 2000-9000

  constructor(kelvin: number);
  equals(other: ColorTemperature): boolean;
  toString(): string;
  isWarm(): boolean; // < 4000K
  isCool(): boolean; // > 5000K
  toObject(): ColorTemperatureObject;

  static warmWhite(): ColorTemperature; // 2700K
  static coolWhite(): ColorTemperature; // 6500K
  static daylight(): ColorTemperature; // 5600K
  static fromObject(obj: ColorTemperatureObject): ColorTemperature;
}

interface ColorTemperatureObject {
  kelvin: number;
}
```

### Brightness

Represents brightness level (0-100).

```typescript
class Brightness {
  readonly level: number; // 0-100

  constructor(level: number);
  equals(other: Brightness): boolean;
  toString(): string;
  asPercent(): number; // 0.0-1.0
  isDim(): boolean; // < 30
  isBright(): boolean; // > 70
  toObject(): BrightnessObject;

  static dim(): Brightness; // 25
  static medium(): Brightness; // 50
  static bright(): Brightness; // 75
  static fromObject(obj: BrightnessObject): Brightness;
}

interface BrightnessObject {
  level: number;
}
```

## Error Types

### Error Hierarchy

Complete error class hierarchy with TypeScript types.

```typescript
abstract class GoveeApiClientError extends Error {
  abstract readonly errorType: string;
  abstract isRetryable(): boolean;

  constructor(message: string);
}

class GoveeApiError extends GoveeApiClientError {
  readonly errorType = 'GoveeApiError';
  readonly statusCode?: number;
  readonly response?: unknown;

  constructor(message: string, statusCode?: number, response?: unknown);
  isRetryable(): boolean;
  isDeviceOffline(): boolean;
  getRecommendation(): string;
}

class InvalidApiKeyError extends GoveeApiClientError {
  readonly errorType = 'InvalidApiKeyError';

  constructor(message: string);
  isRetryable(): false;
  getRecommendation(): string;
}

class RateLimitError extends GoveeApiClientError {
  readonly errorType = 'RateLimitError';
  readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number);
  isRetryable(): true;
  getRetryAfterMs(): number;
}

class NetworkError extends GoveeApiClientError {
  readonly errorType = 'NetworkError';
  readonly cause?: Error;

  constructor(message: string, cause?: Error);
  isRetryable(): boolean;
}

class ValidationError extends GoveeApiClientError {
  readonly code = 'VALIDATION_ERROR';
  readonly zodError: ZodError;
  readonly rawData: unknown;

  constructor(message: string, zodError: ZodError, rawData: unknown);

  static fromZodError(zodError: ZodError, rawData: unknown): ValidationError;
  getValidationDetails(): Array<{ path: string; message: string; received: unknown }>;
  getValidationSummary(): string;
}
```

### Error Type Guards

TypeScript type guards for error handling.

```typescript
function isGoveeApiError(error: unknown): error is GoveeApiError;
function isInvalidApiKeyError(error: unknown): error is InvalidApiKeyError;
function isRateLimitError(error: unknown): error is RateLimitError;
function isNetworkError(error: unknown): error is NetworkError;
function isValidationError(error: unknown): error is ValidationError;
```

## Validation Types

### Zod Schemas

Exported Zod schemas for runtime API response validation.

```typescript
import { z } from 'zod';

// Device capability schema
const GoveeCapabilitySchema: z.ZodType;

// Individual device response schema
const GoveeDeviceResponseSchema: z.ZodType;

// Full devices API response schema
const GoveeDevicesResponseSchema: z.ZodObject<{
  code: z.ZodNumber;
  message: z.ZodString;
  data: z.ZodArray<typeof GoveeDeviceResponseSchema>;
}>;

// Device state capability schema
const GoveeStateCapabilitySchema: z.ZodObject<{
  type: z.ZodString;
  instance: z.ZodString;
  state: z.ZodObject<{ value: z.ZodUnknown }>;
}>;

// Device state API response schema
const GoveeStateResponseSchema: z.ZodObject<{
  code: z.ZodNumber;
  message: z.ZodString;
  data: z.ZodObject<{
    device: z.ZodString;
    sku: z.ZodString;
    capabilities: z.ZodArray<typeof GoveeStateCapabilitySchema>;
  }>;
}>;

// Command API response schema
const GoveeCommandResponseSchema: z.ZodObject<{
  code: z.ZodNumber;
  message: z.ZodString;
  data: z.ZodOptional<z.ZodUnknown>;
}>;
```

### Response Types

TypeScript types inferred from Zod schemas.

```typescript
// Type inferred from GoveeDevicesResponseSchema
type GoveeDevicesResponse = {
  code: number;
  message: string;
  data: Array<{
    device?: string | null;
    sku?: string | null;
    deviceName?: string | null;
    capabilities?: Array<{
      type?: string | null;
      instance?: string | null;
      parameters?: {
        dataType: string;
        options?: Array<{
          name: string;
          value: unknown;
        }>;
      };
    }> | null;
  }>;
};

// Type inferred from GoveeStateResponseSchema
type GoveeStateResponse = {
  code: number;
  message: string;
  data: {
    device: string;
    sku: string;
    capabilities: Array<{
      type: string;
      instance: string;
      state: {
        value: unknown;
      };
    }>;
  };
};

// Type inferred from GoveeCommandResponseSchema
type GoveeCommandResponse = {
  code: number;
  message: string;
  data?: unknown;
};
```

### Using Validation Schemas

Examples of using exported schemas for custom validation:

```typescript
import {
  GoveeDevicesResponseSchema,
  GoveeStateResponseSchema,
  type GoveeDevicesResponse,
} from '@felixgeelhaar/govee-api-client';

// Validate unknown data
function validateDevicesResponse(data: unknown): GoveeDevicesResponse {
  return GoveeDevicesResponseSchema.parse(data); // Throws on invalid data
}

// Safe validation without throwing
function safeValidate(data: unknown) {
  const result = GoveeDevicesResponseSchema.safeParse(data);

  if (result.success) {
    const validData: GoveeDevicesResponse = result.data;
    return validData;
  } else {
    console.error('Validation failed:', result.error);
    return null;
  }
}

// Custom schema composition
import { z } from 'zod';

const ExtendedDeviceSchema = GoveeDevicesResponseSchema.extend({
  metadata: z.object({
    fetchedAt: z.date(),
    cacheKey: z.string(),
  }),
});
```

### ValidationError Details

Structure of validation error details returned by `getValidationDetails()`:

```typescript
interface ValidationDetail {
  path: string; // JSON path to the field that failed (e.g., "data.0.deviceName")
  message: string; // Human-readable error message
  received: unknown; // The actual value that failed validation
}

// Example usage
try {
  await client.getDevices();
} catch (error) {
  if (error instanceof ValidationError) {
    const details: ValidationDetail[] = error.getValidationDetails();

    details.forEach(({ path, message, received }) => {
      console.log(`Field "${path}" is invalid`);
      console.log(`Error: ${message}`);
      console.log(`Got: ${JSON.stringify(received)}`);
    });
  }
}
```

## Retry & Rate Limiting Types

### RetryPolicy

Configuration for retry behavior.

```typescript
class RetryPolicy {
  constructor(config: RetryPolicyConfig);
}

interface RetryPolicyConfig {
  backoff: BackoffStrategy;
  jitter: JitterConfig;
  condition: RetryCondition;
  circuitBreaker: CircuitBreakerConfig;
  enableMetrics: boolean;
}

interface BackoffStrategy {
  type: 'exponential' | 'linear' | 'constant';
  initialDelayMs: number;
  maxDelayMs: number;
  multiplier?: number; // For exponential backoff
  increment?: number; // For linear backoff
}

interface JitterConfig {
  type: 'none' | 'full' | 'equal' | 'decorrelated';
  factor?: number; // 0.0-1.0, randomization factor
}

interface RetryCondition {
  maxAttempts: number;
  maxTotalTimeMs: number;
  retryableStatusCodes: number[];
  retryableErrorTypes: (new (...args: any[]) => Error)[];
}

interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number; // Failures before opening
  recoveryTimeoutMs: number; // Time before trying half-open
  halfOpenSuccessThreshold: number; // Successes needed to close
}
```

### RetryMetrics

Metrics for monitoring retry behavior.

```typescript
interface RetryMetrics {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  totalRetryTimeMs: number;
  averageRetryDelayMs: number;
  circuitBreakerState: CircuitBreakerState;
  lastError?: Error;
  lastRetryTimestamp?: Date;
}

type CircuitBreakerState = 'closed' | 'open' | 'half-open';
```

### Rate Limiter Types

Types for rate limiting functionality.

```typescript
interface RateLimiterStats {
  currentRequests: number;
  maxRequests: number;
  utilizationPercent: number;
  queueSize: number;
  canExecuteImmediately: boolean;
  nextAvailableSlot: Date | null;
}

interface ServiceStats {
  rateLimiter: RateLimiterStats;
  retries?: RetryMetrics;
  configuration: ServiceConfiguration;
}

interface ServiceConfiguration {
  rateLimit: number;
  timeout: number;
  retriesEnabled: boolean;
  retryPolicy?: string;
}
```

## Repository Types

### IGoveeDeviceRepository

Interface for device repository implementations.

```typescript
interface IGoveeDeviceRepository {
  findAll(): Promise<GoveeDevice[]>;
  findState(deviceId: string, model: string): Promise<DeviceState>;
  sendCommand(deviceId: string, model: string, command: Command): Promise<void>;
}
```

### API Response Types

Internal types for API responses (used by repository).

```typescript
interface DevicesResponse {
  code: number;
  message: string;
  data: {
    devices: DeviceData[];
  };
}

interface DeviceData {
  device: string; // deviceId
  sku: string; // model
  deviceName: string;
  capabilities: GoveeCapability[];
}

interface StateResponse {
  code: number;
  message: string;
  data: {
    device: string;
    sku: string;
    capabilities: StateCapability[];
  };
}

interface StateCapability {
  type: string;
  instance: string;
  state: {
    value: unknown;
  };
}

interface CommandResponse {
  code: number;
  message: string;
  data: Record<string, unknown>;
}

interface ApiErrorResponse {
  code: number;
  message: string;
  data?: unknown;
}
```

## Utility Types

### Generic Utility Types

Helpful TypeScript utility types.

```typescript
// Extract device ID type
type DeviceId = GoveeDevice['deviceId'];

// Extract model type
type DeviceModel = GoveeDevice['model'];

// Extract supported command types
type SupportedCommand = GoveeDevice['supportedCmds'][number];

// Extract power state union
type PowerState = ReturnType<DeviceState['getPowerState']>;

// Extract color object type
type ColorObject = NonNullable<ReturnType<DeviceState['getColor']>>;

// Configuration with required API key
type RequiredApiKeyConfig = Required<Pick<GoveeClientConfig, 'apiKey'>> &
  Partial<Omit<GoveeClientConfig, 'apiKey'>>;

// Partial device for updates
type PartialDevice = Partial<Pick<GoveeDevice, 'deviceName' | 'controllable' | 'retrievable'>>;

// Command name union type
type CommandName = Command['name'];

// Command value type
type CommandValue = Command['value'];
```

### Async Return Types

Types for async method return values.

```typescript
// Device list operations
type DeviceListResult = Promise<GoveeDevice[]>;
type DeviceSearchResult = Promise<GoveeDevice | undefined>;
type DeviceFilterResult = Promise<GoveeDevice[]>;

// Device control operations
type ControlResult = Promise<void>;
type StateResult = Promise<DeviceState>;
type StatusResult = Promise<boolean>;

// Monitoring operations
type StatsResult = RateLimiterStats;
type MetricsResult = RetryMetrics | undefined;
type ServiceStatsResult = ServiceStats;
```

### Event Types

Types for potential event handling (future extension).

```typescript
interface DeviceEvent {
  type: 'state-changed' | 'offline' | 'online' | 'error';
  deviceId: string;
  model: string;
  timestamp: Date;
  data?: unknown;
}

interface RateLimitEvent {
  type: 'limit-reached' | 'limit-warning' | 'queue-full';
  timestamp: Date;
  stats: RateLimiterStats;
}

interface RetryEvent {
  type: 'retry-attempt' | 'retry-success' | 'retry-failure' | 'circuit-breaker';
  timestamp: Date;
  attempt: number;
  delay: number;
  error?: Error;
}
```

### Type Predicates

Type guard functions for runtime type checking.

```typescript
// Device type guards
function isGoveeDevice(obj: unknown): obj is GoveeDevice;
function isDeviceState(obj: unknown): obj is DeviceState;
function isCommand(obj: unknown): obj is Command;

// Value object type guards
function isColorRgb(obj: unknown): obj is ColorRgb;
function isColorTemperature(obj: unknown): obj is ColorTemperature;
function isBrightness(obj: unknown): obj is Brightness;

// Configuration type guards
function isValidClientConfig(obj: unknown): obj is GoveeClientConfig;
function isValidRetryPolicy(obj: unknown): obj is RetryPolicy;

// State property type guards
function isPowerProperty(prop: StateProperty): prop is StateProperty & { value: 0 | 1 };
function isBrightnessProperty(prop: StateProperty): prop is StateProperty & { value: number };
function isColorProperty(prop: StateProperty): prop is StateProperty & { value: ColorState };
```

### Branded Types

Branded types for additional type safety.

```typescript
// Branded string types for IDs
type DeviceId = string & { readonly __brand: 'DeviceId' };
type ModelId = string & { readonly __brand: 'ModelId' };
type ApiKey = string & { readonly __brand: 'ApiKey' };

// Branded number types for values
type KelvinValue = number & { readonly __brand: 'Kelvin' };
type BrightnessValue = number & { readonly __brand: 'Brightness' };
type RgbValue = number & { readonly __brand: 'RgbComponent' };

// Type constructors
function createDeviceId(id: string): DeviceId;
function createModelId(model: string): ModelId;
function createApiKey(key: string): ApiKey;
function createKelvinValue(kelvin: number): KelvinValue;
function createBrightnessValue(brightness: number): BrightnessValue;
function createRgbValue(rgb: number): RgbValue;
```

### Template Literal Types

Template literal types for command names and property types.

```typescript
// Command name templates
type PowerCommand = `turn_${string}`;
type ColorCommand = `color_${string}`;
type BrightnessCommand = `brightness_${string}`;

// Property type templates
type OnOffProperty = `devices.capabilities.on_off.${string}`;
type RangeProperty = `devices.capabilities.range.${string}`;
type ColorProperty = `devices.capabilities.color_setting.${string}`;

// Instance name templates
type PowerInstance = 'powerSwitch';
type BrightnessInstance = 'brightness';
type ColorRgbInstance = 'colorRgb';
type ColorTemperatureInstance = 'colorTemperatureK';
```

### Conditional Types

Conditional types for advanced type manipulation.

```typescript
// Extract command type based on name
type CommandByName<T extends string> = T extends 'turn'
  ? PowerOnCommand | PowerOffCommand
  : T extends 'brightness'
    ? BrightnessCommand
    : T extends 'color'
      ? ColorCommand
      : T extends 'colorTem'
        ? ColorTemperatureCommand
        : never;

// Extract value type based on command
type ValueByCommand<T extends Command> = T extends PowerOnCommand | PowerOffCommand
  ? number
  : T extends BrightnessCommand
    ? number
    : T extends ColorCommand
      ? ColorState
      : T extends ColorTemperatureCommand
        ? number
        : never;

// Device with specific capabilities
type DeviceWithCapability<T extends string> = GoveeDevice & {
  supportedCmds: readonly T[];
};

// Controllable device
type ControllableDevice = DeviceWithCapability<'turn'>;

// Color-capable device
type ColorDevice = DeviceWithCapability<'color'>;
```

### Mapped Types

Mapped types for transforming interfaces.

```typescript
// Optional device properties
type OptionalDevice = {
  [K in keyof GoveeDevice]?: GoveeDevice[K];
};

// Required configuration
type RequiredConfig = {
  [K in keyof GoveeClientConfig]-?: GoveeClientConfig[K];
};

// Serializable versions (without methods)
type SerializableDevice = Pick<
  GoveeDevice,
  'deviceId' | 'model' | 'deviceName' | 'controllable' | 'retrievable' | 'supportedCmds'
>;

type SerializableState = Pick<DeviceState, 'deviceId' | 'model'> & {
  properties: StateProperty[];
  powerState?: PowerState;
  brightness?: number;
  color?: ColorState;
  colorTemperature?: number;
  online: boolean;
};
```

## Type Validation

### Runtime Type Validation with Zod

Schema definitions for runtime validation.

```typescript
import { z } from 'zod';

// Configuration schemas
const GoveeClientConfigSchema = z.object({
  apiKey: z.string().min(1),
  timeout: z.number().int().positive().optional(),
  rateLimit: z.number().int().positive().optional(),
  logger: z.any().optional(),
  enableRetries: z.boolean().optional(),
  retryPolicy: z
    .union([
      z.literal('development'),
      z.literal('testing'),
      z.literal('production'),
      z.literal('custom'),
      z.any(), // RetryPolicy instance
    ])
    .optional(),
});

// Value object schemas
const ColorRgbSchema = z.object({
  r: z.number().int().min(0).max(255),
  g: z.number().int().min(0).max(255),
  b: z.number().int().min(0).max(255),
});

const ColorTemperatureSchema = z.object({
  kelvin: z.number().int().min(2000).max(9000),
});

const BrightnessSchema = z.object({
  level: z.number().int().min(0).max(100),
});

// Device schemas
const GoveeDeviceSchema = z.object({
  deviceId: z.string().min(1),
  model: z.string().min(1),
  deviceName: z.string().min(1),
  controllable: z.boolean(),
  retrievable: z.boolean(),
  supportedCmds: z.array(z.string()),
});

// API response schemas
const ApiErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});

// Type extraction from schemas
type ValidatedClientConfig = z.infer<typeof GoveeClientConfigSchema>;
type ValidatedColorRgb = z.infer<typeof ColorRgbSchema>;
type ValidatedDevice = z.infer<typeof GoveeDeviceSchema>;
```

This comprehensive type reference provides LLMs with complete type information for generating accurate, type-safe code when working with the Govee API Client library.

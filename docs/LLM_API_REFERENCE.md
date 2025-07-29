# Govee API Client - LLM Reference

## Overview

The Govee API Client is an enterprise-grade TypeScript library for controlling Govee smart devices. It follows Domain-Driven Design (DDD) principles with comprehensive error handling, rate limiting, and retry capabilities.

**Package**: `@felixgeelhaar/govee-api-client`  
**Version**: 2.0.0  
**License**: MIT

## Quick Start

```typescript
import { GoveeClient, ColorRgb, Brightness } from '@felixgeelhaar/govee-api-client';

const client = new GoveeClient({ apiKey: 'your-api-key' });
const devices = await client.getDevices();
await client.setColor(deviceId, model, new ColorRgb(255, 0, 0));
```

## Core Classes

### GoveeClient

Main entry point for the library.

```typescript
class GoveeClient {
  constructor(config: GoveeClientConfig);

  // Device Management
  getDevices(): Promise<GoveeDevice[]>;
  getDeviceState(deviceId: string, model: string): Promise<DeviceState>;
  getControllableDevices(): Promise<GoveeDevice[]>;
  getRetrievableDevices(): Promise<GoveeDevice[]>;
  findDeviceByName(deviceName: string): Promise<GoveeDevice | undefined>;
  findDevicesByModel(model: string): Promise<GoveeDevice[]>;

  // Device Control
  sendCommand(deviceId: string, model: string, command: Command): Promise<void>;
  turnOn(deviceId: string, model: string): Promise<void>;
  turnOff(deviceId: string, model: string): Promise<void>;
  setBrightness(deviceId: string, model: string, brightness: Brightness): Promise<void>;
  setColor(deviceId: string, model: string, color: ColorRgb): Promise<void>;
  setColorTemperature(
    deviceId: string,
    model: string,
    colorTemperature: ColorTemperature
  ): Promise<void>;

  // Convenience Methods
  turnOnWithBrightness(deviceId: string, model: string, brightness: Brightness): Promise<void>;
  turnOnWithColor(
    deviceId: string,
    model: string,
    color: ColorRgb,
    brightness?: Brightness
  ): Promise<void>;
  turnOnWithColorTemperature(
    deviceId: string,
    model: string,
    colorTemperature: ColorTemperature,
    brightness?: Brightness
  ): Promise<void>;

  // Status Checks
  isDeviceOnline(deviceId: string, model: string): Promise<boolean>;
  isDevicePoweredOn(deviceId: string, model: string): Promise<boolean>;

  // Monitoring
  getRateLimiterStats(): RateLimiterStats;
  getRetryMetrics(): RetryMetrics | undefined;
  getServiceStats(): ServiceStats;
  resetRetryMetrics(): void;
  isRetryEnabled(): boolean;
}
```

### Configuration

```typescript
interface GoveeClientConfig {
  apiKey: string; // Required: Your Govee API key
  timeout?: number; // Optional: Request timeout in ms (default: 30000)
  rateLimit?: number; // Optional: Requests per minute (default: 95)
  logger?: Logger; // Optional: Pino logger instance
  enableRetries?: boolean; // Optional: Enable retry logic (default: false)
  retryPolicy?: 'development' | 'testing' | 'production' | 'custom' | RetryPolicy;
}
```

## Domain Entities

### GoveeDevice

Represents a Govee smart device.

```typescript
class GoveeDevice {
  readonly deviceId: string; // Unique device identifier
  readonly model: string; // Device model/SKU
  readonly sku: string; // Device SKU (same as model)
  readonly deviceName: string; // Human-readable device name
  readonly controllable: boolean; // Can the device be controlled
  readonly retrievable: boolean; // Can device state be retrieved
  readonly supportedCmds: readonly string[]; // Supported command types
  readonly capabilities: readonly GoveeCapability[]; // Device capabilities

  equals(other: GoveeDevice): boolean;
  supportsCommand(command: string): boolean;
  canControl(): boolean;
  canRetrieve(): boolean;
  toObject(): DeviceObject;
  static fromObject(obj: DeviceObject): GoveeDevice;
}
```

### DeviceState

Represents the current state of a device.

```typescript
class DeviceState {
  readonly deviceId: string;
  readonly model: string;
  readonly properties: readonly StateProperty[];

  getPowerState(): 'on' | 'off' | undefined;
  getBrightness(): number | undefined; // 0-100
  getColor(): { r: number; g: number; b: number } | undefined;
  getColorTemperature(): number | undefined; // Kelvin
  isOnline(): boolean;
  hasProperty(type: string, instance: string): boolean;
  getProperty(type: string, instance: string): StateProperty | undefined;
}
```

### Command

Base class for device commands.

```typescript
abstract class Command {
  abstract readonly name: string
  abstract readonly value: unknown
  abstract toApiFormat(): { name: string; value: unknown }
}

// Command types:
class PowerOnCommand extends Command
class PowerOffCommand extends Command
class BrightnessCommand extends Command
class ColorCommand extends Command
class ColorTemperatureCommand extends Command

// Command factory:
class CommandFactory {
  static powerOn(): PowerOnCommand
  static powerOff(): PowerOffCommand
  static brightness(brightness: Brightness): BrightnessCommand
  static color(color: ColorRgb): ColorCommand
  static colorTemperature(temp: ColorTemperature): ColorTemperatureCommand
}
```

## Value Objects

### ColorRgb

Represents RGB color values (0-255 for each component).

```typescript
class ColorRgb {
  constructor(r: number, g: number, b: number);

  readonly r: number; // Red component (0-255)
  readonly g: number; // Green component (0-255)
  readonly b: number; // Blue component (0-255)

  equals(other: ColorRgb): boolean;
  toString(): string; // "rgb(r, g, b)"
  toHex(): string; // "#rrggbb"
  toObject(): { r: number; g: number; b: number };

  static fromHex(hex: string): ColorRgb;
  static fromObject(obj: { r: number; g: number; b: number }): ColorRgb;
}
```

### ColorTemperature

Represents color temperature in Kelvin (2000-9000K).

```typescript
class ColorTemperature {
  constructor(kelvin: number);

  readonly kelvin: number; // Temperature in Kelvin (2000-9000)

  equals(other: ColorTemperature): boolean;
  toString(): string;
  isWarm(): boolean; // < 4000K
  isCool(): boolean; // > 5000K
  toObject(): { kelvin: number };

  static warmWhite(): ColorTemperature; // 2700K
  static coolWhite(): ColorTemperature; // 6500K
  static daylight(): ColorTemperature; // 5600K
  static fromObject(obj: { kelvin: number }): ColorTemperature;
}
```

### Brightness

Represents brightness level (0-100).

```typescript
class Brightness {
  constructor(level: number);

  readonly level: number; // Brightness level (0-100)

  equals(other: Brightness): boolean;
  toString(): string;
  asPercent(): number; // 0.0-1.0
  isDim(): boolean; // < 30
  isBright(): boolean; // > 70
  toObject(): { level: number };

  static dim(): Brightness; // 25
  static medium(): Brightness; // 50
  static bright(): Brightness; // 75
  static fromObject(obj: { level: number }): Brightness;
}
```

## Error Handling

### Error Hierarchy

```typescript
// Base error class
abstract class GoveeApiClientError extends Error {
  abstract readonly errorType: string;
  abstract isRetryable(): boolean;
}

// API-related errors
class GoveeApiError extends GoveeApiClientError {
  constructor(message: string, statusCode?: number, response?: unknown);
  readonly statusCode?: number;
  readonly response?: unknown;
  isDeviceOffline(): boolean;
  getRecommendation(): string;
}

// Authentication errors
class InvalidApiKeyError extends GoveeApiClientError {
  getRecommendation(): string;
}

// Rate limiting errors
class RateLimitError extends GoveeApiClientError {
  constructor(message: string, retryAfterMs?: number);
  readonly retryAfterMs?: number;
  getRetryAfterMs(): number;
}

// Network errors
class NetworkError extends GoveeApiClientError {
  constructor(message: string, cause?: Error);
  readonly cause?: Error;
}

// Validation errors
class ValidationError extends GoveeApiClientError {
  constructor(message: string, field?: string, value?: unknown);
  readonly field?: string;
  readonly value?: unknown;
}
```

## Rate Limiting & Retry

### Rate Limiting

Built-in sliding window rate limiter (default: 95 requests/minute).

```typescript
interface RateLimiterStats {
  currentRequests: number;
  maxRequests: number;
  utilizationPercent: number;
  queueSize: number;
  canExecuteImmediately: boolean;
  nextAvailableSlot: Date | null;
}
```

### Retry Logic

Configurable retry policies with exponential backoff, jitter, and circuit breaker.

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

// Presets: 'development', 'testing', 'production'
```

### Metrics

```typescript
interface RetryMetrics {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  totalRetryTimeMs: number;
  averageRetryDelayMs: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  lastError?: Error;
  lastRetryTimestamp?: Date;
}

interface ServiceStats {
  rateLimiter: RateLimiterStats;
  retries?: RetryMetrics;
  configuration: {
    rateLimit: number;
    timeout: number;
    retriesEnabled: boolean;
    retryPolicy?: string;
  };
}
```

## Usage Patterns

### Basic Usage

```typescript
const client = new GoveeClient({ apiKey: 'your-key' });

// Get devices
const devices = await client.getDevices();
const controllableDevices = await client.getControllableDevices();

// Find specific device
const livingRoom = await client.findDeviceByName('Living Room');

// Control device
if (livingRoom) {
  await client.turnOn(livingRoom.deviceId, livingRoom.model);
  await client.setBrightness(livingRoom.deviceId, livingRoom.model, new Brightness(75));
  await client.setColor(livingRoom.deviceId, livingRoom.model, new ColorRgb(255, 0, 0));
}
```

### Error Handling

```typescript
try {
  await client.turnOn(deviceId, model);
} catch (error) {
  if (error instanceof InvalidApiKeyError) {
    console.log('Invalid API key:', error.getRecommendation());
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited, retry after: ${error.getRetryAfterMs()}ms`);
  } else if (error instanceof GoveeApiError) {
    if (error.isDeviceOffline()) {
      console.log('Device is offline');
    }
  }
}
```

### Advanced Configuration

```typescript
import pino from 'pino';

const client = new GoveeClient({
  apiKey: 'your-key',
  timeout: 30000,
  rateLimit: 90,
  logger: pino({ level: 'info' }),
  enableRetries: true,
  retryPolicy: 'production',
});

// Monitor performance
const stats = client.getServiceStats();
console.log('Rate limiter utilization:', stats.rateLimiter.utilizationPercent);
```

## TypeScript Support

The library provides full TypeScript support with:

- Complete type definitions for all classes and interfaces
- Generic type parameters where appropriate
- Strict null checks compatibility
- Comprehensive JSDoc documentation
- Type-safe error handling

## Dependencies

- **axios**: HTTP client
- **pino**: Logging (optional)
- **zod**: Runtime type validation

## Node.js Compatibility

- **Minimum version**: Node.js 18.0.0
- **ESM/CommonJS**: Supports both module systems
- **TypeScript**: 5.8.3+ recommended

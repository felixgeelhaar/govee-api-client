# Govee API TypeScript Client

[![npm version](https://badge.fury.io/js/%40felixgeelhaar%2Fgovee-api-client.svg)](https://badge.fury.io/js/%40felixgeelhaar%2Fgovee-api-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/felixgeelhaar/govee-api-client/workflows/CI/badge.svg)](https://github.com/felixgeelhaar/govee-api-client/actions)
[![codecov](https://codecov.io/gh/felixgeelhaar/govee-api-client/branch/main/graph/badge.svg)](https://codecov.io/gh/felixgeelhaar/govee-api-client)

An enterprise-grade TypeScript client library for the Govee Developer REST API. Built with Domain-Driven Design (DDD) principles, comprehensive error handling, and production-ready rate limiting and retry capabilities.

## Features

- 🎯 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🏗️ **Domain-Driven Design**: Clean architecture following DDD principles
- ⚡ **Rate Limiting**: High-performance sliding window rate limiter with burst capability
- 🔄 **Retry Logic**: Enterprise-grade retry with exponential backoff, jitter, and circuit breaker
- 🛡️ **Error Handling**: Comprehensive error hierarchy with specific error types
- 📊 **Observability**: Built-in metrics and monitoring for rate limiting and retries
- 📝 **Logging**: Configurable logging with Pino integration
- 🧪 **Well Tested**: >95% test coverage with unit and integration tests
- 🚀 **Production Ready**: Enterprise-grade reliability and performance

## Installation

```bash
npm install @felixgeelhaar/govee-api-client
```

## Quick Start

```typescript
import {
  GoveeClient,
  Brightness,
  ColorRgb,
  ColorTemperature,
} from '@felixgeelhaar/govee-api-client';

// Initialize the client
const client = new GoveeClient({
  apiKey: 'your-govee-api-key',
});

// Get all devices
const devices = await client.getDevices();
console.log(`Found ${devices.length} devices`);

// Find a specific device
const livingRoomLight = await client.findDeviceByName('Living Room');

if (livingRoomLight) {
  // Turn on the light with warm white and 75% brightness
  await client.turnOnWithColorTemperature(
    livingRoomLight.deviceId,
    livingRoomLight.model,
    ColorTemperature.warmWhite(),
    new Brightness(75)
  );
}
```

## Configuration

```typescript
import pino from 'pino';
import { GoveeClient, RetryPolicy } from '@felixgeelhaar/govee-api-client';

const client = new GoveeClient({
  apiKey: 'your-govee-api-key',
  timeout: 30000, // Request timeout in milliseconds (default: 30000)
  rateLimit: 95, // Requests per minute (default: 95, with 5 buffer under Govee's limit)
  logger: pino({ level: 'info' }), // Optional logger (silent by default)
  enableRetries: true, // Enable retry functionality (default: false)
  retryPolicy: 'production', // Retry policy preset or custom RetryPolicy instance
});
```

## API Reference

### Device Management

```typescript
// Get all devices
const devices = await client.getDevices();

// Get only controllable devices
const controllableDevices = await client.getControllableDevices();

// Find device by name (case-insensitive)
const device = await client.findDeviceByName('bedroom');

// Find devices by model
const devices = await client.findDevicesByModel('H6159');

// Get device state
const state = await client.getDeviceState(deviceId, model);
console.log(`Power: ${state.getPowerState()}`);
console.log(`Online: ${state.isOnline()}`);
```

### Device Control

```typescript
// Basic controls
await client.turnOn(deviceId, model);
await client.turnOff(deviceId, model);
await client.setBrightness(deviceId, model, new Brightness(75));

// Color control
const red = new ColorRgb(255, 0, 0);
await client.setColor(deviceId, model, red);

const coolWhite = new ColorTemperature(6500);
await client.setColorTemperature(deviceId, model, coolWhite);

// Convenience methods
await client.turnOnWithBrightness(deviceId, model, new Brightness(50));
await client.turnOnWithColor(deviceId, model, red, new Brightness(75));
await client.turnOnWithColorTemperature(deviceId, model, coolWhite, new Brightness(100));
```

### Value Objects

#### ColorRgb

```typescript
// Create RGB colors
const red = new ColorRgb(255, 0, 0);
const blue = ColorRgb.fromHex('#0000FF');
const green = ColorRgb.fromObject({ r: 0, g: 255, b: 0 });

console.log(red.toHex()); // "#ff0000"
console.log(blue.toString()); // "rgb(0, 0, 255)"
```

#### ColorTemperature

```typescript
// Create color temperatures
const warm = ColorTemperature.warmWhite(); // 2700K
const cool = ColorTemperature.coolWhite(); // 6500K
const daylight = ColorTemperature.daylight(); // 5600K
const custom = new ColorTemperature(4000);

console.log(warm.isWarm()); // true
console.log(cool.isCool()); // true
```

#### Brightness

```typescript
// Create brightness levels
const dim = Brightness.dim(); // 25%
const medium = Brightness.medium(); // 50%
const bright = Brightness.bright(); // 75%
const custom = new Brightness(85);

console.log(bright.asPercent()); // 0.75
console.log(custom.isDim()); // false
```

## Error Handling

The library provides a comprehensive error hierarchy for different types of failures:

```typescript
import {
  GoveeApiError,
  InvalidApiKeyError,
  RateLimitError,
  NetworkError,
} from '@felixgeelhaar/govee-api-client';

try {
  await client.getDevices();
} catch (error) {
  if (error instanceof InvalidApiKeyError) {
    console.log('API key is invalid or expired');
    console.log(error.getRecommendation());
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after: ${error.getRetryAfterMs()}ms`);
  } else if (error instanceof GoveeApiError) {
    console.log(`API Error: ${error.message}`);
    if (error.isDeviceOffline()) {
      console.log('Device is currently offline');
    }
  } else if (error instanceof NetworkError) {
    console.log(`Network error: ${error.errorType}`);
    if (error.isRetryable()) {
      console.log('This error can be retried');
    }
  }
}
```

## Rate Limiting & Retry Features

The client includes enterprise-grade rate limiting and retry capabilities designed for production environments.

### Rate Limiting

Uses a high-performance sliding window rate limiter that allows bursts up to the limit while maintaining the average rate over time:

```typescript
const client = new GoveeClient({
  apiKey: 'your-api-key',
  rateLimit: 95, // Default: 95 req/min (5 request buffer under Govee's 100/min limit)
});

// Monitor rate limiter performance
const stats = client.getRateLimiterStats();
console.log(`Current utilization: ${stats.utilizationPercent}%`);
console.log(`Queue size: ${stats.queueSize}`);
console.log(`Can execute immediately: ${stats.canExecuteImmediately}`);
```

### Retry Logic

Comprehensive retry functionality with exponential backoff, jitter, and circuit breaker:

```typescript
const client = new GoveeClient({
  apiKey: 'your-api-key',
  enableRetries: true,
  retryPolicy: 'production', // 'development', 'testing', 'production'
});

// Monitor retry performance
const retryMetrics = client.getRetryMetrics();
if (retryMetrics) {
  console.log(`Total retry attempts: ${retryMetrics.totalAttempts}`);
  console.log(`Success rate: ${retryMetrics.successfulRetries}/${retryMetrics.totalAttempts}`);
  console.log(`Circuit breaker state: ${retryMetrics.circuitBreakerState}`);
}
```

### Custom Retry Policies

Create custom retry policies for specific requirements:

```typescript
import {
  GoveeClient,
  RetryPolicy,
  RateLimitError,
  NetworkError,
  GoveeApiError,
} from '@felixgeelhaar/govee-api-client';

const customRetryPolicy = new RetryPolicy({
  backoff: {
    type: 'exponential',
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    multiplier: 2.0,
  },
  jitter: {
    type: 'equal',
    factor: 0.1,
  },
  condition: {
    maxAttempts: 3,
    maxTotalTimeMs: 60000,
    retryableStatusCodes: [408, 429, 502, 503, 504],
    retryableErrorTypes: [RateLimitError, NetworkError, GoveeApiError],
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    recoveryTimeoutMs: 30000,
    halfOpenSuccessThreshold: 2,
  },
  enableMetrics: true,
});

const client = new GoveeClient({
  apiKey: 'your-api-key',
  enableRetries: true,
  retryPolicy: customRetryPolicy,
});
```

### Monitoring & Observability

Get comprehensive metrics for monitoring and debugging:

```typescript
// Get complete service statistics
const serviceStats = client.getServiceStats();
console.log('Rate Limiter:', serviceStats.rateLimiter);
console.log('Retry Metrics:', serviceStats.retries);
console.log('Configuration:', serviceStats.configuration);

// Rate limiter specific stats
const rateLimiterStats = client.getRateLimiterStats();
console.log({
  currentRequests: rateLimiterStats.currentRequests,
  maxRequests: rateLimiterStats.maxRequests,
  utilizationPercent: rateLimiterStats.utilizationPercent,
  queueSize: rateLimiterStats.queueSize,
  canExecuteImmediately: rateLimiterStats.canExecuteImmediately,
  nextAvailableSlot: rateLimiterStats.nextAvailableSlot,
});

// Retry metrics (when retries are enabled)
const retryMetrics = client.getRetryMetrics();
if (retryMetrics) {
  console.log({
    totalAttempts: retryMetrics.totalAttempts,
    successfulRetries: retryMetrics.successfulRetries,
    failedRetries: retryMetrics.failedRetries,
    totalRetryTimeMs: retryMetrics.totalRetryTimeMs,
    averageRetryDelayMs: retryMetrics.averageRetryDelayMs,
    circuitBreakerState: retryMetrics.circuitBreakerState,
    lastError: retryMetrics.lastError?.message,
    lastRetryTimestamp: retryMetrics.lastRetryTimestamp,
  });
}

// Reset metrics for clean monitoring periods
client.resetRetryMetrics();
```

### Retry Policy Presets

The library includes three built-in retry policy presets optimized for different environments:

#### Production (Default)

- **Max attempts**: 3
- **Backoff**: Exponential with 1s initial delay, 30s max
- **Circuit breaker**: Enabled (5 failures to open, 30s recovery)
- **Jitter**: Equal jitter to prevent thundering herd

#### Development

- **Max attempts**: 5
- **Backoff**: Exponential with 500ms initial delay, 15s max
- **Circuit breaker**: Disabled for easier debugging
- **Jitter**: Full jitter for maximum randomization

#### Testing

- **Max attempts**: 2
- **Backoff**: Exponential with 2s initial delay, 60s max
- **Circuit breaker**: Enabled with conservative settings
- **Jitter**: Decorrelated jitter for sophisticated patterns

### Performance Characteristics

- **Rate Limiter**: High-performance sliding window allows concurrent execution within limits
- **Memory Efficient**: Automatic cleanup of expired timestamps and bounded queue sizes
- **Production Ready**: Circuit breaker prevents cascade failures
- **Observable**: Comprehensive metrics for monitoring and alerting

## Domain-Driven Design

The library follows DDD principles with clear separation of concerns:

- **Entities**: `GoveeDevice`, `DeviceState`, `Command`
- **Value Objects**: `ColorRgb`, `ColorTemperature`, `Brightness`
- **Repositories**: `IGoveeDeviceRepository`, `GoveeDeviceRepository`
- **Services**: `GoveeControlService`
- **Errors**: Comprehensive error hierarchy

## Advanced Usage

### Custom Repository

```typescript
import { GoveeControlService } from '@felixgeelhaar/govee-api-client';

// Use your own repository implementation
const service = new GoveeControlService({
  repository: new CustomGoveeRepository(),
  rateLimit: 120,
});
```

### Command Pattern

```typescript
import { CommandFactory } from '@felixgeelhaar/govee-api-client';

// Create commands manually
const powerOn = CommandFactory.powerOn();
const setBrightness = CommandFactory.brightness(new Brightness(75));

// Send custom commands
await client.sendCommand(deviceId, model, powerOn);
await client.sendCommand(deviceId, model, setBrightness);
```

## Requirements

- Node.js 18.0.0 or higher
- Valid Govee Developer API key

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run lint
```

## License

MIT © [Felix Geelhaar]

## Contributing

Contributions are welcome! Please ensure all tests pass and maintain the existing code style.

## API Documentation

For more information about the Govee Developer API, visit: https://govee-public.s3.amazonaws.com/developer-docs/GoveeDeveloperAPIReference.pdf

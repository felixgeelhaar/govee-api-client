# Govee API TypeScript Client

[![npm version](https://badge.fury.io/js/%40felixgeelhaar%2Fgovee-api-client.svg)](https://badge.fury.io/js/%40felixgeelhaar%2Fgovee-api-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/felixgeelhaar/govee-api-client/workflows/CI/badge.svg)](https://github.com/felixgeelhaar/govee-api-client/actions)
[![codecov](https://codecov.io/gh/felixgeelhaar/govee-api-client/branch/main/graph/badge.svg)](https://codecov.io/gh/felixgeelhaar/govee-api-client)

An enterprise-grade TypeScript client library for the Govee Developer REST API. Built with Domain-Driven Design (DDD) principles, comprehensive error handling, and production-ready rate limiting and retry capabilities.

## Features

- 🎯 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🏗️ **Domain-Driven Design**: Clean architecture following DDD principles
- ✅ **Runtime Validation**: Zod-based API response validation for production safety
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

// Initialize the client (uses GOVEE_API_KEY environment variable)
const client = new GoveeClient();

// Or provide API key explicitly
// const client = new GoveeClient({ apiKey: 'your-govee-api-key' });

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

### API Key

The client reads the API key from the `GOVEE_API_KEY` environment variable by default:

```bash
# Set environment variable
export GOVEE_API_KEY=your-govee-api-key

# Or use a .env file
echo "GOVEE_API_KEY=your-govee-api-key" > .env
```

```typescript
import { GoveeClient } from '@felixgeelhaar/govee-api-client';

// Uses GOVEE_API_KEY environment variable automatically
const client = new GoveeClient();
```

You can also provide the API key explicitly (not recommended for production):

```typescript
const client = new GoveeClient({
  apiKey: 'your-govee-api-key', // Explicit API key (overrides environment variable)
});
```

### Full Configuration

```typescript
import pino from 'pino';
import { GoveeClient, RetryPolicy } from '@felixgeelhaar/govee-api-client';

const client = new GoveeClient({
  // apiKey is optional - uses GOVEE_API_KEY environment variable by default
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

### Advanced Light Control

#### Dynamic Light Scenes

```typescript
import { LightScene } from '@felixgeelhaar/govee-api-client';

// Get available dynamic scenes for a device
const scenes = await client.getDynamicScenes(deviceId, model);
console.log(`Available scenes: ${scenes.map(s => s.name).join(', ')}`);

// Use built-in factory methods for common scenes
await client.setLightScene(deviceId, model, LightScene.sunrise());
await client.setLightScene(deviceId, model, LightScene.sunset());
await client.setLightScene(deviceId, model, LightScene.rainbow());
await client.setLightScene(deviceId, model, LightScene.aurora());

// Or set a custom scene
const customScene = new LightScene(3853, 4280, 'My Scene');
await client.setLightScene(deviceId, model, customScene);
```

#### Segment Color Control (RGB IC Devices)

```typescript
import { SegmentColor, ColorRgb } from '@felixgeelhaar/govee-api-client';

// Set color for individual segments
const segment1 = new SegmentColor(0, new ColorRgb(255, 0, 0)); // Red
const segment2 = new SegmentColor(1, new ColorRgb(0, 255, 0)); // Green
const segment3 = new SegmentColor(2, new ColorRgb(0, 0, 255)); // Blue

// Set multiple segments at once
await client.setSegmentColors(deviceId, model, [segment1, segment2, segment3]);

// Set brightness for individual segments
await client.setSegmentBrightness(deviceId, model, [
  { index: 0, brightness: new Brightness(100) },
  { index: 1, brightness: new Brightness(75) },
  { index: 2, brightness: new Brightness(50) },
]);
```

#### Music Mode

```typescript
import { MusicMode } from '@felixgeelhaar/govee-api-client';

// Set music mode with sensitivity
const musicMode = new MusicMode(1, 75); // Mode 1, 75% sensitivity
await client.setMusicMode(deviceId, model, musicMode);

// Music mode without sensitivity (uses device default)
const basicMode = new MusicMode(2);
await client.setMusicMode(deviceId, model, basicMode);
```

#### Toggle and Mode Controls

```typescript
// Nightlight toggle
await client.setNightlightToggle(deviceId, model, true); // Enable
await client.setNightlightToggle(deviceId, model, false); // Disable

// Gradient toggle
await client.setGradientToggle(deviceId, model, true);

// Preset scenes
await client.setNightlightScene(deviceId, model, 1); // Scene ID 1
await client.setPresetScene(deviceId, model, 'cozy'); // Named scene
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

#### LightScene

```typescript
import { LightScene } from '@felixgeelhaar/govee-api-client';

// Built-in factory methods for common dynamic scenes
const sunrise = LightScene.sunrise();
const sunset = LightScene.sunset();
const rainbow = LightScene.rainbow();
const aurora = LightScene.aurora();
const candlelight = LightScene.candlelight();
const nightlight = LightScene.nightlight();
const romantic = LightScene.romantic();
const blinking = LightScene.blinking();

// Custom scene
const custom = new LightScene(3853, 4280, 'My Custom Scene');

// Scene properties
console.log(sunrise.name); // "Sunrise"
console.log(sunrise.id); // 3853
console.log(sunrise.paramId); // 4280
```

#### SegmentColor

```typescript
import { SegmentColor, ColorRgb, Brightness } from '@felixgeelhaar/govee-api-client';

// Color only for a segment
const segment1 = new SegmentColor(0, new ColorRgb(255, 0, 0));

// Color with brightness for a segment
const segment2 = new SegmentColor(1, new ColorRgb(0, 255, 0), new Brightness(75));

// Check if segment has brightness
console.log(segment1.hasBrightness()); // false
console.log(segment2.hasBrightness()); // true

// Access segment properties
console.log(segment2.index); // 1
console.log(segment2.color.toHex()); // "#00ff00"
console.log(segment2.brightness?.level); // 75
```

#### MusicMode

```typescript
import { MusicMode } from '@felixgeelhaar/govee-api-client';

// Music mode with sensitivity (0-100)
const mode1 = new MusicMode(1, 75);

// Music mode without sensitivity
const mode2 = new MusicMode(2);

// Check if mode has sensitivity
console.log(mode1.hasSensitivity()); // true
console.log(mode2.hasSensitivity()); // false

// Access properties
console.log(mode1.modeId); // 1
console.log(mode1.sensitivity); // 75
```

## Error Handling

The library provides a comprehensive error hierarchy for different types of failures:

```typescript
import {
  GoveeApiError,
  InvalidApiKeyError,
  RateLimitError,
  NetworkError,
  ValidationError,
} from '@felixgeelhaar/govee-api-client';

try {
  await client.getDevices();
} catch (error) {
  if (error instanceof ValidationError) {
    // API returned malformed data that failed validation
    console.log('Validation error:', error.message);

    // Get detailed validation errors
    const details = error.getValidationDetails();
    details.forEach(detail => {
      console.log(`  ${detail.path}: ${detail.message}`);
      console.log(`  Received: ${JSON.stringify(detail.received)}`);
    });

    // Or get a summary string for logging
    console.log('Summary:', error.getValidationSummary());
  } else if (error instanceof InvalidApiKeyError) {
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

### Runtime Validation

All API responses are validated at runtime using Zod schemas to ensure data integrity:

- **Automatic**: All API calls are validated transparently
- **Type-safe**: Catches malformed responses before they reach your code
- **Detailed errors**: `ValidationError` provides specific information about what failed
- **Production-ready**: Protects against unexpected API changes

If you need custom validation, the Zod schemas are exported:

```typescript
import {
  GoveeDevicesResponseSchema,
  GoveeStateResponseSchema,
  GoveeCommandResponseSchema,
} from '@felixgeelhaar/govee-api-client';

// Use for custom validation scenarios
const result = GoveeDevicesResponseSchema.safeParse(rawApiData);
if (result.success) {
  console.log('Valid data:', result.data);
} else {
  console.log('Validation errors:', result.error);
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

- Node.js 20.0.0 or higher
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

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code of conduct
- Development workflow
- Code standards and architecture
- Testing requirements
- Commit guidelines
- Pull request process

For feature requests and discussions, visit our [GitHub Discussions](https://github.com/felixgeelhaar/govee-api-client/discussions).

## Roadmap

See our [Product Roadmap](ROADMAP.md) for planned features and enhancements, including:

- **Short-term (1-3 months):** Additional scene factory methods, animation utilities, performance optimizations
- **Medium-term (3-6 months):** Device discovery, advanced scheduling, real-time monitoring
- **Long-term (6-12 months):** Cloud integration, UI components, AI/ML features, ecosystem integrations

We welcome feedback and contributions for any roadmap items!

## API Documentation

For more information about the Govee Developer API, visit the official documentation:

- **API Reference**: https://developer.govee.com/reference
- **Getting Started**: https://developer.govee.com/docs
- **Device Control**: https://developer.govee.com/reference/control-you-devices
- **Device State**: https://developer.govee.com/reference/get-devices-status
- **Get Devices**: https://developer.govee.com/reference/get-you-devices

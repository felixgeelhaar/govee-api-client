# Govee API TypeScript Client

[![npm version](https://badge.fury.io/js/%40felixgeelhaar%2Fgovee-api-client.svg)](https://badge.fury.io/js/%40felixgeelhaar%2Fgovee-api-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/felixgeelhaar/govee-api-client/workflows/CI/badge.svg)](https://github.com/felixgeelhaar/govee-api-client/actions)
[![codecov](https://codecov.io/gh/felixgeelhaar/govee-api-client/branch/main/graph/badge.svg)](https://codecov.io/gh/felixgeelhaar/govee-api-client)

An enterprise-grade TypeScript client library for the Govee Developer REST API. Built with Domain-Driven Design (DDD) principles and comprehensive error handling.

## Features

- 🎯 **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🏗️ **Domain-Driven Design**: Clean architecture following DDD principles
- ⚡ **Rate Limiting**: Built-in rate limiting to prevent API throttling
- 🛡️ **Error Handling**: Comprehensive error hierarchy with specific error types
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

const client = new GoveeClient({
  apiKey: 'your-govee-api-key',
  timeout: 30000, // Request timeout in milliseconds (default: 30000)
  rateLimit: 100, // Requests per minute (default: 100)
  logger: pino({ level: 'info' }), // Optional logger (silent by default)
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

## Rate Limiting

The client automatically handles rate limiting according to Govee's API limits (100 requests per minute by default). All requests are queued and throttled appropriately.

```typescript
// Customize rate limiting
const client = new GoveeClient({
  apiKey: 'your-api-key',
  rateLimit: 60, // 60 requests per minute
});
```

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

- Node.js 16.0.0 or higher
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

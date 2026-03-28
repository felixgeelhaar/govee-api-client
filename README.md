# Govee API Client

[![npm version](https://img.shields.io/npm/v/@felixgeelhaar/govee-api-client)](https://www.npmjs.com/package/@felixgeelhaar/govee-api-client)
[![npm downloads](https://img.shields.io/npm/dm/@felixgeelhaar/govee-api-client)](https://www.npmjs.com/package/@felixgeelhaar/govee-api-client)
[![CI](https://github.com/felixgeelhaar/govee-api-client/workflows/CI/badge.svg)](https://github.com/felixgeelhaar/govee-api-client/actions)
[![Known Vulnerabilities](https://snyk.io/test/github/felixgeelhaar/govee-api-client/badge.svg)](https://snyk.io/test/github/felixgeelhaar/govee-api-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![npm provenance](https://img.shields.io/badge/provenance-verified-brightgreen)](https://docs.npmjs.com/generating-provenance-statements)

A TypeScript client for the [Govee Developer API](https://developer.govee.com). Control your Govee lights, appliances, and other smart devices from code.

## Install

```bash
npm install @felixgeelhaar/govee-api-client
```

## Getting Started

You'll need a Govee API key. Get one from the [Govee Developer Platform](https://developer.govee.com).

```typescript
import { GoveeClient, ColorRgb, Brightness } from '@felixgeelhaar/govee-api-client';

const client = new GoveeClient({ apiKey: 'your-api-key' });

// List your devices
const devices = await client.getDevices();

// Find and control a light
const light = await client.findDeviceByName('Living Room');

if (light) {
  await client.turnOn(light.deviceId, light.model);
  await client.setBrightness(light.deviceId, light.model, new Brightness(75));
  await client.setColor(light.deviceId, light.model, new ColorRgb(255, 120, 50));
}
```

You can also set the `GOVEE_API_KEY` environment variable and skip passing it to the constructor:

```typescript
const client = new GoveeClient(); // reads from GOVEE_API_KEY
```

## What You Can Do

### Basic Controls

```typescript
await client.turnOn(deviceId, model);
await client.turnOff(deviceId, model);
await client.setBrightness(deviceId, model, new Brightness(75));
```

### Colors

```typescript
import { ColorRgb, ColorTemperature } from '@felixgeelhaar/govee-api-client';

// Set an RGB color
await client.setColor(deviceId, model, new ColorRgb(255, 0, 0));

// Set a color temperature
await client.setColorTemperature(deviceId, model, ColorTemperature.warmWhite());

// Turn on with color and brightness in one call
await client.turnOnWithColor(deviceId, model, new ColorRgb(0, 255, 0), new Brightness(80));
```

### Scenes

```typescript
import { LightScene } from '@felixgeelhaar/govee-api-client';

// Browse available scenes for a device
const scenes = await client.getDynamicScenes(deviceId, model);

// Apply a built-in scene
await client.setLightScene(deviceId, model, LightScene.sunset());
await client.setLightScene(deviceId, model, LightScene.aurora());
```

### Segments (for LED strips and curtain lights)

```typescript
import { SegmentColor, ColorRgb } from '@felixgeelhaar/govee-api-client';

await client.setSegmentColors(deviceId, model, [
  new SegmentColor(0, new ColorRgb(255, 0, 0)),
  new SegmentColor(1, new ColorRgb(0, 255, 0)),
  new SegmentColor(2, new ColorRgb(0, 0, 255)),
]);
```

### Music Mode

```typescript
import { MusicMode } from '@felixgeelhaar/govee-api-client';

await client.setMusicMode(deviceId, model, new MusicMode(1, 75));
```

### Toggles

```typescript
await client.setNightlightToggle(deviceId, model, true);
await client.setGradientToggle(deviceId, model, true);
await client.setSceneStageToggle(deviceId, model, true);
```

### Device State

```typescript
const state = await client.getDeviceState(deviceId, model);

console.log(state.getPowerState());    // true / false
console.log(state.isOnline());         // true / false
console.log(state.getBrightness());    // 0-100
```

## Configuration

```typescript
const client = new GoveeClient({
  apiKey: 'your-api-key',
  timeout: 30000,           // request timeout in ms (default: 30000)
  rateLimit: 95,            // requests per minute (default: 95)
  enableRetries: true,      // retry failed requests (default: false)
  retryPolicy: 'production', // 'development', 'testing', or 'production'
});
```

### Rate Limiting

The client automatically stays within Govee's API rate limits (100 requests/min). By default it allows 95 requests/min, leaving a small buffer.

### Retries

When enabled, failed requests are retried with exponential backoff. The built-in presets handle common scenarios:

- **production** — 3 attempts, circuit breaker enabled
- **development** — 5 attempts, circuit breaker disabled
- **testing** — 2 attempts, conservative settings

You can also pass a custom `RetryPolicy` instance for full control. See the [examples](docs/EXAMPLES.md) for details.

## Error Handling

```typescript
import {
  GoveeApiError,
  InvalidApiKeyError,
  RateLimitError,
  NetworkError,
} from '@felixgeelhaar/govee-api-client';

try {
  await client.turnOn(deviceId, model);
} catch (error) {
  if (error instanceof InvalidApiKeyError) {
    console.log('Check your API key');
  } else if (error instanceof RateLimitError) {
    console.log(`Too many requests. Retry in ${error.getRetryAfterMs()}ms`);
  } else if (error instanceof NetworkError) {
    console.log('Network issue — retryable:', error.isRetryable());
  } else if (error instanceof GoveeApiError) {
    console.log('API error:', error.message);
  }
}
```

## Requirements

- Node.js 20 or higher
- A [Govee Developer API key](https://developer.govee.com)

## Development

```bash
npm install
npm run build
npm test
npm run test:coverage
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT

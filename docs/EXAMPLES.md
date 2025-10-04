# Govee API Client - Examples

This document provides comprehensive examples for using the Govee API Client library. Each example is complete and can be run as-is with a valid API key.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Device Discovery](#device-discovery)
- [Device Control](#device-control)
- [Color Management](#color-management)
- [State Management](#state-management)
- [Error Handling](#error-handling)
- [Runtime Validation & Error Recovery](#runtime-validation--error-recovery)
- [Rate Limiting & Monitoring](#rate-limiting--monitoring)
- [Retry Configuration](#retry-configuration)
- [Advanced Usage](#advanced-usage)

## Basic Setup

### Simple Client Initialization

```typescript
import { GoveeClient } from '@felixgeelhaar/govee-api-client';

const client = new GoveeClient({
  apiKey: 'your-govee-api-key-here',
});

// Test connection
try {
  const devices = await client.getDevices();
  console.log(`Successfully connected! Found ${devices.length} devices.`);
} catch (error) {
  console.error('Failed to connect:', error.message);
}
```

### Production Configuration

```typescript
import { GoveeClient } from '@felixgeelhaar/govee-api-client';
import pino from 'pino';

const client = new GoveeClient({
  apiKey: process.env.GOVEE_API_KEY!,
  timeout: 30000, // 30 second timeout
  rateLimit: 90, // 90 requests per minute (conservative)
  logger: pino({
    // Structured logging
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
  enableRetries: true, // Enable retry logic
  retryPolicy: 'production', // Production retry settings
});
```

## Device Discovery

### List All Devices

```typescript
async function listAllDevices() {
  try {
    const devices = await client.getDevices();

    console.log(`Found ${devices.length} devices:`);
    devices.forEach(device => {
      console.log(`- ${device.deviceName} (${device.model})`);
      console.log(`  ID: ${device.deviceId}`);
      console.log(`  Controllable: ${device.controllable}`);
      console.log(`  Supported commands: ${device.supportedCmds.join(', ')}`);
      console.log('');
    });
  } catch (error) {
    console.error('Failed to list devices:', error.message);
  }
}
```

### Find Specific Devices

```typescript
async function findDevicesByName() {
  // Case-insensitive search
  const livingRoomLight = await client.findDeviceByName('living room');

  if (livingRoomLight) {
    console.log('Found living room light:', livingRoomLight.deviceName);
  } else {
    console.log('Living room light not found');
  }
}

async function findDevicesByModel() {
  const h6159Devices = await client.findDevicesByModel('H6159');

  console.log(`Found ${h6159Devices.length} H6159 devices:`);
  h6159Devices.forEach(device => {
    console.log(`- ${device.deviceName} (${device.deviceId})`);
  });
}
```

### Filter Controllable Devices

```typescript
async function getControllableDevices() {
  const controllableDevices = await client.getControllableDevices();

  console.log('Controllable devices:');
  controllableDevices.forEach(device => {
    console.log(`- ${device.deviceName}: ${device.supportedCmds.join(', ')}`);
  });
}
```

## Device Control

### Basic Power Control

```typescript
async function basicPowerControl(deviceId: string, model: string) {
  try {
    // Turn on
    await client.turnOn(deviceId, model);
    console.log('Device turned on');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Turn off
    await client.turnOff(deviceId, model);
    console.log('Device turned off');
  } catch (error) {
    console.error('Power control failed:', error.message);
  }
}
```

### Brightness Control

```typescript
import { Brightness } from '@felixgeelhaar/govee-api-client';

async function brightnessControl(deviceId: string, model: string) {
  try {
    // Set to 25% brightness
    await client.setBrightness(deviceId, model, Brightness.dim());
    console.log('Set to dim (25%)');

    // Set to 50% brightness
    await client.setBrightness(deviceId, model, Brightness.medium());
    console.log('Set to medium (50%)');

    // Set to 75% brightness
    await client.setBrightness(deviceId, model, Brightness.bright());
    console.log('Set to bright (75%)');

    // Custom brightness
    await client.setBrightness(deviceId, model, new Brightness(85));
    console.log('Set to custom brightness (85%)');
  } catch (error) {
    console.error('Brightness control failed:', error.message);
  }
}
```

### Turn On With Settings

```typescript
import { ColorRgb, ColorTemperature, Brightness } from '@felixgeelhaar/govee-api-client';

async function turnOnWithSettings(deviceId: string, model: string) {
  try {
    // Turn on with brightness
    await client.turnOnWithBrightness(deviceId, model, new Brightness(60));
    console.log('Turned on with 60% brightness');

    // Turn on with red color
    const red = new ColorRgb(255, 0, 0);
    await client.turnOnWithColor(deviceId, model, red, new Brightness(80));
    console.log('Turned on with red color at 80% brightness');

    // Turn on with warm white
    const warmWhite = ColorTemperature.warmWhite();
    await client.turnOnWithColorTemperature(deviceId, model, warmWhite, new Brightness(100));
    console.log('Turned on with warm white at 100% brightness');
  } catch (error) {
    console.error('Turn on with settings failed:', error.message);
  }
}
```

## Color Management

### RGB Color Control

```typescript
import { ColorRgb } from '@felixgeelhaar/govee-api-client';

async function rgbColorControl(deviceId: string, model: string) {
  try {
    // Primary colors
    await client.setColor(deviceId, model, new ColorRgb(255, 0, 0)); // Red
    console.log('Set to red');

    await new Promise(resolve => setTimeout(resolve, 1000));

    await client.setColor(deviceId, model, new ColorRgb(0, 255, 0)); // Green
    console.log('Set to green');

    await new Promise(resolve => setTimeout(resolve, 1000));

    await client.setColor(deviceId, model, new ColorRgb(0, 0, 255)); // Blue
    console.log('Set to blue');

    // Create color from hex
    const purple = ColorRgb.fromHex('#800080');
    await client.setColor(deviceId, model, purple);
    console.log('Set to purple from hex');

    // Create color from object
    const cyan = ColorRgb.fromObject({ r: 0, g: 255, b: 255 });
    await client.setColor(deviceId, model, cyan);
    console.log('Set to cyan from object');
  } catch (error) {
    console.error('RGB color control failed:', error.message);
  }
}
```

### Color Temperature Control

```typescript
import { ColorTemperature } from '@felixgeelhaar/govee-api-client';

async function colorTemperatureControl(deviceId: string, model: string) {
  try {
    // Preset temperatures
    await client.setColorTemperature(deviceId, model, ColorTemperature.warmWhite());
    console.log('Set to warm white (2700K)');

    await new Promise(resolve => setTimeout(resolve, 1000));

    await client.setColorTemperature(deviceId, model, ColorTemperature.daylight());
    console.log('Set to daylight (5600K)');

    await new Promise(resolve => setTimeout(resolve, 1000));

    await client.setColorTemperature(deviceId, model, ColorTemperature.coolWhite());
    console.log('Set to cool white (6500K)');

    // Custom temperature
    const customTemp = new ColorTemperature(4000);
    await client.setColorTemperature(deviceId, model, customTemp);
    console.log('Set to custom temperature (4000K)');

    // Check if temperature is warm or cool
    console.log(`Is warm: ${customTemp.isWarm()}`); // true (< 4000K)
    console.log(`Is cool: ${customTemp.isCool()}`); // false (> 5000K)
  } catch (error) {
    console.error('Color temperature control failed:', error.message);
  }
}
```

### Color Utilities

```typescript
import { ColorRgb } from '@felixgeelhaar/govee-api-client';

function colorUtilities() {
  const red = new ColorRgb(255, 0, 0);

  // Color information
  console.log('RGB values:', red.r, red.g, red.b);
  console.log('Hex representation:', red.toHex()); // "#ff0000"
  console.log('String representation:', red.toString()); // "rgb(255, 0, 0)"
  console.log('Object representation:', red.toObject()); // { r: 255, g: 0, b: 0 }

  // Color comparison
  const anotherRed = new ColorRgb(255, 0, 0);
  const blue = new ColorRgb(0, 0, 255);

  console.log('Colors equal:', red.equals(anotherRed)); // true
  console.log('Colors equal:', red.equals(blue)); // false
}
```

## State Management

### Check Device State

```typescript
async function checkDeviceState(deviceId: string, model: string) {
  try {
    const state = await client.getDeviceState(deviceId, model);

    console.log('Device State:');
    console.log(`- Online: ${state.isOnline()}`);
    console.log(`- Power: ${state.getPowerState()}`);
    console.log(`- Brightness: ${state.getBrightness()}%`);

    const color = state.getColor();
    if (color) {
      console.log(`- Color: rgb(${color.r}, ${color.g}, ${color.b})`);
    }

    const temp = state.getColorTemperature();
    if (temp) {
      console.log(`- Color Temperature: ${temp}K`);
    }
  } catch (error) {
    console.error('Failed to get device state:', error.message);
  }
}
```

### Monitor Device Status

```typescript
async function monitorDeviceStatus(deviceId: string, model: string) {
  try {
    // Check if device is online
    const isOnline = await client.isDeviceOnline(deviceId, model);
    console.log(`Device online: ${isOnline}`);

    // Check if device is powered on
    const isPoweredOn = await client.isDevicePoweredOn(deviceId, model);
    console.log(`Device powered on: ${isPoweredOn}`);

    // Only control if device is online
    if (isOnline) {
      await client.turnOn(deviceId, model);
      console.log('Device turned on');
    } else {
      console.log('Device is offline, cannot control');
    }
  } catch (error) {
    console.error('Device monitoring failed:', error.message);
  }
}
```

## Error Handling

### Comprehensive Error Handling

```typescript
import {
  GoveeApiError,
  InvalidApiKeyError,
  RateLimitError,
  NetworkError,
  ValidationError,
} from '@felixgeelhaar/govee-api-client';

async function comprehensiveErrorHandling() {
  try {
    const devices = await client.getDevices();
    // ... perform operations
  } catch (error) {
    if (error instanceof InvalidApiKeyError) {
      console.error('❌ Invalid API Key');
      console.log('💡 Suggestion:', error.getRecommendation());
      // Handle: Get new API key, update configuration
    } else if (error instanceof RateLimitError) {
      console.error('⏱️ Rate Limited');
      console.log(`⏳ Retry after: ${error.getRetryAfterMs()}ms`);
      // Handle: Wait and retry, or queue for later
    } else if (error instanceof GoveeApiError) {
      console.error('🔌 API Error:', error.message);
      console.log('💡 Suggestion:', error.getRecommendation());

      if (error.isDeviceOffline()) {
        console.log('📴 Device is currently offline');
        // Handle: Skip this device, notify user
      }

      if (error.statusCode) {
        console.log(`🔢 Status Code: ${error.statusCode}`);
      }
    } else if (error instanceof NetworkError) {
      console.error('🌐 Network Error:', error.message);
      console.log(`🔄 Retryable: ${error.isRetryable()}`);

      if (error.isRetryable()) {
        // Implement retry logic
        console.log('Will retry this operation...');
      }
    } else if (error instanceof ValidationError) {
      console.error('✅ Validation Error:', error.message);
      console.log('📋 Validation Details:');

      // Get detailed validation errors
      const details = error.getValidationDetails();
      details.forEach(detail => {
        console.log(`  📍 ${detail.path}: ${detail.message}`);
        console.log(`  💥 Received: ${JSON.stringify(detail.received)}`);
      });

      // Or use summary for quick logging
      console.log('Summary:', error.getValidationSummary());
    } else {
      console.error('❓ Unknown Error:', error);
    }
  }
}
```

### Retry Pattern

```typescript
async function retryPattern(operation: () => Promise<void>, maxRetries = 3) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await operation();
      return; // Success!
    } catch (error) {
      attempt++;

      if (error instanceof RateLimitError && attempt < maxRetries) {
        const delay = error.getRetryAfterMs();
        console.log(`Rate limited, waiting ${delay}ms before retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (error instanceof NetworkError && error.isRetryable() && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Network error, waiting ${delay}ms before retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Not retryable or max retries reached
      throw error;
    }
  }
}
```

## Runtime Validation & Error Recovery

### Understanding Validation Errors

All API responses are automatically validated using Zod schemas. If the Govee API returns malformed data, a `ValidationError` is thrown with detailed information about what failed validation.

```typescript
import { ValidationError } from '@felixgeelhaar/govee-api-client';

async function handleValidationErrors() {
  try {
    const devices = await client.getDevices();
    console.log(`Found ${devices.length} devices`);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('API returned invalid data');

      // Get structured validation errors
      const validationDetails = error.getValidationDetails();

      validationDetails.forEach(({ path, message, received }) => {
        console.log(`Field "${path}" failed validation:`);
        console.log(`  Issue: ${message}`);
        console.log(`  Received value: ${JSON.stringify(received)}`);
      });

      // Log the complete Zod error for debugging
      console.log('Zod Error:', error.zodError);

      // Log the raw API response for investigation
      console.log('Raw Data:', error.rawData);
    }
  }
}
```

### Custom Validation with Exported Schemas

For advanced use cases, you can access the Zod schemas directly:

```typescript
import {
  GoveeDevicesResponseSchema,
  GoveeStateResponseSchema,
  GoveeCommandResponseSchema,
  type GoveeDevicesResponse,
} from '@felixgeelhaar/govee-api-client';

async function customValidation() {
  // Example: Validate data from a cache or external source
  const cachedData: unknown = await getCachedDevices();

  const validationResult = GoveeDevicesResponseSchema.safeParse(cachedData);

  if (validationResult.success) {
    // Data is valid and typed
    const response: GoveeDevicesResponse = validationResult.data;
    console.log(`Cached data is valid: ${response.data.length} devices`);
  } else {
    // Handle validation failure
    console.error('Cached data is invalid:', validationResult.error);
    // Fetch fresh data from API
    const freshDevices = await client.getDevices();
    await cacheDevices(freshDevices);
  }
}
```

### Graceful Degradation

Implement graceful degradation when validation fails:

```typescript
async function robustDeviceFetch() {
  try {
    // Try to get devices normally
    return await client.getDevices();
  } catch (error) {
    if (error instanceof ValidationError) {
      console.warn('API response validation failed, using fallback');

      // Log for investigation
      console.error('Validation error details:', error.getValidationSummary());

      // Return empty array or cached data as fallback
      const cachedDevices = await getCachedDevices();
      if (cachedDevices && cachedDevices.length > 0) {
        console.log('Using cached devices as fallback');
        return cachedDevices;
      }

      console.log('No cache available, returning empty array');
      return [];
    }

    // Re-throw other errors
    throw error;
  }
}
```

### Validation Error Logging for Debugging

Create detailed logs for troubleshooting validation issues:

```typescript
import pino from 'pino';

const logger = pino();

async function logValidationErrors() {
  try {
    const devices = await client.getDevices();
    return devices;
  } catch (error) {
    if (error instanceof ValidationError) {
      // Structured logging with all validation details
      logger.error(
        {
          err: error,
          validationSummary: error.getValidationSummary(),
          validationDetails: error.getValidationDetails(),
          zodIssues: error.zodError.issues,
          rawData: error.rawData,
        },
        'API response validation failed'
      );

      // Send to error tracking service
      await sendToErrorTracker({
        type: 'validation_error',
        message: error.message,
        details: error.getValidationDetails(),
        stack: error.stack,
      });
    }

    throw error;
  }
}
```

### Testing Validation Behavior

Test your error handling for validation failures:

```typescript
import { ValidationError } from '@felixgeelhaar/govee-api-client';
import { z } from 'zod';

// Simulate validation error for testing
function simulateValidationError() {
  const mockData = { invalid: 'data' };
  const validationError = z.object({ valid: z.string() }).safeParse(mockData);

  if (!validationError.success) {
    throw ValidationError.fromZodError(validationError.error, mockData);
  }
}

// Test your error handling
async function testErrorHandling() {
  try {
    simulateValidationError();
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log('✅ ValidationError handled correctly');
      console.log('Details:', error.getValidationDetails());
    }
  }
}
```

## Rate Limiting & Monitoring

### Monitor Rate Limiter

```typescript
function monitorRateLimiter() {
  const stats = client.getRateLimiterStats();

  console.log('Rate Limiter Status:');
  console.log(`- Current requests: ${stats.currentRequests}/${stats.maxRequests}`);
  console.log(`- Utilization: ${stats.utilizationPercent.toFixed(1)}%`);
  console.log(`- Queue size: ${stats.queueSize}`);
  console.log(`- Can execute immediately: ${stats.canExecuteImmediately}`);

  if (stats.nextAvailableSlot) {
    console.log(`- Next slot available: ${stats.nextAvailableSlot.toISOString()}`);
  }

  // Alert if utilization is high
  if (stats.utilizationPercent > 80) {
    console.warn('⚠️ High rate limiter utilization, consider reducing request frequency');
  }
}
```

### Monitor Service Performance

```typescript
function monitorServicePerformance() {
  const serviceStats = client.getServiceStats();

  console.log('Service Statistics:');
  console.log('Rate Limiter:', {
    utilization: `${serviceStats.rateLimiter.utilizationPercent.toFixed(1)}%`,
    queue: serviceStats.rateLimiter.queueSize,
    canExecute: serviceStats.rateLimiter.canExecuteImmediately,
  });

  if (serviceStats.retries) {
    console.log('Retry Metrics:', {
      attempts: serviceStats.retries.totalAttempts,
      successful: serviceStats.retries.successfulRetries,
      failed: serviceStats.retries.failedRetries,
      averageDelay: `${serviceStats.retries.averageRetryDelayMs.toFixed(0)}ms`,
      circuitBreaker: serviceStats.retries.circuitBreakerState,
    });
  }

  console.log('Configuration:', serviceStats.configuration);
}
```

## Retry Configuration

### Development Environment

```typescript
const devClient = new GoveeClient({
  apiKey: process.env.GOVEE_API_KEY!,
  enableRetries: true,
  retryPolicy: 'development', // More retries, shorter delays
  logger: pino({ level: 'debug' }),
});
```

### Custom Retry Policy

```typescript
import { GoveeClient, RetryPolicy } from '@felixgeelhaar/govee-api-client';

const customRetryPolicy = new RetryPolicy({
  backoff: {
    type: 'exponential',
    initialDelayMs: 2000, // Start with 2 second delay
    maxDelayMs: 60000, // Max 1 minute delay
    multiplier: 2.0, // Double delay each retry
  },
  jitter: {
    type: 'equal', // Add randomization
    factor: 0.1, // ±10% jitter
  },
  condition: {
    maxAttempts: 5, // Maximum 5 attempts
    maxTotalTimeMs: 300000, // Give up after 5 minutes total
    retryableStatusCodes: [408, 429, 502, 503, 504],
    retryableErrorTypes: [RateLimitError, NetworkError],
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 10, // Open after 10 failures
    recoveryTimeoutMs: 60000, // Try again after 1 minute
    halfOpenSuccessThreshold: 3, // Need 3 successes to close
  },
  enableMetrics: true,
});

const client = new GoveeClient({
  apiKey: process.env.GOVEE_API_KEY!,
  enableRetries: true,
  retryPolicy: customRetryPolicy,
});
```

## Advanced Usage

### Command Pattern

```typescript
import { CommandFactory, ColorRgb, Brightness } from '@felixgeelhaar/govee-api-client';

async function useCommandPattern(deviceId: string, model: string) {
  // Create commands manually
  const powerOn = CommandFactory.powerOn();
  const setBrightness = CommandFactory.brightness(new Brightness(75));
  const setColor = CommandFactory.color(new ColorRgb(255, 0, 0));

  // Send commands
  await client.sendCommand(deviceId, model, powerOn);
  await client.sendCommand(deviceId, model, setBrightness);
  await client.sendCommand(deviceId, model, setColor);
}
```

### Batch Operations

```typescript
async function batchOperations() {
  const devices = await client.getControllableDevices();

  // Turn on all devices with same color
  const red = new ColorRgb(255, 0, 0);
  const promises = devices.map(device =>
    client.turnOnWithColor(device.deviceId, device.model, red)
  );

  try {
    await Promise.all(promises);
    console.log('All devices set to red');
  } catch (error) {
    console.error('Some operations failed:', error.message);
  }
}
```

### Scene Management

```typescript
import { ColorRgb, ColorTemperature, Brightness } from '@felixgeelhaar/govee-api-client';

interface Scene {
  name: string;
  devices: Array<{
    deviceId: string;
    model: string;
    color?: ColorRgb;
    colorTemperature?: ColorTemperature;
    brightness: Brightness;
  }>;
}

async function applyScene(scene: Scene) {
  console.log(`Applying scene: ${scene.name}`);

  const promises = scene.devices.map(async device => {
    if (device.color) {
      await client.turnOnWithColor(device.deviceId, device.model, device.color, device.brightness);
    } else if (device.colorTemperature) {
      await client.turnOnWithColorTemperature(
        device.deviceId,
        device.model,
        device.colorTemperature,
        device.brightness
      );
    } else {
      await client.turnOnWithBrightness(device.deviceId, device.model, device.brightness);
    }
  });

  await Promise.all(promises);
  console.log(`Scene "${scene.name}" applied successfully`);
}

// Example scenes
const movieScene: Scene = {
  name: 'Movie Night',
  devices: [
    {
      deviceId: 'living-room-main',
      model: 'H6159',
      color: new ColorRgb(100, 0, 200), // Purple
      brightness: new Brightness(20),
    },
    {
      deviceId: 'living-room-accent',
      model: 'H6003',
      colorTemperature: ColorTemperature.warmWhite(),
      brightness: new Brightness(10),
    },
  ],
};
```

### Environment-Specific Configuration

```typescript
import { GoveeClient } from '@felixgeelhaar/govee-api-client';
import pino from 'pino';

function createClient() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return new GoveeClient({
    apiKey: process.env.GOVEE_API_KEY!,
    timeout: isDevelopment ? 10000 : 30000,
    rateLimit: isDevelopment ? 50 : 95,
    logger: isProduction
      ? pino({ level: 'warn' })
      : pino({ level: 'debug', transport: { target: 'pino-pretty' } }),
    enableRetries: isProduction,
    retryPolicy: isProduction ? 'production' : 'development',
  });
}
```

## Complete Application Example

```typescript
import {
  GoveeClient,
  ColorRgb,
  ColorTemperature,
  Brightness,
  GoveeApiError,
  RateLimitError,
  InvalidApiKeyError,
} from '@felixgeelhaar/govee-api-client';
import pino from 'pino';

class GoveeLightController {
  private client: GoveeClient;
  private logger = pino({ level: 'info' });

  constructor(apiKey: string) {
    this.client = new GoveeClient({
      apiKey,
      logger: this.logger,
      enableRetries: true,
      retryPolicy: 'production',
    });
  }

  async initialize() {
    try {
      const devices = await this.client.getDevices();
      this.logger.info(`Connected successfully. Found ${devices.length} devices.`);
      return devices;
    } catch (error) {
      if (error instanceof InvalidApiKeyError) {
        this.logger.error('Invalid API key. Please check your configuration.');
        throw error;
      }
      throw error;
    }
  }

  async setRoomColor(roomName: string, color: ColorRgb, brightness?: Brightness) {
    try {
      const device = await this.client.findDeviceByName(roomName);
      if (!device) {
        throw new Error(`Device not found: ${roomName}`);
      }

      if (!device.canControl()) {
        throw new Error(`Device not controllable: ${roomName}`);
      }

      await this.client.turnOnWithColor(device.deviceId, device.model, color, brightness);

      this.logger.info(`Set ${roomName} to ${color.toHex()}`);
    } catch (error) {
      if (error instanceof RateLimitError) {
        this.logger.warn(`Rate limited, retrying in ${error.getRetryAfterMs()}ms`);
        await new Promise(resolve => setTimeout(resolve, error.getRetryAfterMs()));
        return this.setRoomColor(roomName, color, brightness);
      }
      throw error;
    }
  }

  async getStats() {
    return this.client.getServiceStats();
  }
}

// Usage
async function main() {
  const controller = new GoveeLightController(process.env.GOVEE_API_KEY!);

  try {
    await controller.initialize();

    // Set living room to warm red
    await controller.setRoomColor('Living Room', new ColorRgb(255, 100, 100), new Brightness(70));

    // Monitor performance
    const stats = await controller.getStats();
    console.log('Performance:', stats);
  } catch (error) {
    console.error('Application error:', error.message);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
```

## Testing Examples

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { GoveeClient, ColorRgb, Brightness } from '@felixgeelhaar/govee-api-client';

describe('Govee Client Integration', () => {
  let client: GoveeClient;

  beforeEach(() => {
    client = new GoveeClient({
      apiKey: process.env.GOVEE_TEST_API_KEY!,
    });
  });

  it('should list devices successfully', async () => {
    const devices = await client.getDevices();
    expect(devices).toBeInstanceOf(Array);
    expect(devices.length).toBeGreaterThan(0);
  });

  it('should control device color', async () => {
    const devices = await client.getControllableDevices();
    const device = devices[0];

    if (device && device.supportsCommand('color')) {
      const red = new ColorRgb(255, 0, 0);
      await client.setColor(device.deviceId, device.model, red);

      // Verify state change
      const state = await client.getDeviceState(device.deviceId, device.model);
      const currentColor = state.getColor();

      expect(currentColor).toBeDefined();
      expect(currentColor!.r).toBe(255);
      expect(currentColor!.g).toBe(0);
      expect(currentColor!.b).toBe(0);
    }
  });
});
```

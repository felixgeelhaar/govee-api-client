# DEVELOPMENT.md

This file provides development guidance and architectural information for this repository.

## Project Overview

This is a TypeScript client library for the Govee Developer REST API, designed following Domain-Driven Design (DDD) principles and Test-Driven Development (TDD). The library serves as a communication layer for controlling Govee smart devices.

## Architecture & Domain Model

The codebase follows DDD with a single Bounded Context: "Govee Lighting Control"

### Core Entities & Value Objects

- **GoveeDevice** (Entity): Represents a controllable Govee device with `deviceId`, `model`, `deviceName`, `controllable`, `retrievable`, and `supportedCmds`
- **ColorRgb**: `{ r: number; g: number; b: number }`
- **ColorTemperature**: `{ kelvin: number }`
- **Brightness**: `{ level: number }` (0-100)

### Key Components

- **GoveeDeviceRepository**: Handles HTTP calls to Govee API endpoints (`/devices`, `/devices/state`)
- **GoveeControlService**: Main entry point for consumers, orchestrates commands and manages rate limiting

## Development Setup

Based on the technical design, this project will use:

- **TypeScript** for type safety
- **Vitest** for testing (unit and integration tests)
- **pino** for logging
- **p-limit** for rate limiting
- **nock** or **msw** for API mocking in tests

## Testing Strategy

### Test Coverage Requirements

- Target: >95% test coverage
- Focus on repository and service layers

### Test Types

- **Unit Tests**: Value object validation (e.g., Brightness 0-100 range)
- **Integration Tests**: Mock Govee API with nock/msw
  - Repository tests: HTTP response parsing, error handling (400, 401, 429, 500)
  - Service tests: Command construction, rate limiting logic

## Error Handling Hierarchy

```typescript
GoveeApiClientError (base)
├── GoveeApiError (API errors, device offline)
├── InvalidApiKeyError (401 responses)
├── RateLimitError (429 responses)
└── NetworkError (transport issues)
```

## API Configuration

Client instantiation pattern:

```typescript
const goveeClient = new GoveeClient({
  apiKey: 'YOUR_API_KEY',
  timeout: 5000, // ms
  logger: pino({ level: 'info' }),
});
```

## Rate Limiting

- Govee API limit: 100 requests per minute
- Implement request queue to prevent 429 errors
- Use p-limit for throttling

## Key Service Methods

```typescript
// GoveeControlService methods
sendCommand(deviceId: string, model: string, command: Command): Promise<void>
turnOn(deviceId: string, model: string): Promise<void>
turnOff(deviceId: string, model: string): Promise<void>
setBrightness(deviceId: string, model: string, brightness: Brightness): Promise<void>
setColor(deviceId: string, model: string, color: ColorRgb): Promise<void>
setColorTemperature(deviceId: string, model: string, temp: ColorTemperature): Promise<void>

// GoveeDeviceRepository methods
findAll(): Promise<GoveeDevice[]>
findState(deviceId: string, model: string): Promise<DeviceState>
```

## Development Guidelines

**NEVER create mocks, placeholders, or workarounds.** Always implement complete, production-ready functionality. This includes:

- No stub implementations or TODO comments
- No placeholder values or dummy data
- No temporary workarounds that bypass proper implementation
- All code must be fully functional and tested

## Distribution

- NPM module with TypeScript definitions
- Enterprise-grade with comprehensive error handling
- Silent by default, configurable logging levels

Technical Design Document: Govee API TypeScript Client
Version: 1.0

Author: Technical Lead

Status: Proposed

1. Introduction & Vision
   This document outlines the technical design for a standalone, enterprise-grade TypeScript client library for the Govee Developer REST API. The primary goal is to create a robust, reliable, and easy-to-use package that abstracts the complexities of the Govee API. This library will serve as the foundational communication layer for any application needing to control Govee devices, starting with the Govee Control Stream Deck plugin.

This library will be developed following Domain-Driven Design (DDD) principles to ensure a clean, bounded context, and Test-Driven Development (TDD) to guarantee reliability and maintainability.

2. Domain-Driven Design (DDD)
   The library exists within a single Bounded Context: "Govee Lighting Control." Its sole responsibility is to manage interactions with Govee devices via their public API.

2.1. Ubiquitous Language
Device: A controllable Govee product, identified by a deviceId and model.

DeviceState: The current reported status of a Device (e.g., power, brightness, color).

Command: An instruction sent to a Device (e.g., turn on, set brightness).

Color: A representation of color, either as an RGB value object or a Kelvin temperature.

Brightness: A value from 0-100 representing the device's luminosity.

RateLimit: The API usage constraint imposed by Govee.

2.2. Aggregates, Entities, and Value Objects
Entity: GoveeDevice

Identity: deviceId (string).

Properties: model, deviceName, controllable, retrievable, supportedCmds.

This entity represents a single Govee device.

Value Objects:

ColorRgb { r: number; g: number; b: number; }

ColorTemperature { kelvin: number; }

Brightness { level: number; }

2.3. Repositories
GoveeDeviceRepository (Interface & Implementation)

Responsibility: Abstract the data access layer. It will handle all axios HTTP calls to the Govee API endpoints (/devices, /devices/state).

Methods:

findAll(): Promise<GoveeDevice[]>

findState(deviceId: string, model: string): Promise<DeviceState>

The implementation will manage request/response mapping and error translation.

2.4. Services
GoveeControlService

Responsibility: Orchestrate control commands and manage API rate limiting. It will be the primary entry point for consumers of this library.

Methods:

sendCommand(deviceId: string, model: string, command: Command): Promise<void>

turnOn(deviceId: string, model: string): Promise<void>

turnOff(deviceId: string, model: string): Promise<void>

setBrightness(deviceId: string, model: string, brightness: Brightness): Promise<void>

setColor(deviceId: string, model: string, color: ColorRgb): Promise<void>

setColorTemperature(deviceId: string, model: string, temp: ColorTemperature): Promise<void>

3. Test-Driven Development (TDD) Strategy
   Testing will be implemented using Vitest as the test runner and assertion library.

Unit Tests:

Test all Value Objects to ensure validation logic is correct (e.g., Brightness must be between 0-100).

Test utility functions in isolation.

Integration Tests:

The core of our testing strategy. We will use nock or msw to mock the Govee API HTTP server.

Repository Tests: Write tests for GoveeDeviceRepository that make calls to the mock server. Verify that it correctly parses success responses and handles various HTTP error codes (400, 401, 429, 500).

Service Tests: Test the GoveeControlService to ensure it constructs the correct Command objects and sends them to the repository. Test the rate-limiting logic to ensure it queues and throttles requests appropriately.

Test Coverage: Aim for >95% test coverage, with a strict focus on the repository and service layers.

4. Enterprise & Production Readiness
   Error Handling:

A hierarchy of custom error classes will be implemented:

GoveeApiClientError (base class)

GoveeApiError (for errors returned by the Govee API, e.g., device offline)

InvalidApiKeyError (for 401 responses)

RateLimitError (for 429 responses)

NetworkError (for transport-level issues)

Rate Limiting:

The GoveeControlService will implement a request queue using a library like p-limit. It will be configured to adhere to the Govee API's rate limit (e.g., 100 requests per minute), preventing 429 errors.

Logging:

The library will use a lightweight, configurable logging library like pino.

It will be silent by default but can be configured with different log levels (debug, info, warn, error) during instantiation.

Debug logs will include request/response bodies for easier troubleshooting.

Configuration:

The client will be instantiated with a configuration object:

const goveeClient = new GoveeClient({
apiKey: 'YOUR_API_KEY',
timeout: 5000, // ms
logger: pino({ level: 'info' })
});

Distribution:

The library will be packaged as an NPM module with proper TypeScript type definitions included.

It will be published to a public or private NPM registry.

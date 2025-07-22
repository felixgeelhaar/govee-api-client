# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-07-22

### Added

- Initial release of the Govee API TypeScript client
- Complete Domain-Driven Design (DDD) architecture
- TypeScript support with comprehensive type definitions
- Rate limiting with configurable limits (default: 100 req/min)
- Comprehensive error handling with specific error types:
  - `GoveeApiClientError` (base class)
  - `GoveeApiError` for API-specific errors
  - `InvalidApiKeyError` for authentication issues
  - `RateLimitError` for rate limiting scenarios
  - `NetworkError` for network-related issues
- Value objects with validation:
  - `ColorRgb` for RGB color representation
  - `ColorTemperature` for color temperature (Kelvin)
  - `Brightness` for brightness levels (0-100%)
- Domain entities:
  - `GoveeDevice` for device representation
  - `DeviceState` for device status
  - `Command` classes for device control
- Repository pattern with `GoveeDeviceRepository`
- Service layer with `GoveeControlService`
- Main client class `GoveeClient` with simple API
- Configurable logging with Pino integration
- Comprehensive test suite with >92% coverage
- Integration tests with MSW for API mocking
- Pre-commit hooks with Husky and lint-staged
- GitHub Actions for CI/CD and automated NPM publishing
- Support for all major Govee API operations:
  - Device discovery and listing
  - Device state retrieval
  - Power control (on/off)
  - Brightness adjustment
  - RGB color control
  - Color temperature control
- Convenience methods for common operations
- Proper NPM package configuration with TypeScript declarations
- Comprehensive documentation and examples

### Development Features

- TypeScript strict mode enabled
- Prettier code formatting
- ESLint integration
- Vitest test runner with coverage reporting
- Source maps for debugging
- Automated dependency updates
- Semantic versioning
- GitHub templates for issues and pull requests

[Unreleased]: https://github.com/felixgeelhaar/govee-api-client/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/felixgeelhaar/govee-api-client/releases/tag/v1.0.0

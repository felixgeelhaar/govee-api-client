# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2025-01-27

### Fixed

- Fixed fatal error "Device ID must be a non-empty string" when Govee API returns devices with invalid device IDs
- Library now gracefully filters out devices with invalid data instead of failing completely
- Added robust validation and filtering for all device properties (deviceId, model, deviceName, supportedCmds)
- Enhanced logging to warn about filtered invalid devices for better observability

### Changed

- `getDevices()` method now returns only valid devices, filtering out any with invalid data
- Added comprehensive warning logs when devices are filtered due to invalid properties

### Added

- Extensive test coverage for invalid device scenarios including empty IDs, null values, and malformed data
- Enhanced error resilience for API data quality issues

## [1.0.1] - 2025-01-XX

### Fixed

- Initial release fixes and improvements

## [1.0.0] - 2025-01-XX

### Added

- Initial release of the Govee API client library
- Support for device discovery and control
- Enterprise-grade error handling and logging
- Comprehensive TypeScript support
- Rate limiting and API key management

/**
 * Retry infrastructure for Govee API client
 *
 * This module provides enterprise-grade retry logic with:
 * - Exponential backoff with configurable strategies
 * - Jitter algorithms to prevent thundering herd
 * - Circuit breaker pattern for resilience
 * - Comprehensive retry metrics and observability
 * - Type-safe error handling integration
 *
 * @example
 * ```typescript
 * import { RetryPolicy, RetryExecutor, RetryableRepository } from './infrastructure/retry';
 * import { GoveeDeviceRepository } from './infrastructure/GoveeDeviceRepository';
 *
 * // Create retry-enabled repository
 * const baseRepository = new GoveeDeviceRepository(config);
 * const retryableRepository = new RetryableRepository({
 *   repository: baseRepository,
 *   retryExecutor: RetryExecutor.createForGoveeApi(logger)
 * });
 *
 * // Use with automatic retries
 * const devices = await retryableRepository.findAll();
 * const metrics = retryableRepository.getRetryMetrics();
 * ```
 */

// Core retry policy and execution
export { RetryPolicy } from './RetryPolicy';
export type {
  BackoffStrategy,
  JitterConfig,
  RetryCondition,
  CircuitBreakerConfig,
  RetryPolicyConfig,
  RetryMetrics,
} from './RetryPolicy';

// Retryable request execution
export { RetryExecutor, RetryExecutorFactory } from './RetryableRequest';
export type {
  RetryableRequest,
  RetryResult,
  RetryAttempt,
  RetryExecutorConfig,
} from './RetryableRequest';

// Repository integration
export { RetryableRepository } from './RetryableRepository';
export type { RetryableRepositoryConfig } from './RetryableRepository';

// Configuration presets and builders
export { RetryConfigPresets, RetryConfigBuilder } from './RetryConfigPresets';

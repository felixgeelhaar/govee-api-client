/**
 * Integration Guide for Retry Logic with Govee API Client
 *
 * This file provides comprehensive examples and integration patterns for
 * adding retry logic to the Govee API client after rate limiting is implemented.
 */

import { Logger } from 'pino';
import { GoveeDeviceRepository } from '../GoveeDeviceRepository';
import { GoveeControlService } from '../../services/GoveeControlService';
import {
  RetryPolicy,
  RetryExecutor,
  RetryableRepository,
  RetryConfigPresets,
  RetryConfigBuilder,
  RetryExecutorFactory,
} from './index';

/**
 * INTEGRATION EXAMPLE 1: Basic Retry-Enabled Repository
 *
 * This example shows how to wrap the existing GoveeDeviceRepository
 * with retry functionality using default Govee API optimized settings.
 */
export function createBasicRetryRepository(apiKey: string, logger?: Logger): RetryableRepository {
  // Create the base repository
  const baseRepository = new GoveeDeviceRepository({
    apiKey,
    timeout: 30000,
    logger,
  });

  // Wrap with retry functionality
  const retryableRepository = new RetryableRepository({
    repository: baseRepository,
    retryExecutor: RetryExecutorFactory.createForGoveeApi(logger),
    logger,
    enableRequestIds: true,
  });

  return retryableRepository;
}

/**
 * INTEGRATION EXAMPLE 2: Production-Ready Service with Retry Logic
 *
 * This example shows how to integrate retry logic into the GoveeControlService
 * for production environments with conservative retry policies.
 */
export function createProductionGoveeService(apiKey: string, logger: Logger): GoveeControlService {
  // Create base repository
  const baseRepository = new GoveeDeviceRepository({
    apiKey,
    timeout: 30000,
    logger,
  });

  // Create production-optimized retry executor
  const retryPolicy = RetryPolicy.createConservative(logger);
  const retryExecutor = new RetryExecutor(retryPolicy, {
    logger,
    enableRequestLogging: true,
    enablePerformanceTracking: true,
  });

  // Wrap repository with retry logic
  const retryableRepository = new RetryableRepository({
    repository: baseRepository,
    retryExecutor,
    logger,
  });

  // Create service with retry-enabled repository
  return new GoveeControlService({
    repository: retryableRepository,
    rateLimit: 100, // 100 requests per minute
    logger,
  });
}

/**
 * INTEGRATION EXAMPLE 3: Custom Retry Configuration for Specific Use Cases
 *
 * This example demonstrates creating custom retry policies for different
 * operational scenarios.
 */
export class CustomRetryConfigurations {
  /**
   * Configuration for bulk operations that need to be resilient
   */
  static createBulkOperationConfig(logger?: Logger): RetryPolicy {
    const builder = RetryConfigPresets.custom()
      .withExponentialBackoff(2000, 60000, 1.5) // Start at 2s, max 1min, gentle growth
      .withDecorrelatedJitter(0.2) // Sophisticated jitter
      .withBasicConditions(5, 300000, [429, 502, 503, 504]) // 5 attempts, 5min total
      .withBasicCircuitBreaker(7, 60000, 3) // Higher failure threshold
      .withMetrics(true);

    if (logger) {
      builder.withLogger(logger);
    }

    return new RetryPolicy(builder.build());
  }

  /**
   * Configuration for real-time operations that need fast failure
   */
  static createRealTimeConfig(logger?: Logger): RetryPolicy {
    const builder = RetryConfigPresets.custom()
      .withLinearBackoff(500, 2000) // Quick linear backoff
      .withEqualJitter(0.1) // Low jitter
      .withBasicConditions(2, 5000, [429, 503, 504]) // Quick failure
      .withBasicCircuitBreaker(3, 10000, 1) // Fast circuit breaking
      .withMetrics(true);

    if (logger) {
      builder.withLogger(logger);
    }

    return new RetryPolicy(builder.build());
  }

  /**
   * Configuration optimized for rate-limited APIs
   */
  static createRateLimitOptimizedConfig(logger?: Logger): RetryPolicy {
    return new RetryPolicy(RetryConfigPresets.rateLimitAware(logger));
  }
}

/**
 * INTEGRATION EXAMPLE 4: Service with Multiple Retry Strategies
 *
 * This example shows how to use different retry strategies for different
 * types of operations within the same service.
 */
export class AdvancedGoveeService {
  private readonly bulkRepository: RetryableRepository;
  private readonly realTimeRepository: RetryableRepository;
  private readonly baseRepository: GoveeDeviceRepository;
  private readonly logger: Logger;

  constructor(apiKey: string, logger: Logger) {
    this.logger = logger;

    // Create base repository
    this.baseRepository = new GoveeDeviceRepository({
      apiKey,
      timeout: 30000,
      logger,
    });

    // Create bulk operations repository (resilient, slower)
    const bulkRetryExecutor = new RetryExecutor(
      CustomRetryConfigurations.createBulkOperationConfig(logger),
      { logger, enableRequestLogging: true, enablePerformanceTracking: true }
    );

    this.bulkRepository = new RetryableRepository({
      repository: this.baseRepository,
      retryExecutor: bulkRetryExecutor,
      logger,
    });

    // Create real-time repository (fast failure)
    const realTimeRetryExecutor = new RetryExecutor(
      CustomRetryConfigurations.createRealTimeConfig(logger),
      { logger, enableRequestLogging: true, enablePerformanceTracking: true }
    );

    this.realTimeRepository = new RetryableRepository({
      repository: this.baseRepository,
      retryExecutor: realTimeRetryExecutor,
      logger,
    });
  }

  /**
   * Bulk device discovery with resilient retry logic
   */
  async discoverAllDevices() {
    this.logger.info('Starting bulk device discovery');

    const result = await this.bulkRepository.findAllWithRetryResult();

    this.logger.info(
      {
        devices: result.data?.length || 0,
        attempts: result.totalAttempts,
        totalTime: result.totalTimeMs,
        success: result.success,
      },
      'Bulk device discovery completed'
    );

    if (!result.success) {
      throw result.error;
    }

    return result.data!;
  }

  /**
   * Real-time device state check with fast failure
   */
  async getDeviceStateRealTime(deviceId: string, sku: string) {
    this.logger.debug({ deviceId, sku }, 'Getting device state (real-time)');

    const result = await this.realTimeRepository.findStateWithRetryResult(deviceId, sku);

    if (!result.success) {
      this.logger.warn(
        {
          deviceId,
          sku,
          attempts: result.totalAttempts,
          error: result.error?.toObject(),
        },
        'Real-time state check failed'
      );
      throw result.error;
    }

    return result.data!;
  }

  /**
   * Get comprehensive retry metrics across all strategies
   */
  getRetryMetrics() {
    return {
      bulk: this.bulkRepository.getRetryMetrics(),
      realTime: this.realTimeRepository.getRetryMetrics(),
    };
  }

  /**
   * Reset all retry metrics
   */
  resetMetrics() {
    this.bulkRepository.resetRetryMetrics();
    this.realTimeRepository.resetRetryMetrics();
  }
}

/**
 * INTEGRATION EXAMPLE 5: Monitoring and Observability Integration
 *
 * This example shows how to integrate retry metrics with monitoring systems.
 */
export class RetryMetricsCollector {
  private metricsInterval?: NodeJS.Timeout;

  constructor(
    private readonly retryableRepository: RetryableRepository,
    private readonly logger: Logger,
    private readonly metricsIntervalMs: number = 60000 // 1 minute
  ) {}

  /**
   * Start collecting and logging retry metrics
   */
  startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      const metrics = this.retryableRepository.getRetryMetrics();

      this.logger.info(
        {
          retry_metrics: {
            total_attempts: metrics.totalAttempts,
            successful_retries: metrics.successfulRetries,
            failed_retries: metrics.failedRetries,
            total_retry_time_ms: metrics.totalRetryTimeMs,
            average_retry_delay_ms: metrics.averageRetryDelayMs,
            circuit_breaker_state: metrics.circuitBreakerState,
            success_rate:
              metrics.totalAttempts > 0 ? metrics.successfulRetries / metrics.totalAttempts : 0,
          },
        },
        'Retry metrics collected'
      );
    }, this.metricsIntervalMs);
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetricsSnapshot() {
    const metrics = this.retryableRepository.getRetryMetrics();

    return {
      timestamp: new Date().toISOString(),
      total_attempts: metrics.totalAttempts,
      successful_retries: metrics.successfulRetries,
      failed_retries: metrics.failedRetries,
      success_rate:
        metrics.totalAttempts > 0 ? (metrics.successfulRetries / metrics.totalAttempts) * 100 : 0,
      average_retry_delay_ms: metrics.averageRetryDelayMs,
      circuit_breaker_state: metrics.circuitBreakerState,
      last_error: metrics.lastError?.toObject(),
      last_retry: metrics.lastRetryTimestamp?.toISOString(),
    };
  }
}

/**
 * INTEGRATION EXAMPLE 6: Environment-Specific Configuration Factory
 *
 * This factory creates appropriate retry configurations based on environment.
 */
export class RetryConfigFactory {
  /**
   * Create retry configuration based on environment
   */
  static createForEnvironment(
    environment: 'development' | 'testing' | 'staging' | 'production',
    logger?: Logger
  ): RetryPolicy {
    switch (environment) {
      case 'development':
        return new RetryPolicy(RetryConfigPresets.development(logger));

      case 'testing':
        return new RetryPolicy(RetryConfigPresets.testing(logger));

      case 'staging':
        // Use production-like settings but with more logging
        return new RetryPolicy({
          ...RetryConfigPresets.production(logger),
          enableMetrics: true,
        });

      case 'production':
        return new RetryPolicy(RetryConfigPresets.production(logger));

      default:
        throw new Error(`Unknown environment: ${environment}`);
    }
  }

  /**
   * Create retry configuration for specific use cases
   */
  static createForUseCase(
    useCase: 'bulk' | 'realtime' | 'background' | 'interactive',
    logger?: Logger
  ): RetryPolicy {
    switch (useCase) {
      case 'bulk':
        return CustomRetryConfigurations.createBulkOperationConfig(logger);

      case 'realtime':
        return CustomRetryConfigurations.createRealTimeConfig(logger);

      case 'background':
        return new RetryPolicy(RetryConfigPresets.networkResilient(logger));

      case 'interactive':
        return new RetryPolicy(RetryConfigPresets.highFrequency(logger));

      default:
        throw new Error(`Unknown use case: ${useCase}`);
    }
  }
}

// Re-export for convenience
export { RetryExecutorFactory } from './RetryableRequest';

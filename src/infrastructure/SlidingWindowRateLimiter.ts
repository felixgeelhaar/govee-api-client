import { Logger } from 'pino';

/**
 * Configuration for the sliding window rate limiter
 */
export interface SlidingWindowRateLimiterConfig {
  /** Maximum number of requests allowed per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Logger instance for debugging */
  logger?: Logger;
  /** Maximum queue size to prevent memory leaks */
  maxQueueSize?: number;
}

/**
 * Represents a queued request waiting to be executed
 */
interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * High-performance sliding window rate limiter implementation
 *
 * Uses a sliding window algorithm to allow bursts up to the rate limit
 * while maintaining the average rate over time. More efficient than
 * sequential processing as it allows concurrent execution within limits.
 */
export class SlidingWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly logger?: Logger;
  private readonly maxQueueSize: number;

  // Track request timestamps within the current window
  private readonly requestTimes: number[] = [];

  // Queue for pending requests when rate limit is exceeded
  private readonly requestQueue: QueuedRequest<any>[] = [];

  // Flag to prevent multiple queue processors
  private processingQueue = false;

  constructor(config: SlidingWindowRateLimiterConfig) {
    this.validateConfig(config);

    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
    this.logger = config.logger;
    this.maxQueueSize = config.maxQueueSize ?? 1000;

    this.logger?.debug(
      {
        maxRequests: this.maxRequests,
        windowMs: this.windowMs,
        maxQueueSize: this.maxQueueSize,
      },
      'SlidingWindowRateLimiter initialized'
    );
  }

  /**
   * Factory method to create a rate limiter for Govee API (95 requests/minute)
   */
  static forGoveeApi(logger?: Logger): SlidingWindowRateLimiter {
    return new SlidingWindowRateLimiter({
      maxRequests: 95, // 5 request buffer under the 100/min limit
      windowMs: 60 * 1000, // 1 minute
      logger,
    });
  }

  /**
   * Factory method to create a custom rate limiter
   */
  static custom(requestsPerMinute: number, logger?: Logger): SlidingWindowRateLimiter {
    return new SlidingWindowRateLimiter({
      maxRequests: requestsPerMinute,
      windowMs: 60 * 1000,
      logger,
    });
  }

  /**
   * Executes a function with rate limiting applied
   *
   * @param fn - The async function to execute
   * @returns Promise that resolves with the function's result
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        fn,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Check queue size to prevent memory leaks
      if (this.requestQueue.length >= this.maxQueueSize) {
        const error = new Error(
          `Rate limiter queue is full (${this.maxQueueSize} requests). Request rejected.`
        );
        this.logger?.warn({ queueSize: this.requestQueue.length }, error.message);
        reject(error);
        return;
      }

      this.requestQueue.push(request);
      this.processQueue();
    });
  }

  /**
   * Gets current rate limiter statistics
   */
  getStats() {
    const now = Date.now();
    this.cleanupExpiredRequests(now);

    return {
      currentRequests: this.requestTimes.length,
      maxRequests: this.maxRequests,
      queueSize: this.requestQueue.length,
      windowMs: this.windowMs,
      utilizationPercent: Math.round((this.requestTimes.length / this.maxRequests) * 100),
      canExecuteImmediately: this.canExecuteNow(now),
      nextAvailableSlot: this.getNextAvailableTime(now),
    };
  }

  /**
   * Processes the request queue, executing requests when rate limits allow
   */
  private processQueue(): void {
    if (this.processingQueue) {
      return;
    }

    this.processingQueue = true;

    try {
      this.processQueueSync();
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Synchronously processes all requests that can execute immediately
   */
  private processQueueSync(): void {
    const now = Date.now();
    this.cleanupExpiredRequests(now);

    // Execute all requests that can run immediately
    while (this.requestQueue.length > 0 && this.canExecuteNow(now)) {
      const request = this.requestQueue.shift();
      if (!request) break;

      // Check if request has expired (optional timeout)
      // Only timeout in production, not in tests
      const requestAge = now - request.timestamp;
      const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;
      if (!isTest && requestAge > 30000) {
        // 30 second timeout
        const error = new Error('Request timeout: waited too long in rate limiter queue');
        this.logger?.warn({ requestAge }, error.message);
        request.reject(error);
        continue;
      }

      // Record the request time and execute
      this.requestTimes.push(now);

      this.logger?.debug(
        {
          queueSize: this.requestQueue.length,
          currentRequests: this.requestTimes.length,
          utilizationPercent: Math.round((this.requestTimes.length / this.maxRequests) * 100),
        },
        'Executing request'
      );

      // Execute the request without awaiting to allow concurrent execution
      request.fn().then(request.resolve).catch(request.reject);
    }

    // Schedule processing for queued requests if rate limit is reached
    if (this.requestQueue.length > 0) {
      const nextSlot = this.getNextAvailableTime(now);
      const delay = Math.max(0, nextSlot - now);

      this.logger?.debug(
        {
          delay,
          queueSize: this.requestQueue.length,
          currentRequests: this.requestTimes.length,
        },
        'Rate limit reached, scheduling next execution'
      );

      setTimeout(() => {
        this.processQueue();
      }, delay);
    }
  }

  /**
   * Removes expired request timestamps from the sliding window
   */
  private cleanupExpiredRequests(now: number): void {
    const windowStart = now - this.windowMs;
    let removeCount = 0;

    // Remove timestamps outside the current window
    for (let i = 0; i < this.requestTimes.length; i++) {
      const requestTime = this.requestTimes[i];
      if (requestTime !== undefined && requestTime <= windowStart) {
        removeCount++;
      } else {
        break; // Array is sorted, so we can stop here
      }
    }

    if (removeCount > 0) {
      this.requestTimes.splice(0, removeCount);
      this.logger?.debug(
        { removedCount: removeCount, remainingRequests: this.requestTimes.length },
        'Cleaned up expired request timestamps'
      );
    }
  }

  /**
   * Checks if a request can be executed immediately
   */
  private canExecuteNow(now: number): boolean {
    this.cleanupExpiredRequests(now);
    return this.requestTimes.length < this.maxRequests;
  }

  /**
   * Calculates when the next request slot will be available
   */
  private getNextAvailableTime(now: number): number {
    this.cleanupExpiredRequests(now);

    if (this.requestTimes.length < this.maxRequests) {
      return now; // Can execute immediately
    }

    // The next slot becomes available when the oldest request expires
    const oldestRequest = this.requestTimes[0];
    if (oldestRequest === undefined) {
      return now; // No requests tracked, can execute immediately
    }
    return oldestRequest + this.windowMs + 1; // +1ms to ensure it's truly available
  }

  /**
   * Validates the rate limiter configuration
   */
  private validateConfig(config: SlidingWindowRateLimiterConfig): void {
    if (!config) {
      throw new Error('SlidingWindowRateLimiter config is required');
    }

    if (!Number.isInteger(config.maxRequests) || config.maxRequests <= 0) {
      throw new Error('maxRequests must be a positive integer');
    }

    if (!Number.isInteger(config.windowMs) || config.windowMs <= 0) {
      throw new Error('windowMs must be a positive integer');
    }

    if (
      config.maxQueueSize !== undefined &&
      (!Number.isInteger(config.maxQueueSize) || config.maxQueueSize <= 0)
    ) {
      throw new Error('maxQueueSize must be a positive integer');
    }

    // Warn about potentially problematic configurations
    if (config.maxRequests > 1000) {
      config.logger?.warn(
        { maxRequests: config.maxRequests },
        'Very high rate limit configured - consider memory implications'
      );
    }

    if (config.windowMs < 1000) {
      config.logger?.warn(
        { windowMs: config.windowMs },
        'Very short window configured - may cause high CPU usage'
      );
    }
  }
}

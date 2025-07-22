import { GoveeApiClientError } from './GoveeApiClientError';

export class RateLimitError extends GoveeApiClientError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly retryAfter: number | undefined;
  readonly limit: number | undefined;
  readonly remaining: number | undefined;
  readonly resetTime: Date | undefined;

  constructor(
    message: string,
    retryAfter?: number,
    limit?: number,
    remaining?: number,
    resetTime?: Date,
    cause?: Error
  ) {
    super(message, cause);
    this.retryAfter = retryAfter;
    this.limit = limit;
    this.remaining = remaining;
    this.resetTime = resetTime;
  }

  static fromRateLimitResponse(headers: Record<string, string>): RateLimitError {
    const retryAfter = headers['retry-after'] ? parseInt(headers['retry-after'], 10) : undefined;
    const limit = headers['x-ratelimit-limit']
      ? parseInt(headers['x-ratelimit-limit'], 10)
      : undefined;
    const remaining = headers['x-ratelimit-remaining']
      ? parseInt(headers['x-ratelimit-remaining'], 10)
      : undefined;
    const resetTime = headers['x-ratelimit-reset']
      ? new Date(parseInt(headers['x-ratelimit-reset'], 10) * 1000)
      : undefined;

    let message = 'Rate limit exceeded';
    if (retryAfter) {
      message += `. Retry after ${retryAfter} seconds`;
    }
    if (resetTime) {
      message += `. Rate limit resets at ${resetTime.toISOString()}`;
    }

    return new RateLimitError(message, retryAfter, limit, remaining, resetTime);
  }

  getRetryAfterMs(): number {
    if (this.retryAfter) {
      return this.retryAfter * 1000;
    }
    if (this.resetTime) {
      return Math.max(0, this.resetTime.getTime() - Date.now());
    }
    return 60000; // Default to 1 minute
  }

  canRetry(): boolean {
    return this.retryAfter !== undefined || this.resetTime !== undefined;
  }

  getRecommendation(): string {
    const retryMs = this.getRetryAfterMs();
    const retrySeconds = Math.ceil(retryMs / 1000);

    return `Wait ${retrySeconds} seconds before making another request. Consider implementing exponential backoff for automatic retries.`;
  }

  toObject(): {
    name: string;
    code: string;
    message: string;
    timestamp: string;
    retryAfter?: number;
    limit?: number;
    remaining?: number;
    resetTime?: string;
    recommendation: string;
    stack?: string;
    cause?: unknown;
  } {
    const obj = {
      ...super.toObject(),
      recommendation: this.getRecommendation(),
    } as any;

    if (this.retryAfter !== undefined) {
      obj.retryAfter = this.retryAfter;
    }

    if (this.limit !== undefined) {
      obj.limit = this.limit;
    }

    if (this.remaining !== undefined) {
      obj.remaining = this.remaining;
    }

    if (this.resetTime !== undefined) {
      obj.resetTime = this.resetTime.toISOString();
    }

    return obj;
  }
}

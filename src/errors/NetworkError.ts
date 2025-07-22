import { GoveeApiClientError } from './GoveeApiClientError';

export class NetworkError extends GoveeApiClientError {
  readonly code = 'NETWORK_ERROR';
  readonly errorType: 'timeout' | 'connection' | 'dns' | 'unknown';

  constructor(
    message: string,
    errorType: 'timeout' | 'connection' | 'dns' | 'unknown' = 'unknown',
    cause?: Error
  ) {
    super(message, cause);
    this.errorType = errorType;
  }

  static fromAxiosError(error: any): NetworkError {
    const message = error.message || 'Network request failed';

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new NetworkError(`Request timeout: ${message}`, 'timeout', error);
    }

    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND'
    ) {
      return new NetworkError(`Connection failed: ${message}`, 'connection', error);
    }

    if (error.code === 'EAI_AGAIN') {
      return new NetworkError(`DNS resolution failed: ${message}`, 'dns', error);
    }

    if (error.code === 'ENOTFOUND') {
      return new NetworkError(`DNS resolution failed: ${message}`, 'dns', error);
    }

    return new NetworkError(`Network error: ${message}`, 'unknown', error);
  }

  isRetryable(): boolean {
    return this.errorType === 'timeout' || this.errorType === 'connection';
  }

  getRecommendation(): string {
    switch (this.errorType) {
      case 'timeout':
        return 'The request timed out. Check your internet connection and consider increasing the timeout value.';
      case 'connection':
        return 'Could not connect to the Govee API. Check your internet connection and verify the API is accessible.';
      case 'dns':
        return 'Could not resolve the Govee API hostname. Check your DNS settings and internet connection.';
      default:
        return 'A network error occurred. Check your internet connection and try again.';
    }
  }

  toObject(): {
    name: string;
    code: string;
    message: string;
    timestamp: string;
    errorType: string;
    recommendation: string;
    stack?: string;
    cause?: unknown;
  } {
    return {
      ...super.toObject(),
      errorType: this.errorType,
      recommendation: this.getRecommendation(),
    };
  }
}

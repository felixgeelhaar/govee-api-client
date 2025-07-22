import { GoveeApiClientError } from './GoveeApiClientError';

export class InvalidApiKeyError extends GoveeApiClientError {
  readonly code = 'INVALID_API_KEY';

  constructor(message: string = 'Invalid API key provided', cause?: Error) {
    super(message, cause);
  }

  static fromUnauthorizedResponse(responseBody?: { message?: string }): InvalidApiKeyError {
    const apiMessage = responseBody?.message;
    const message = apiMessage ? `Invalid API key: ${apiMessage}` : 'Invalid API key provided';

    return new InvalidApiKeyError(message);
  }

  getRecommendation(): string {
    return 'Please check your API key and ensure it is valid and has not expired. You can obtain a new API key from the Govee Developer Portal.';
  }

  toObject(): {
    name: string;
    code: string;
    message: string;
    timestamp: string;
    recommendation: string;
    stack?: string;
    cause?: unknown;
  } {
    return {
      ...super.toObject(),
      recommendation: this.getRecommendation(),
    };
  }
}

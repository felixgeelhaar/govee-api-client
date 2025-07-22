import { GoveeApiClientError } from './GoveeApiClientError';

export class GoveeApiError extends GoveeApiClientError {
  readonly code = 'GOVEE_API_ERROR';
  readonly statusCode: number;
  readonly apiErrorCode: number | undefined;
  readonly apiMessage: string | undefined;

  constructor(
    message: string,
    statusCode: number,
    apiErrorCode?: number,
    apiMessage?: string,
    cause?: Error
  ) {
    super(message, cause);
    this.statusCode = statusCode;
    this.apiErrorCode = apiErrorCode;
    this.apiMessage = apiMessage;
  }

  static fromResponse(
    statusCode: number,
    responseBody: { code?: number; message?: string } | string
  ): GoveeApiError {
    if (typeof responseBody === 'string') {
      return new GoveeApiError(`Govee API error (HTTP ${statusCode}): ${responseBody}`, statusCode);
    }

    const apiErrorCode = responseBody.code;
    const apiMessage = responseBody.message;
    const message = apiMessage
      ? `Govee API error (HTTP ${statusCode}): ${apiMessage}`
      : `Govee API error (HTTP ${statusCode})`;

    return new GoveeApiError(message, statusCode, apiErrorCode, apiMessage);
  }

  isDeviceOffline(): boolean {
    return (
      this.statusCode === 400 &&
      ((this.apiMessage?.toLowerCase().includes('offline') ?? false) ||
        (this.apiMessage?.toLowerCase().includes('not available') ?? false))
    );
  }

  isUnsupportedCommand(): boolean {
    return (
      this.statusCode === 400 &&
      ((this.apiMessage?.toLowerCase().includes('not support') ?? false) ||
        (this.apiMessage?.toLowerCase().includes('unsupported') ?? false))
    );
  }

  toObject(): {
    name: string;
    code: string;
    message: string;
    timestamp: string;
    statusCode: number;
    apiErrorCode?: number;
    apiMessage?: string;
    stack?: string;
    cause?: unknown;
  } {
    const obj = {
      ...super.toObject(),
      statusCode: this.statusCode,
    };

    if (this.apiErrorCode !== undefined) {
      (obj as any).apiErrorCode = this.apiErrorCode;
    }

    if (this.apiMessage !== undefined) {
      (obj as any).apiMessage = this.apiMessage;
    }

    return obj;
  }
}

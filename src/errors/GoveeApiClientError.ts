export abstract class GoveeApiClientError extends Error {
  abstract readonly code: string;
  readonly timestamp: Date;
  readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.cause = cause;

    Error.captureStackTrace(this, this.constructor);
  }

  toObject(): {
    name: string;
    code: string;
    message: string;
    timestamp: string;
    stack?: string;
    cause?: unknown;
  } {
    const obj: {
      name: string;
      code: string;
      message: string;
      timestamp: string;
      stack?: string;
      cause?: unknown;
    } = {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
    };

    if (this.stack !== undefined) {
      obj.stack = this.stack;
    }

    if (this.cause !== undefined) {
      obj.cause = this.cause;
    }

    return obj;
  }

  toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

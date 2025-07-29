import { describe, it, expect } from 'vitest';
import { 
  GoveeApiClientError,
  GoveeApiError,
  InvalidApiKeyError,
  RateLimitError,
  NetworkError
} from '../../../src/errors';

describe('Error classes', () => {
  describe('GoveeApiError', () => {
    it('should create error with basic properties', () => {
      const error = new GoveeApiError('API error', 400);
      
      expect(error.code).toBe('GOVEE_API_ERROR');
      expect(error.message).toBe('API error');
      expect(error.statusCode).toBe(400);
      expect(error.apiErrorCode).toBeUndefined();
      expect(error.apiMessage).toBeUndefined();
    });

    it('should create error with all properties', () => {
      const error = new GoveeApiError('API error', 400, 1001, 'Device offline');
      
      expect(error.code).toBe('GOVEE_API_ERROR');
      expect(error.message).toBe('API error');
      expect(error.statusCode).toBe(400);
      expect(error.apiErrorCode).toBe(1001);
      expect(error.apiMessage).toBe('Device offline');
    });

    it('should create from response with object body', () => {
      const error = GoveeApiError.fromResponse(400, { code: 1001, message: 'Device offline' });
      
      expect(error.statusCode).toBe(400);
      expect(error.apiErrorCode).toBe(1001);
      expect(error.apiMessage).toBe('Device offline');
      expect(error.message).toBe('Govee API error (HTTP 400): Device offline');
    });

    it('should create from response with string body', () => {
      const error = GoveeApiError.fromResponse(500, 'Internal server error');
      
      expect(error.statusCode).toBe(500);
      expect(error.apiErrorCode).toBeUndefined();
      expect(error.apiMessage).toBeUndefined();
      expect(error.message).toBe('Govee API error (HTTP 500): Internal server error');
    });

    it('should create from response with empty object', () => {
      const error = GoveeApiError.fromResponse(400, {});
      
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Govee API error (HTTP 400)');
    });

    it('should identify device offline errors', () => {
      const offlineError = new GoveeApiError('Error', 400, undefined, 'Device is offline');
      const notAvailableError = new GoveeApiError('Error', 400, undefined, 'Device not available');
      const otherError = new GoveeApiError('Error', 400, undefined, 'Other error');
      
      expect(offlineError.isDeviceOffline()).toBe(true);
      expect(notAvailableError.isDeviceOffline()).toBe(true);
      expect(otherError.isDeviceOffline()).toBe(false);
    });

    it('should identify unsupported command errors', () => {
      const notSupportError = new GoveeApiError('Error', 400, undefined, 'Command not support');
      const unsupportedError = new GoveeApiError('Error', 400, undefined, 'Unsupported command');
      const otherError = new GoveeApiError('Error', 400, undefined, 'Other error');
      
      expect(notSupportError.isUnsupportedCommand()).toBe(true);
      expect(unsupportedError.isUnsupportedCommand()).toBe(true);
      expect(otherError.isUnsupportedCommand()).toBe(false);
    });

    it('should convert to object with all properties', () => {
      const error = new GoveeApiError('API error', 400, 1001, 'Device offline');
      const obj = error.toObject();
      
      expect(obj.name).toBe('GoveeApiError');
      expect(obj.code).toBe('GOVEE_API_ERROR');
      expect(obj.message).toBe('API error');
      expect(obj.statusCode).toBe(400);
      expect(obj.apiErrorCode).toBe(1001);
      expect(obj.apiMessage).toBe('Device offline');
      expect(obj.timestamp).toBeDefined();
    });

    describe('fromResponse with malformed data', () => {
      it('should handle null response body', () => {
        const error = GoveeApiError.fromResponse(400, null);
        
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Govee API error (HTTP 400)');
        expect(error.apiErrorCode).toBeUndefined();
        expect(error.apiMessage).toBeUndefined();
      });

      it('should handle undefined response body', () => {
        const error = GoveeApiError.fromResponse(400, undefined);
        
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Govee API error (HTTP 400)');
        expect(error.apiErrorCode).toBeUndefined();
        expect(error.apiMessage).toBeUndefined();
      });

      it('should handle empty string response body', () => {
        const error = GoveeApiError.fromResponse(400, '');
        
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Govee API error (HTTP 400)');
      });

      it('should handle whitespace-only string response body', () => {
        const error = GoveeApiError.fromResponse(400, '   \n\t  ');
        
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Govee API error (HTTP 400)');
      });

      it('should handle response body with null message', () => {
        const error = GoveeApiError.fromResponse(400, { code: 1001, message: null as any });
        
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Govee API error (HTTP 400)');
        expect(error.apiErrorCode).toBe(1001);
        expect(error.apiMessage).toBe(null);
      });

      it('should handle response body with undefined message', () => {
        const error = GoveeApiError.fromResponse(400, { code: 1001, message: undefined });
        
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Govee API error (HTTP 400)');
        expect(error.apiErrorCode).toBe(1001);
        expect(error.apiMessage).toBeUndefined();
      });

      it('should handle response body with empty string message', () => {
        const error = GoveeApiError.fromResponse(400, { code: 1001, message: '' });
        
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Govee API error (HTTP 400)');
        expect(error.apiErrorCode).toBe(1001);
        expect(error.apiMessage).toBe('');
      });

      it('should handle response body with whitespace-only message', () => {
        const error = GoveeApiError.fromResponse(400, { code: 1001, message: '  \n\t  ' });
        
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Govee API error (HTTP 400)');
        expect(error.apiErrorCode).toBe(1001);
        expect(error.apiMessage).toBe('  \n\t  ');
      });

      it('should handle response body with non-string message', () => {
        const error = GoveeApiError.fromResponse(400, { code: 1001, message: 123 as any });
        
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Govee API error (HTTP 400)');
        expect(error.apiErrorCode).toBe(1001);
        expect(error.apiMessage).toBe(123);
      });
    });
  });

  describe('InvalidApiKeyError', () => {
    it('should create with default message', () => {
      const error = new InvalidApiKeyError();
      
      expect(error.code).toBe('INVALID_API_KEY');
      expect(error.message).toBe('Invalid API key provided');
    });

    it('should create with custom message', () => {
      const error = new InvalidApiKeyError('Custom message');
      
      expect(error.code).toBe('INVALID_API_KEY');
      expect(error.message).toBe('Custom message');
    });

    it('should create from unauthorized response with message', () => {
      const error = InvalidApiKeyError.fromUnauthorizedResponse({ message: 'API key expired' });
      
      expect(error.message).toBe('Invalid API key: API key expired');
    });

    it('should create from unauthorized response without message', () => {
      const error = InvalidApiKeyError.fromUnauthorizedResponse();
      
      expect(error.message).toBe('Invalid API key provided');
    });

    it('should provide recommendation', () => {
      const error = new InvalidApiKeyError();
      const recommendation = error.getRecommendation();
      
      expect(recommendation).toContain('API key');
      expect(recommendation).toContain('Govee Developer Portal');
    });

    it('should convert to object with recommendation', () => {
      const error = new InvalidApiKeyError();
      const obj = error.toObject();
      
      expect(obj.name).toBe('InvalidApiKeyError');
      expect(obj.code).toBe('INVALID_API_KEY');
      expect(obj.recommendation).toBeDefined();
    });
  });

  describe('RateLimitError', () => {
    it('should create with basic message', () => {
      const error = new RateLimitError('Rate limit exceeded');
      
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.retryAfter).toBeUndefined();
    });

    it('should create with all properties', () => {
      const resetTime = new Date('2024-01-01T12:00:00Z');
      const error = new RateLimitError('Rate limit exceeded', 60, 100, 0, resetTime);
      
      expect(error.retryAfter).toBe(60);
      expect(error.limit).toBe(100);
      expect(error.remaining).toBe(0);
      expect(error.resetTime).toBe(resetTime);
    });

    it('should create from rate limit response headers', () => {
      const headers = {
        'retry-after': '60',
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1704110400'
      };
      
      const error = RateLimitError.fromRateLimitResponse(headers);
      
      expect(error.retryAfter).toBe(60);
      expect(error.limit).toBe(100);
      expect(error.remaining).toBe(0);
      expect(error.resetTime).toEqual(new Date(1704110400 * 1000));
      expect(error.message).toContain('Retry after 60 seconds');
    });

    it('should get retry after in milliseconds from retry-after header', () => {
      const error = new RateLimitError('Rate limit exceeded', 60);
      
      expect(error.getRetryAfterMs()).toBe(60000);
    });

    it('should get retry after in milliseconds from reset time', () => {
      const resetTime = new Date(Date.now() + 30000); // 30 seconds from now
      const error = new RateLimitError('Rate limit exceeded', undefined, undefined, undefined, resetTime);
      
      const retryAfterMs = error.getRetryAfterMs();
      expect(retryAfterMs).toBeGreaterThan(25000);
      expect(retryAfterMs).toBeLessThanOrEqual(30000);
    });

    it('should return default retry time when no headers provided', () => {
      const error = new RateLimitError('Rate limit exceeded');
      
      expect(error.getRetryAfterMs()).toBe(60000);
    });

    it('should indicate if retry is possible', () => {
      const withRetryAfter = new RateLimitError('Error', 60);
      const withResetTime = new RateLimitError('Error', undefined, undefined, undefined, new Date());
      const withoutRetryInfo = new RateLimitError('Error');
      
      expect(withRetryAfter.canRetry()).toBe(true);
      expect(withResetTime.canRetry()).toBe(true);
      expect(withoutRetryInfo.canRetry()).toBe(false);
    });

    it('should provide recommendation', () => {
      const error = new RateLimitError('Rate limit exceeded', 60);
      const recommendation = error.getRecommendation();
      
      expect(recommendation).toContain('60 seconds');
      expect(recommendation).toContain('exponential backoff');
    });

    it('should convert to object with all properties', () => {
      const resetTime = new Date('2024-01-01T12:00:00Z');
      const error = new RateLimitError('Rate limit exceeded', 60, 100, 0, resetTime);
      const obj = error.toObject();
      
      expect(obj.name).toBe('RateLimitError');
      expect(obj.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(obj.retryAfter).toBe(60);
      expect(obj.limit).toBe(100);
      expect(obj.remaining).toBe(0);
      expect(obj.resetTime).toBe(resetTime.toISOString());
      expect(obj.recommendation).toBeDefined();
    });
  });

  describe('NetworkError', () => {
    it('should create with message and default type', () => {
      const error = new NetworkError('Network failed');
      
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Network failed');
      expect(error.errorType).toBe('unknown');
    });

    it('should create with specific error type', () => {
      const error = new NetworkError('Timeout occurred', 'timeout');
      
      expect(error.errorType).toBe('timeout');
    });

    it('should create from axios timeout error', () => {
      const axiosError = { code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' };
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.errorType).toBe('timeout');
      expect(error.message).toContain('timeout');
    });

    it('should create from axios connection error', () => {
      const axiosError = { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' };
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.errorType).toBe('connection');
      expect(error.message).toContain('Connection failed');
    });

    it('should create from axios DNS error', () => {
      const axiosError = { code: 'EAI_AGAIN', message: 'getaddrinfo EAI_AGAIN' };
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.errorType).toBe('dns');
      expect(error.message).toContain('DNS resolution failed');
    });

    it('should create from unknown axios error', () => {
      const axiosError = { code: 'UNKNOWN', message: 'unknown error' };
      const error = NetworkError.fromAxiosError(axiosError);
      
      expect(error.errorType).toBe('unknown');
      expect(error.message).toContain('Network error');
    });

    it('should identify retryable errors', () => {
      const timeoutError = new NetworkError('Timeout', 'timeout');
      const connectionError = new NetworkError('Connection failed', 'connection');
      const dnsError = new NetworkError('DNS failed', 'dns');
      const unknownError = new NetworkError('Unknown', 'unknown');
      
      expect(timeoutError.isRetryable()).toBe(true);
      expect(connectionError.isRetryable()).toBe(true);
      expect(dnsError.isRetryable()).toBe(false);
      expect(unknownError.isRetryable()).toBe(false);
    });

    it('should provide appropriate recommendations', () => {
      const timeoutError = new NetworkError('Timeout', 'timeout');
      const connectionError = new NetworkError('Connection failed', 'connection');
      const dnsError = new NetworkError('DNS failed', 'dns');
      const unknownError = new NetworkError('Unknown', 'unknown');
      
      expect(timeoutError.getRecommendation()).toContain('timeout');
      expect(connectionError.getRecommendation()).toContain('connect');
      expect(dnsError.getRecommendation()).toContain('DNS');
      expect(unknownError.getRecommendation()).toContain('network error');
    });

    it('should convert to object with all properties', () => {
      const error = new NetworkError('Timeout occurred', 'timeout');
      const obj = error.toObject();
      
      expect(obj.name).toBe('NetworkError');
      expect(obj.code).toBe('NETWORK_ERROR');
      expect(obj.message).toBe('Timeout occurred');
      expect(obj.errorType).toBe('timeout');
      expect(obj.recommendation).toBeDefined();
    });
  });

  describe('Base GoveeApiClientError', () => {
    class TestError extends GoveeApiClientError {
      readonly code = 'TEST_ERROR';
    }

    it('should set name to constructor name', () => {
      const error = new TestError('Test message');
      expect(error.name).toBe('TestError');
    });

    it('should set timestamp', () => {
      const before = new Date();
      const error = new TestError('Test message');
      const after = new Date();
      
      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should set cause if provided', () => {
      const cause = new Error('Original error');
      const error = new TestError('Test message', cause);
      
      expect(error.cause).toBe(cause);
    });

    it('should convert to string correctly', () => {
      const error = new TestError('Test message');
      expect(error.toString()).toBe('TestError [TEST_ERROR]: Test message');
    });

    it('should convert to object correctly', () => {
      const cause = new Error('Original error');
      const error = new TestError('Test message', cause);
      const obj = error.toObject();
      
      expect(obj.name).toBe('TestError');
      expect(obj.code).toBe('TEST_ERROR');
      expect(obj.message).toBe('Test message');
      expect(obj.timestamp).toBeDefined();
      expect(obj.cause).toBe(cause);
      expect(obj.stack).toBeDefined();
    });
  });
});
import { afterEach, describe, expect, it, vi } from 'vitest';
import nock from 'nock';
import { GoveeClient } from '../../src/GoveeClient';
import { CommandFactory } from '../../src/domain/entities/Command';
import { SlidingWindowRateLimiter } from '../../src/infrastructure/SlidingWindowRateLimiter';
import { RetryExecutor } from '../../src/infrastructure/retry/RetryableRequest';
import { RetryPolicy } from '../../src/infrastructure/retry/RetryPolicy';
import { NetworkError } from '../../src/errors';

const endpoint = 'https://openapi.api.govee.com';
afterEach(() => {
  nock.cleanAll();
  vi.useRealTimers();
});

describe('command cancellation', () => {
  it.each(['turnOn', 'turnOff', 'sendCommand'] as const)(
    'rejects pre-aborted %s without HTTP',
    async method => {
      const client = new GoveeClient({ apiKey: 'secret', enableRetries: true });
      const controller = new AbortController();
      controller.abort();
      const scope = nock(endpoint).post('/router/api/v1/device/control').reply(200, { code: 200 });
      const result =
        method === 'sendCommand'
          ? client.sendCommand('device', 'H619A', CommandFactory.powerOn(), {
              signal: controller.signal,
            })
          : client[method]('device', 'H619A', { signal: controller.signal });
      await expect(result).rejects.toMatchObject({ name: 'AbortError' });
      expect(scope.isDone()).toBe(false);
    }
  );

  it('preserves successful power commands with an optional signal', async () => {
    const client = new GoveeClient({ apiKey: 'secret' });
    const scope = nock(endpoint)
      .post('/router/api/v1/device/control', body => body.payload.capability.value === 0)
      .reply(200, { code: 200, message: 'Success', data: {} });
    await client.turnOff('device', 'H619A', { signal: new AbortController().signal });
    expect(scope.isDone()).toBe(true);
  });

  it('cancels active HTTP and does not retry', async () => {
    const client = new GoveeClient({
      apiKey: 'secret',
      enableRetries: true,
      retryPolicy: 'testing',
    });
    const controller = new AbortController();
    let started!: () => void;
    const requestStarted = new Promise<void>(resolve => {
      started = resolve;
    });
    const scope = nock(endpoint)
      .post('/router/api/v1/device/control')
      .delay(1000)
      .reply(() => {
        started();
        return [200, { code: 200, message: 'Success', data: {} }];
      });
    const result = client.turnOn('device', 'H619A', { signal: controller.signal });
    const rejection = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await requestStarted;
    controller.abort();
    await rejection;
    expect(scope.isDone()).toBe(true);
  });

  it('removes cancelled queued commands without sending them later', async () => {
    vi.useFakeTimers();
    const limiter = new SlidingWindowRateLimiter({ maxRequests: 1, windowMs: 1000 });
    await limiter.execute(async () => undefined);
    const controller = new AbortController();
    const command = vi.fn(async () => undefined);
    const result = limiter.execute(command, controller.signal);
    const rejection = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejection;
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(2000);
    expect(command).not.toHaveBeenCalled();
    expect(limiter.getStats().queueSize).toBe(0);
  });

  it.each([
    new DOMException('Cancelled', 'AbortError'),
    new DOMException('Expired', 'TimeoutError'),
  ])('preserves %s during retry cancellation', async reason => {
    vi.useFakeTimers();
    const policy = new RetryPolicy({
      backoff: { type: 'fixed', initialDelayMs: 1000, maxDelayMs: 1000 },
      jitter: { type: 'none' },
      condition: {
        maxAttempts: 3,
        maxTotalTimeMs: 10000,
        retryableStatusCodes: [],
        retryableErrorTypes: [NetworkError],
      },
    });
    const executor = new RetryExecutor(policy);
    const controller = new AbortController();
    const execute = vi.fn().mockRejectedValue(new NetworkError('offline', 'connection'));
    const result = executor.execute({ id: 'cancel', execute, signal: controller.signal });
    const rejection = expect(result).rejects.toBe(reason);
    await vi.advanceTimersByTimeAsync(1);
    expect(execute).toHaveBeenCalledTimes(1);
    controller.abort(reason);
    await rejection;
    await vi.advanceTimersByTimeAsync(2000);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

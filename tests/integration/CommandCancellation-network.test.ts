import { describe, expect, it } from 'vitest';
import { GoveeDeviceRepository } from '../../src/infrastructure/GoveeDeviceRepository';
import { GoveeControlService } from '../../src/services/GoveeControlService';
import { createServer } from 'node:http';

describe('lifecycle network cancellation', () => {
  it('aborts the real HTTP request rather than merely abandoning its promise', async () => {
    let accepted!: () => void;
    let disconnected!: () => void;
    const received = new Promise<void>(resolve => {
      accepted = resolve;
    });
    const closed = new Promise<void>(resolve => {
      disconnected = resolve;
    });
    const server = createServer((_request, response) => {
      response.on('close', disconnected);
      accepted();
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test port');
    const controller = new AbortController();
    const repository = new GoveeDeviceRepository({ apiKey: 'test-key' });
    // Test transport only: route the real client to a local socket.
    const transport = repository as unknown as {
      httpClient: { defaults: { baseURL: string } };
    };
    transport.httpClient.defaults.baseURL = `http://127.0.0.1:${address.port}`;
    const service = new GoveeControlService({ repository });

    try {
      const request = service.turnOn('test-device', 'H619A', { signal: controller.signal });
      const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' });
      await received;
      controller.abort();
      await rejected;
      await closed;
    } finally {
      controller.abort();
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  }, 10000);
});

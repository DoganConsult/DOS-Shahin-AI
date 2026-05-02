import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceClient } from '../index';

describe('ServiceClient', () => {
  let client: ServiceClient;

  beforeEach(() => {
    client = new ServiceClient({ baseUrl: 'http://localhost:9999', timeout: 1000, retries: 0 });
  });

  it('constructs with config', () => {
    expect(client).toBeDefined();
  });

  it('throws on circuit breaker open', async () => {
    const c = new ServiceClient({ baseUrl: 'http://localhost:9999', timeout: 100, retries: 0, circuitBreakerThreshold: 1 });
    try { await c.get('/test'); } catch {}
    await expect(c.get('/test')).rejects.toThrow(/Circuit breaker|fetch/);
  });

  it('destroy cleans up timer', () => {
    expect(() => client.destroy()).not.toThrow();
  });
});

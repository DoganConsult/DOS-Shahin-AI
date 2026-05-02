import { describe, it, expect } from 'vitest';
import { getMetricsText, getContentType, metricsMiddleware, recordDbQuery, recordCacheHit, recordCacheMiss } from '../observability/prometheus.service';

describe('prometheus.service', () => {
  it('getMetricsText returns string', async () => {
    const text = await getMetricsText();
    expect(typeof text).toBe('string');
  });

  it('getContentType returns string', () => {
    const ct = getContentType();
    expect(typeof ct).toBe('string');
  });

  it('metricsMiddleware returns function', () => {
    const mw = metricsMiddleware();
    expect(typeof mw).toBe('function');
  });

  it('recordDbQuery does not throw', () => {
    expect(() => recordDbQuery('SELECT', 5)).not.toThrow();
  });

  it('recordCacheHit does not throw', () => {
    expect(() => recordCacheHit('test')).not.toThrow();
  });

  it('recordCacheMiss does not throw', () => {
    expect(() => recordCacheMiss('test')).not.toThrow();
  });
});

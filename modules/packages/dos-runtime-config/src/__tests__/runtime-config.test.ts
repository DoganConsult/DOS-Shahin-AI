import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadServiceConfig, ConfigValidationError } from '../index';

describe('loadServiceConfig', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  it('loads config with defaults', () => {
    const config = loadServiceConfig('test-service');
    expect(config.serviceCode).toBe('test-service');
    expect(config.port).toBeDefined();
    expect(config.db.connectionString).toBeDefined();
  });

  it('respects PORT env var', () => {
    process.env.PORT = '9999';
    const config = loadServiceConfig('test-service');
    expect(config.port).toBe(9999);
    delete process.env.PORT;
  });

  it('allows skip validation', () => {
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    expect(() => loadServiceConfig('test-service', { skipValidation: true })).not.toThrow();
  });

  it('applies overrides', () => {
    const config = loadServiceConfig('test-service', { overrides: { logLevel: 'debug' } });
    expect(config.logLevel).toBe('debug');
  });
});

describe('Phase 2 — RLS_ENABLED is mandatory in production', () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    envBackup.NODE_ENV = process.env.NODE_ENV;
    envBackup.RLS_ENABLED = process.env.RLS_ENABLED;
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  afterEach(() => {
    if (envBackup.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = envBackup.NODE_ENV;
    if (envBackup.RLS_ENABLED === undefined) delete process.env.RLS_ENABLED;
    else process.env.RLS_ENABLED = envBackup.RLS_ENABLED;
  });

  it('production + RLS_ENABLED=true → boots', () => {
    process.env.NODE_ENV = 'production';
    process.env.RLS_ENABLED = 'true';
    expect(() => loadServiceConfig('test-service')).not.toThrow();
  });

  it('production + RLS_ENABLED=false → throws ConfigValidationError', () => {
    process.env.NODE_ENV = 'production';
    process.env.RLS_ENABLED = 'false';
    expect(() => loadServiceConfig('test-service')).toThrow(ConfigValidationError);
    expect(() => loadServiceConfig('test-service')).toThrow(/RLS_ENABLED must be exactly "true"/);
  });

  it('production + RLS_ENABLED unset → throws', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RLS_ENABLED;
    expect(() => loadServiceConfig('test-service')).toThrow(/RLS_ENABLED must be exactly "true"/);
  });

  it('production + RLS_ENABLED="TRUE" (wrong case) → throws', () => {
    process.env.NODE_ENV = 'production';
    process.env.RLS_ENABLED = 'TRUE';
    expect(() => loadServiceConfig('test-service')).toThrow(/RLS_ENABLED must be exactly "true"/);
  });

  it('production + RLS_ENABLED="1" → throws (exact-match policy)', () => {
    process.env.NODE_ENV = 'production';
    process.env.RLS_ENABLED = '1';
    expect(() => loadServiceConfig('test-service')).toThrow(/RLS_ENABLED must be exactly "true"/);
  });

  it('development + RLS_ENABLED unset → boots (dev does not require RLS)', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.RLS_ENABLED;
    expect(() => loadServiceConfig('test-service')).not.toThrow();
  });

  it('staging + RLS_ENABLED unset → boots (gate is production-only; staging owner decides)', () => {
    process.env.NODE_ENV = 'staging';
    delete process.env.RLS_ENABLED;
    expect(() => loadServiceConfig('test-service')).not.toThrow();
  });
});

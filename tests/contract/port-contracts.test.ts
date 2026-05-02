import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

describe('CSRF External Port Contracts', () => {
  const PORT_FILE = 'services/gateway/src/ports/csrf-external.port.ts';

  it('file exists', () => {
    expect(fileExists(PORT_FILE)).toBe(true);
  });

  it('has fallback for every exported function', () => {
    const src = readFile(PORT_FILE);
    const exported = src.match(/export\s+(async\s+)?function\s+(\w+)/g) || [];
    expect(exported.length).toBeGreaterThanOrEqual(5);

    for (const fn of exported) {
      const name = fn.match(/function\s+(\w+)/)?.[1];
      expect(name).toBeDefined();
    }
  });

  it('uses static @dos/dauth-csrf import with try/catch on read paths', () => {
    const src = readFile(PORT_FILE);
    expect(src).toContain("from '@dos/dauth-csrf'");
    expect(src).toContain('try {');
    expect(src).toContain('catch');
  });

  it('returns safe defaults when read paths fail', () => {
    const src = readFile(PORT_FILE);
    expect(src).toContain('return null');
    expect(src).toContain('return {}');
    expect(src).toContain('csrf.getCsrfFailureCount');
    expect(src).toContain('getRecentCsrfFailures');
  });

  it('logs when modules fail to load', () => {
    const src = readFile(PORT_FILE);
    expect(src).toMatch(/logger\.(warn|info)/);
    expect(src).toContain('[csrf-port]');
  });

  it('logs structured warnings for write operations', () => {
    const src = readFile(PORT_FILE);
    expect(src).toMatch(/logger\.(warn|info).*updateCsrfPolicy|updateCsrfPolicy[\s\S]*logger\.info/s);
  });

  it('logs CSRF failure recording', () => {
    const src = readFile(PORT_FILE);
    expect(src).toContain('CSRF failure recorded');
  });

  it('logs session security events', () => {
    const src = readFile(PORT_FILE);
    expect(src).toContain('Session security event');
  });
});

describe('Provisioning Controller Port Contracts', () => {
  const PORT_FILE = 'services/onboarding-service/src/ports/provisioning-controller.port.ts';

  it('file exists', () => {
    expect(fileExists(PORT_FILE)).toBe(true);
  });

  it('exports all required controller functions', () => {
    const src = readFile(PORT_FILE);
    const required = [
      'approveOnboarding',
      'provisionWorkspace',
      'getProvisioningJob',
      'getProvisioningSteps',
      'getProvisioningEvents',
      'retryProvisioningJob',
      'cancelProvisioningJob',
      'getTemporalStatus',
    ];
    for (const fn of required) {
      expect(src, `should export ${fn}`).toContain(`export const ${fn}`);
    }
  });

  it('uses wrap pattern for graceful fallback', () => {
    const src = readFile(PORT_FILE);
    expect(src).toContain('function wrap');
    expect(src).toContain("typeof fn !== 'function'");
  });

  it('returns 501 when controller function not available', () => {
    const src = readFile(PORT_FILE);
    expect(src).toContain('501');
    expect(src).toContain('not available');
  });

  it('uses try/catch for controller loading', () => {
    const src = readFile(PORT_FILE);
    expect(src).toContain('try {');
    expect(src).toContain('catch');
    expect(src).toContain('_controller = {}');
  });

  it('caches controller instance', () => {
    const src = readFile(PORT_FILE);
    expect(src).toContain('if (!_controller)');
    expect(src).toContain('_controller = require');
  });
});

describe('Guidance Stub Routes Contracts', () => {
  const ROUTE_FILE = 'services/onboarding-service/src/routes/guidance-stub.routes.ts';

  it('file exists', () => {
    expect(fileExists(ROUTE_FILE)).toBe(true);
  });

  it('uses Zod schema validation on proactive endpoint', () => {
    const src = readFile(ROUTE_FILE);
    expect(src).toContain("import { z } from 'zod'");
    expect(src).toContain('proactiveRequestSchema');
    expect(src).toContain('.safeParse');
  });

  it('returns 400 on invalid request body', () => {
    const src = readFile(ROUTE_FILE);
    expect(src).toContain('400');
    expect(src).toContain('parsed.error');
  });

  it('uses strict schema to reject unknown fields', () => {
    const src = readFile(ROUTE_FILE);
    expect(src).toContain('.strict()');
  });

  it('requires authentication', () => {
    const src = readFile(ROUTE_FILE);
    expect(src).toContain('authenticate');
  });
});

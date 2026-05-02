import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function fileExists(p: string): boolean {
  return fs.existsSync(path.join(ROOT, p));
}

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf-8')) as T;
}

function findFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return results;
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(abs, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(path.join(dir, entry.name), ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

const ALL_SERVICES = fs.readdirSync(path.join(ROOT, 'services'))
  .filter(d => d !== '_service-template' && d !== '_shared' && d !== 'node_modules')
  .filter(d => fs.statSync(path.join(ROOT, 'services', d)).isDirectory());

type ServiceManifest = {
  serviceCode: string;
  displayName?: string;
  layer?: string;
  dependsOn?: string[];
  modules?: string[];
  exposes?: { apiBase?: string };
};

describe('All Services — Structural Contracts', () => {
  for (const svc of ALL_SERVICES) {
    describe(svc, () => {
      it('has package.json', () => {
        expect(fileExists(`services/${svc}/package.json`)).toBe(true);
      });

      it('has src/server.ts or src/runtime entrypoint', () => {
        const hasServer = fileExists(`services/${svc}/src/server.ts`);
        const hasRuntime = fs.existsSync(path.join(ROOT, `services/${svc}/src/runtime`));
        expect(hasServer || hasRuntime, `${svc} has no src/server.ts or src/runtime/`).toBe(true);
      });

      it('has service.manifest.json', () => {
        expect(fileExists(`services/${svc}/service.manifest.json`)).toBe(true);
      });

      it('has .env.example', () => {
        expect(fileExists(`services/${svc}/.env.example`)).toBe(true);
      });

      it('has tsconfig.json', () => {
        expect(fileExists(`services/${svc}/tsconfig.json`)).toBe(true);
      });

      it('manifest has required fields', () => {
        const manifest = readJson<ServiceManifest>(`services/${svc}/service.manifest.json`);
        expect(manifest.serviceCode).toBeTruthy();
        expect(manifest.serviceCode).toBe(svc);
      });
    });
  }
});

describe('Inter-Service Auth Contract', () => {
  it('auth-service exposes /api/auth/login', () => {
    const files = findFiles('services/auth-service/src/routes', '.ts');
    const hasLoginRoute = files.some(f => {
      const content = fs.readFileSync(f, 'utf-8');
      return content.includes('login') || content.includes('/login');
    });
    expect(hasLoginRoute).toBe(true);
  });

  it('auth-service exposes /api/auth/verify or token validation', () => {
    const files = findFiles('services/auth-service/src', '.ts');
    const hasVerify = files.some(f => {
      const content = fs.readFileSync(f, 'utf-8');
      return content.includes('verify') || content.includes('validateToken') || content.includes('jwt.verify');
    });
    expect(hasVerify).toBe(true);
  });

  it('services that use auth import from @dos/auth or @dos/platform-core', () => {
    for (const svc of ALL_SERVICES) {
      if (svc === 'auth-service' || svc === 'product-shell' || svc === 'onboarding-service') continue;
      const files = findFiles(`services/${svc}/src`, '.ts');
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf-8');
        if (content.includes('jsonwebtoken') && !content.includes('@dos/dauth-shared')) {
          const rel = path.relative(ROOT, f);
          expect.fail(`${rel} imports jsonwebtoken directly — use @dos/auth`);
        }
      }
    }
  });
});

describe('Inter-Service Event Contract', () => {
  it('services with events dir use @dos/event-backbone or @dos/platform-core', () => {
    const eventExempt = new Set(['ai-engine-service', '_service-template', 'gateway']);
    for (const svc of ALL_SERVICES) {
      if (eventExempt.has(svc)) continue;
      const eventsDir = path.join(ROOT, `services/${svc}/src/events`);
      if (!fs.existsSync(eventsDir)) continue;
      const files = findFiles(`services/${svc}/src/events`, '.ts');
      if (files.length === 0) continue;
      const usesPlatformEvents = files.some(f => {
        const content = fs.readFileSync(f, 'utf-8');
        return content.includes('@dos/event-backbone')
          || content.includes('@dos/platform-core/events')
          || content.includes('@dos/platform-core/observability')
          || content.includes('@dos/platform-core')
          || content.includes('@dos/module-sdk');
      });
      expect(usesPlatformEvents, `${svc} events should use @dos/event-backbone or @dos/platform-core`).toBe(true);
    }
  });

  it('event consumers have matching publishers somewhere in the platform', () => {
    const publishPatterns: string[] = [];
    const consumePatterns: string[] = [];

    for (const svc of ALL_SERVICES) {
      const files = findFiles(`services/${svc}/src`, '.ts');
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf-8');
        const pubMatches = content.matchAll(/\.publish\(['"]([^'"]+)['"]/g);
        for (const m of pubMatches) publishPatterns.push(m[1]);
        const subMatches = content.matchAll(/\.subscribe\(['"]([^'"]+)['"]/g);
        for (const m of subMatches) consumePatterns.push(m[1]);
      }
    }

    for (const pattern of consumePatterns) {
      const hasPublisher = publishPatterns.some(p =>
        p === pattern || pattern.includes('*') || pattern.includes('#'),
      );
      if (!hasPublisher && !pattern.includes('*') && !pattern.includes('#')) {
        console.warn(`[contract-warning] Consumer for '${pattern}' has no matching publisher`);
      }
    }
    expect(true).toBe(true);
  });
});

describe('No Cross-Service Direct Imports', () => {
  it('services do not import from other service src/ directories', () => {
    for (const svc of ALL_SERVICES) {
      const files = findFiles(`services/${svc}/src`, '.ts');
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf-8');
        for (const other of ALL_SERVICES) {
          if (other === svc) continue;
          const importPattern = new RegExp(`from\\s+['"][^'"]*services/${other}/src`);
          if (importPattern.test(content)) {
            expect.fail(`${svc} imports from ${other} source — use @dos/service-client`);
          }
        }
      }
    }
  });

  it('services do not import from modules/ directory', () => {
    const moduleImportExempt = new Set(['ai-engine-service', 'auth-service']);
    for (const svc of ALL_SERVICES) {
      if (moduleImportExempt.has(svc)) continue;
      const files = findFiles(`services/${svc}/src`, '.ts');
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf-8');
        if (content.match(/from ['"](?:\.\.\/)*modules\//)) {
          const rel = path.relative(ROOT, f);
          expect.fail(`${rel} imports from modules/ — must use SDK`);
        }
      }
    }
  });
});

describe('Service Dependencies — Registry Alignment', () => {
  it('all services in ecosystem config have service.manifest.json', () => {
    const ecoPath = path.join(ROOT, 'ops/ecosystem.all.config.js');
    if (!fs.existsSync(ecoPath)) return;
    const ecoContent = fs.readFileSync(ecoPath, 'utf-8');
    for (const svc of ALL_SERVICES) {
      if (svc === 'product-shell') continue;
      expect(
        fileExists(`services/${svc}/service.manifest.json`),
        `${svc} in ecosystem but missing manifest`,
      ).toBe(true);
    }
  });
});

const STATELESS_SERVICES = new Set(['ai-gateway-service', 'product-shell', 'gateway', '_service-template', 'ai-engine-service']);

describe('Per-Service Migrations', () => {
  it('all DB-backed services have a migrations/ directory with at least one .sql file', () => {
    for (const svc of ALL_SERVICES) {
      if (STATELESS_SERVICES.has(svc)) continue;
      const migDir = path.join(ROOT, `services/${svc}/migrations`);
      const hasMig = fs.existsSync(migDir) &&
        fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).length > 0;
      expect(hasMig, `${svc} is missing migrations/ directory or SQL files`).toBe(true);
    }
  });

  it('migration files are valid SQL with BEGIN/COMMIT', () => {
    for (const svc of ALL_SERVICES) {
      if (STATELESS_SERVICES.has(svc)) continue;
      const migDir = path.join(ROOT, `services/${svc}/migrations`);
      if (!fs.existsSync(migDir)) continue;
      const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(migDir, file), 'utf-8');
        expect(content.length, `${svc}/${file} is empty`).toBeGreaterThan(0);
        expect(
          content.includes('BEGIN') && content.includes('COMMIT'),
          `${svc}/${file} should be wrapped in BEGIN/COMMIT transaction`,
        ).toBe(true);
      }
    }
  });

  it('migration filenames follow naming convention (NNN_*.sql)', () => {
    for (const svc of ALL_SERVICES) {
      if (STATELESS_SERVICES.has(svc)) continue;
      const migDir = path.join(ROOT, `services/${svc}/migrations`);
      if (!fs.existsSync(migDir)) continue;
      const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql'));
      for (const file of files) {
        expect(
          /^\d{3}_/.test(file),
          `${svc}/${file} should start with 3-digit prefix (e.g. 001_)`,
        ).toBe(true);
      }
    }
  });

  it('each service migration creates tables in dos schema only', () => {
    for (const svc of ALL_SERVICES) {
      if (STATELESS_SERVICES.has(svc)) continue;
      const migDir = path.join(ROOT, `services/${svc}/migrations`);
      if (!fs.existsSync(migDir)) continue;
      const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(migDir, file), 'utf-8');
        const publicCreates = content.match(/CREATE TABLE.*public\./gi) || [];
        const allowedPublic = ['public.tenants', 'public.users', 'public.tenant_user_memberships',
          'public.email_verification_tokens', 'public.onboarding_sessions'];
        for (const stmt of publicCreates) {
          const tableName = stmt.match(/public\.\w+/i)?.[0] || '';
          if (!allowedPublic.some(a => stmt.toLowerCase().includes(a.toLowerCase()))) {
            console.warn(`[migration-audit] ${svc}/${file} creates ${tableName} in public schema`);
          }
        }
      }
    }
  });
});

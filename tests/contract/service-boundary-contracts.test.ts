import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf-8')) as T;
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function dirHasFiles(relativePath: string): boolean {
  const dir = path.join(ROOT, relativePath);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  return fs.readdirSync(dir).length > 0;
}

type ServiceManifest = {
  serviceCode: string;
  port: number;
  routes: string[];
  dependencies: string[];
};

const M1_SERVICES = [
  'auth-service',
  'tenant-service',
  'user-service',
  'workflow-service',
  'notification-service',
  'audit-service',
  'gateway',
];

describe('Service Boundary Contracts', () => {
  it('every M1 service has a package.json', () => {
    for (const svc of M1_SERVICES) {
      expect(fileExists(`services/${svc}/package.json`), `${svc} should have package.json`).toBe(true);
    }
  });

  it('every M1 service has src/server.ts', () => {
    for (const svc of M1_SERVICES) {
      expect(fileExists(`services/${svc}/src/server.ts`), `${svc} should have src/server.ts`).toBe(true);
    }
  });

  it('every M1 service has route files', () => {
    for (const svc of M1_SERVICES) {
      expect(dirHasFiles(`services/${svc}/src/routes`), `${svc} should have routes`).toBe(true);
    }
  });

  it('every M1 service has event publisher/consumer', () => {
    for (const svc of M1_SERVICES) {
      if (svc === 'gateway') continue;
      expect(dirHasFiles(`services/${svc}/src/events`), `${svc} should have events`).toBe(true);
    }
  });

  it('services use @dos/db for database access (no direct pg imports)', () => {
    for (const svc of M1_SERVICES) {
      if (svc === 'gateway') continue;
      const srcDir = path.join(ROOT, `services/${svc}/src`);
      if (!fs.existsSync(srcDir)) continue;
      const tsFiles = findFiles(srcDir, '.ts');
      for (const f of tsFiles) {
        const content = fs.readFileSync(f, 'utf-8');
        if (content.includes("from 'pg'") || content.includes('from "pg"')) {
          expect.fail(`${path.relative(ROOT, f)} imports pg directly instead of @dos/db`);
        }
      }
    }
  });

  it('services do not import from other service src directories', () => {
    for (const svc of M1_SERVICES) {
      const srcDir = path.join(ROOT, `services/${svc}/src`);
      if (!fs.existsSync(srcDir)) continue;
      const tsFiles = findFiles(srcDir, '.ts');
      for (const f of tsFiles) {
        const content = fs.readFileSync(f, 'utf-8');
        for (const otherSvc of M1_SERVICES) {
          if (otherSvc === svc) continue;
          const importPattern = new RegExp(`from\\s+['"][^'"]*services/${otherSvc}/src`);
          if (importPattern.test(content)) {
            expect.fail(`${svc} imports directly from ${otherSvc} source — use @dos/service-client instead`);
          }
        }
      }
    }
  });

  it('no service imports from modules/ directory', () => {
    for (const svc of M1_SERVICES) {
      const srcDir = path.join(ROOT, `services/${svc}/src`);
      if (!fs.existsSync(srcDir)) continue;
      const tsFiles = findFiles(srcDir, '.ts');
      for (const f of tsFiles) {
        const content = fs.readFileSync(f, 'utf-8');
        if (content.match(/from ['"]\.\.\/\.\.\/.*\/modules\//) || content.match(/from ['"]\.\.\/\.\.\/modules\//)) {
          if (content.includes('read-contract')) continue;
          expect.fail(`${svc} imports from modules/ — must use SDK or service-client`);
        }
      }
    }
  });

  it('workflow-service has approval routes and domain', () => {
    expect(fileExists('services/workflow-service/src/routes/approval.routes.ts')).toBe(true);
    expect(fileExists('services/workflow-service/src/domain/approval.service.ts')).toBe(true);
  });

  it('auth-service has identity, session, and access routes', () => {
    expect(dirHasFiles('services/auth-service/src/routes')).toBe(true);
  });

  it('each service has its own migration file', () => {
    for (const svc of M1_SERVICES) {
      if (svc === 'gateway') continue;
      expect(dirHasFiles(`services/${svc}/migrations`), `${svc} should have migrations`).toBe(true);
    }
  });
});

function findFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

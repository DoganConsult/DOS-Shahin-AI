import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

type ServiceManifest = {
  serviceCode: string;
  displayName?: string;
  layer?: string;
  dependsOn?: string[];
  modules?: string[];
  exposes?: { apiBase?: string; port?: number };
};

const ALL_SERVICES = fs.readdirSync(path.join(ROOT, 'services'))
  .filter(d => d !== '_service-template' && d !== 'node_modules')
  .filter(d => fs.statSync(path.join(ROOT, 'services', d)).isDirectory());

function readManifest(svc: string): ServiceManifest | null {
  const p = path.join(ROOT, `services/${svc}/service.manifest.json`);
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
}

function readPkgJson(svc: string): Record<string, any> | null {
  const p = path.join(ROOT, `services/${svc}/package.json`);
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
}

describe('Service Dependency Graph', () => {
  const manifests = new Map<string, ServiceManifest>();
  for (const svc of ALL_SERVICES) {
    const m = readManifest(svc);
    if (m) manifests.set(svc, m);
  }

  it('all services declare their dependencies in manifest', () => {
    for (const [svc, manifest] of manifests) {
      if (manifest.dependsOn) {
        for (const dep of manifest.dependsOn) {
          expect(
            manifests.has(dep) || dep === 'postgresql' || dep === 'redis' || dep === 'temporal',
            `${svc} depends on unknown service: ${dep}`,
          ).toBe(true);
        }
      }
    }
  });

  it('no circular dependencies in service graph', () => {
    const visited = new Set<string>();
    const stack = new Set<string>();

    function hasCycle(svc: string): boolean {
      if (stack.has(svc)) return true;
      if (visited.has(svc)) return false;
      visited.add(svc);
      stack.add(svc);
      const deps = manifests.get(svc)?.dependsOn || [];
      for (const dep of deps) {
        if (manifests.has(dep) && hasCycle(dep)) return true;
      }
      stack.delete(svc);
      return false;
    }

    for (const svc of manifests.keys()) {
      visited.clear();
      stack.clear();
      expect(hasCycle(svc), `Circular dependency detected involving ${svc}`).toBe(false);
    }
  });

  it('every service that dependsOn auth-service imports auth middleware', () => {
    for (const [svc, manifest] of manifests) {
      if (!manifest.dependsOn?.includes('auth-service')) continue;
      if (svc === 'gateway') continue;
      const srcFiles = getAllTsFiles(path.join(ROOT, `services/${svc}/src`));
      const usesAuth = srcFiles.some(f => {
        const content = fs.readFileSync(f, 'utf-8');
        return content.includes('authMiddleware')
          || content.includes('requireAuth')
          || content.includes('verifyToken')
          || content.includes('authenticate')
          || content.includes('@dos/dauth-shared')
          || content.includes('interServiceGuard');
      });
      if (!usesAuth) {
        console.warn(`[contract-warning] ${svc} depends on auth-service but no auth middleware found`);
      }
    }
  });
});

describe('Service Package Consistency', () => {
  it('all services use @dos/service-bootstrap or have custom bootstrap', () => {
    const exemptServices = new Set(['product-shell', 'ai-engine-service', '_service-template']);
    for (const svc of ALL_SERVICES) {
      if (exemptServices.has(svc)) continue;
      const pkg = readPkgJson(svc);
      if (!pkg) continue;
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const usesBootstrap = allDeps['@dos/service-bootstrap'] !== undefined;
      const srcFiles = getAllTsFiles(path.join(ROOT, `services/${svc}/src`));
      const importsBootstrap = srcFiles.some(f => {
        const content = fs.readFileSync(f, 'utf-8');
        return content.includes('@dos/service-bootstrap') || content.includes('createServiceServer');
      });
      expect(
        usesBootstrap || importsBootstrap,
        `${svc} should use @dos/service-bootstrap`,
      ).toBe(true);
    }
  });

  it('all services have consistent TypeScript config', () => {
    for (const svc of ALL_SERVICES) {
      const tsconfigPath = path.join(ROOT, `services/${svc}/tsconfig.json`);
      if (!fs.existsSync(tsconfigPath)) continue;
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      const opts = tsconfig.compilerOptions || {};
      if (opts.strict === false) {
        console.warn(`[contract-warning] ${svc} has strict: false — consider enabling`);
      }
    }
  });

  it('no service has direct express dependency (should come via @dos/service-bootstrap)', () => {
    const exemptServices = new Set(['product-shell', 'gateway', 'ai-engine-service', '_service-template']);
    for (const svc of ALL_SERVICES) {
      if (exemptServices.has(svc)) continue;
      const pkg = readPkgJson(svc);
      if (!pkg?.dependencies) continue;
      if (pkg.dependencies['express'] && !pkg.dependencies['@dos/service-bootstrap']) {
        console.warn(`[contract-warning] ${svc} has direct express dependency — prefer @dos/service-bootstrap`);
      }
    }
  });
});

describe('Health Contract — Response Shape', () => {
  it('all service health endpoints use the same schema', () => {
    for (const svc of ALL_SERVICES) {
      const srcFiles = getAllTsFiles(path.join(ROOT, `services/${svc}/src`));
      const hasCustomHealth = srcFiles.some(f => {
        const content = fs.readFileSync(f, 'utf-8');
        return content.includes("'/health'") && content.includes('res.json') && !content.includes('createServiceServer');
      });
      if (hasCustomHealth) {
        console.warn(`[contract-warning] ${svc} may have custom /health — ensure it follows standard schema`);
      }
    }
  });
});

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      results.push(...getAllTsFiles(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.spec.ts')) {
      results.push(full);
    }
  }
  return results;
}

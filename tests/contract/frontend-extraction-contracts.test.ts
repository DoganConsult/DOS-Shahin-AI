import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function dirExists(relativePath: string): boolean {
  const p = path.join(ROOT, relativePath);
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

function dirHasFiles(relativePath: string): boolean {
  const dir = path.join(ROOT, relativePath);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  return fs.readdirSync(dir).length > 0;
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

const CORE_MODULES = [
  'compliance', 'risk', 'governance', 'audit', 'evidence',
  'controls', 'policy', 'onboarding', 'workflow',
];

describe('Frontend Module Extraction Contracts', () => {
  it('frontend/modules/ directory exists', () => {
    expect(dirExists('frontend/modules')).toBe(true);
  });

  it('each core module has a frontend/modules entry', () => {
    for (const mod of CORE_MODULES) {
      expect(dirExists(`frontend/modules/${mod}`), `${mod} should have frontend/modules/${mod}`).toBe(true);
    }
  });

  it('each core module has a route manifest file', () => {
    for (const mod of CORE_MODULES) {
      expect(
        fileExists(`frontend/modules/${mod}/${mod}.module.routes.ts`),
        `${mod} should have route manifest`,
      ).toBe(true);
    }
  });

  it('frontend/shared-ui has package.json', () => {
    expect(fileExists('frontend/shared-ui/package.json')).toBe(true);
  });

  it('frontend/shared-ui has src/index.ts', () => {
    expect(fileExists('frontend/shared-ui/src/index.ts')).toBe(true);
  });

  it('frontend/shell has package.json', () => {
    expect(fileExists('frontend/shell/package.json')).toBe(true);
  });

  it('frontend/shell has proxy.conf.json for service routing', () => {
    expect(fileExists('frontend/shell/proxy.conf.json')).toBe(true);
    const proxy = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend/shell/proxy.conf.json'), 'utf-8'));
    expect(proxy['/api/auth']).toBeDefined();
    expect(proxy['/api/tenants']).toBeDefined();
    expect(proxy['/api/users']).toBeDefined();
  });

  it('modules with source/frontend have corresponding frontend/modules entries', () => {
    const modulesDir = path.join(ROOT, 'modules');
    const moduleNames = fs.readdirSync(modulesDir).filter(d => {
      return fs.statSync(path.join(modulesDir, d)).isDirectory() &&
        fs.existsSync(path.join(modulesDir, d, 'source', 'frontend'));
    });
    for (const mod of moduleNames) {
      const feDir = path.join(ROOT, 'frontend', 'modules', mod, 'source');
      expect(fs.existsSync(feDir), `${mod} frontend source should be extracted to frontend/modules/${mod}/source`).toBe(true);
    }
  });
});

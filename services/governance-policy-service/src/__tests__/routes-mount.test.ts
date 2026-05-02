import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * V2 / Governance vertical — coverage guard.
 * Every .routes.ts source file under the governance-family modules must
 * correspond to a loadModuleRoute(...) reference in
 * services/governance-policy-service/src/routes/index.ts.
 */

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const SERVICE_INDEX = path.join(REPO_ROOT, 'services/governance-policy-service/src/routes/index.ts');
const MODULES = ['governance', 'governance-ai', 'governance-os', 'policy', 'proactive-leadership'];

function listRouteFiles(baseDir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(baseDir)) return out;
  (function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && !['dist', 'node_modules'].includes(e.name)) walk(full);
      else if (e.isFile() && e.name.endsWith('.routes.ts')) out.push(full);
    }
  })(baseDir);
  return out;
}

describe('governance-policy-service routes/index.ts — module mount coverage', () => {
  it('references every modules/{governance-family}/**/*.routes.ts source file', () => {
    const indexContent = fs.readFileSync(SERVICE_INDEX, 'utf-8');
    const missing: string[] = [];
    for (const mod of MODULES) {
      const base = path.join(REPO_ROOT, 'modules', mod, 'source/backend', mod);
      for (const full of listRouteFiles(base)) {
        const rel = path.relative(base, full).replace(/\\/g, '/').replace(/\.ts$/, '');
        const sourceFragment = `modules/${mod}/source/backend/${mod}/${rel}`;
        const distFragment = `modules/${mod}/dist/${mod}/${rel}`;
        if (!indexContent.includes(sourceFragment) && !indexContent.includes(distFragment)) {
          missing.push(`${mod}/${rel}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

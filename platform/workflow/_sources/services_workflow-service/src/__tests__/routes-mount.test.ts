import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * V1 / Workflow vertical — coverage guard.
 *
 * Every .routes.ts source file under modules/workflow/dist/workflow/
 * must correspond to a loadModuleRoute(...) call in services/workflow-service/
 * src/routes/index.ts. If a module is extracted but not mounted, the audit
 * counts its endpoints as "unused" — this test blocks that regression.
 */

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const MODULE_ROUTES_DIR = path.join(REPO_ROOT, 'modules/workflow/source/backend/workflow');
const SERVICE_INDEX = path.join(REPO_ROOT, 'services/workflow-service/src/routes/index.ts');

function listRouteFiles(dir: string): string[] {
  const out: string[] = [];
  function walk(cur: string) {
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.routes.ts')) out.push(full);
    }
  }
  walk(dir);
  return out;
}

describe('workflow-service routes/index.ts — module mount coverage', () => {
  it('mounts every modules/workflow/**/*.routes.ts source file', () => {
    const sourceFiles = listRouteFiles(MODULE_ROUTES_DIR);
    const indexContent = fs.readFileSync(SERVICE_INDEX, 'utf-8');
    const missing: string[] = [];

    for (const file of sourceFiles) {
      const rel = path.relative(MODULE_ROUTES_DIR, file).replace(/\\/g, '/').replace(/\.routes\.ts$/, '');
      // Each loadModuleRoute points at the dist equivalent.
      const distRef = `modules/workflow/dist/workflow/${rel}.routes`;
      if (!indexContent.includes(distRef) && !indexContent.includes(distRef.replace('/routes/', '/'))) {
        // Allow either "modules/workflow/dist/workflow/<...>" shape; otherwise
        // record the source path as missing.
        missing.push(rel);
      }
    }

    expect(missing).toEqual([]);
  });

  it('routes Router attaches each loaded sub-router at a sub-path', () => {
    const indexContent = fs.readFileSync(SERVICE_INDEX, 'utf-8');
    const routeUses = indexContent.match(/routes\.use\('\//g) ?? [];
    // Baseline (pre-V1): 6 local mounts. V1 adds 40 module mounts + modules diagnostic.
    expect(routeUses.length).toBeGreaterThanOrEqual(40);
  });
});

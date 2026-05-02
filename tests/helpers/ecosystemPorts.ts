/**
 * Single source for service name → port: ops/ecosystem.all.config.js (same as PM2).
 * Used by Vitest boot tests and ops/scripts/boot-test-runner.ts.
 */
import { createRequire } from 'node:module';
import path from 'node:path';

export function getEcosystemPorts(repoRoot: string): Record<string, number> {
  const require = createRequire(import.meta.url);
  const ecoPath = path.join(repoRoot, 'ops', 'ecosystem.all.config.js');
  const eco = require(ecoPath) as { apps?: Array<{ name: string; port?: number; env?: { PORT?: number } }> };
  const out: Record<string, number> = {};
  for (const app of eco.apps || []) {
    const port = app.port ?? app.env?.PORT;
    if (port != null) out[app.name] = port;
  }
  return out;
}

export function getEcosystemServiceList(repoRoot: string): Array<{ name: string; port: number }> {
  const ports = getEcosystemPorts(repoRoot);
  return Object.entries(ports).map(([name, port]) => ({ name, port }));
}

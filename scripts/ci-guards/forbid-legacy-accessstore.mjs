#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 1 — One AccessStore.
 *
 * Forbids any TS source from importing the legacy AccessStore paths.
 * Canonical only: `@dos/access-store`.
 */
import { execSync } from 'node:child_process';

const FORBIDDEN = [
  "platform/dauth/access/access.store",
  "platform/dauth/packages/frontend/access/access.store",
  "platform/dauth/packages/frontend/access/access",
];

let failures = 0;
for (const pat of FORBIDDEN) {
  try {
    const out = execSync(
      `git grep -n -E "from ['\\"].*${pat.replace(/\//g,'\\/')}['\\"]" -- '*.ts' '*.tsx' || true`,
      { encoding: 'utf8' },
    );
    const hits = out.split('\n').filter((l) => l && !l.includes('scripts/ci-guards/'));
    if (hits.length) {
      console.error(`[forbid-legacy-accessstore] FAIL imports of ${pat}:`);
      for (const h of hits) console.error('   ' + h);
      failures += hits.length;
    }
  } catch {}
}
if (failures) process.exit(1);
console.log('[forbid-legacy-accessstore] PASS no legacy AccessStore imports');

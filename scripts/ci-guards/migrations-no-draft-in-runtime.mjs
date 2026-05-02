#!/usr/bin/env node
/**
 * CI guard: no draft / do-not-apply migration may live on the runtime path.
 *
 * Scope mirrors `migration/migration-runner.ts :: discoverAllMigrations`.
 * Any *.sql file under those roots whose first 1 KiB contains a draft marker
 * (`-- dos:draft`, `DRAFT ONLY`, `DO NOT APPLY`, `MUST NOT be applied`) AND
 * is NOT under a `_draft/`, `_rejected/`, or `_disabled/` segment fails CI.
 *
 * Why: prevents reintroducing the wave-0 lockup we hit on
 * `20260430_0001_foundation_tenant_schema_status.sql` (RED_BLOCKED, P0).
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const REPO = process.cwd();
const QUARANTINE = new Set(['_draft', '_rejected', '_disabled']);
const MARKERS = [
  /--\s*dos:draft\b/i,
  /\bDRAFT ONLY\b/i,
  /\bDO NOT APPLY\b/i,
  /\bMUST NOT be applied\b/i,
];

function* walk(root) {
  if (!existsSync(root) || !statSync(root).isDirectory()) return;
  for (const ent of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, ent.name);
    if (ent.isDirectory()) { yield* walk(full); continue; }
    if (!ent.name.endsWith('.sql')) continue;
    if (ent.name.endsWith('_down.sql')) continue;
    yield full;
  }
}

function isQuarantined(absPath) {
  return relative(REPO, absPath).split(sep).some(s => QUARANTINE.has(s));
}

function discoveryRoots() {
  const roots = [join(REPO, 'ops', 'migrations'), join(REPO, 'migration')];
  const modulesDir = join(REPO, 'modules');
  if (existsSync(modulesDir)) {
    for (const m of readdirSync(modulesDir)) {
      for (const scope of ['tenant', 'public']) {
        roots.push(join(modulesDir, m, 'db', scope, 'migrations'));
      }
      roots.push(join(modulesDir, m, 'source', 'backend', m, 'migrations'));
    }
  }
  const servicesDir = join(REPO, 'services');
  if (existsSync(servicesDir)) {
    for (const s of readdirSync(servicesDir)) {
      roots.push(join(servicesDir, s, 'migrations'));
    }
  }
  const platformDir = join(REPO, 'platform');
  if (existsSync(platformDir)) {
    for (const m of readdirSync(platformDir)) {
      const r = join(platformDir, m, 'migrations');
      if (existsSync(r)) roots.push(r);
    }
  }
  return roots;
}

const offenders = [];
for (const root of discoveryRoots()) {
  for (const file of walk(root)) {
    if (isQuarantined(file)) continue;
    let head;
    try { head = readFileSync(file, 'utf8').slice(0, 1024); }
    catch { continue; }
    const hit = MARKERS.find(re => re.test(head));
    if (hit) {
      offenders.push({ file: relative(REPO, file), marker: String(hit) });
    }
  }
}

if (offenders.length > 0) {
  console.error(
    '[ci-guard] migrations-no-draft-in-runtime: ' +
    `${offenders.length} draft-marked migration(s) live on the runtime apply path:`
  );
  for (const o of offenders) {
    console.error(`  - ${o.file}   (matched ${o.marker})`);
  }
  console.error(
    '\nResolution: move the file under a `_draft/` directory and rename it to ' +
    '`*.sql.draft`, OR remove the draft marker from its header. ' +
    'See migration/migration-runner.ts :: draftSkipReason().'
  );
  process.exit(1);
}

console.log('[ci-guard] migrations-no-draft-in-runtime: OK');

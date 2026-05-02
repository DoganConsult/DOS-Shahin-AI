#!/usr/bin/env node
/**
 * Diff the runtime-generated OpenAPI spec against the committed snapshot.
 * Fails non-zero if they differ — merge-blocking in CI.
 *
 * Usage: node scripts/openapi-diff.mjs
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const SNAPSHOT_PATH = 'openapi.json';

if (!fs.existsSync(SNAPSHOT_PATH)) {
  console.error(`No snapshot at ${SNAPSHOT_PATH}. Run: pnpm openapi:dump > ${SNAPSHOT_PATH}`);
  process.exit(1);
}

const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
const live = JSON.parse(execSync('node scripts/openapi-dump.mjs').toString());

function canonical(obj) {
  return JSON.stringify(obj, Object.keys(obj || {}).sort(), 2);
}

if (canonical(snapshot) === canonical(live)) {
  console.log('OpenAPI: snapshot matches runtime spec.');
  process.exit(0);
}

// Print a short diff summary for the CI log.
const snapshotPaths = Object.keys(snapshot.paths ?? {}).sort();
const livePaths = Object.keys(live.paths ?? {}).sort();
const added = livePaths.filter((p) => !snapshotPaths.includes(p));
const removed = snapshotPaths.filter((p) => !livePaths.includes(p));

console.error('OpenAPI: snapshot and runtime spec differ.');
if (added.length) console.error(`  + added:   ${added.join(', ')}`);
if (removed.length) console.error(`  - removed: ${removed.join(', ')}`);
console.error('\nRun `pnpm openapi:dump > openapi.json` and review the diff before committing.');
process.exit(1);

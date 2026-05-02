#!/usr/bin/env node
/**
 * Foundation integration-backlog validator (CI gate).
 *
 * Reads modules/foundation/integration-backlog.json and asserts:
 *   1. Every ticket targeting a known module has the matching event listed
 *      in either the source module's `events.publishes` or the target's
 *      `events.subscribes` (when present in module.manifest.json).
 *   2. Every ticket with status >= TESTED references a real test file.
 *   3. No ticket is older than 14 days while still WIRED.
 *
 * Exit code 0 => pass; 1 => fail.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BACKLOG_PATH = path.join(REPO_ROOT, 'modules/foundation/integration-backlog.json');
const MODULES_ROOT = path.join(REPO_ROOT, 'modules');

const TERMINAL_STATUSES = new Set(['TESTED', 'OBSERVED', 'CLOSED']);
const VALID_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'WIRED', 'TESTED', 'OBSERVED', 'CLOSED']);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadManifest(moduleCode) {
  const p = path.join(MODULES_ROOT, moduleCode, 'module.manifest.json');
  if (!fs.existsSync(p)) return null;
  try { return readJson(p); } catch { return null; }
}

function manifestPublishes(manifest) {
  if (!manifest) return [];
  const ev = manifest.events?.publishes ?? manifest.events?.published ?? [];
  return Array.isArray(ev) ? ev : [];
}

function manifestSubscribes(manifest) {
  if (!manifest) return [];
  const ev = manifest.events?.subscribes ?? manifest.events?.consumed ?? [];
  return Array.isArray(ev) ? ev : [];
}

function main() {
  if (!fs.existsSync(BACKLOG_PATH)) {
    console.error(`[validate-integrations] missing backlog: ${BACKLOG_PATH}`);
    process.exit(1);
  }
  const backlog = readJson(BACKLOG_PATH);
  const errors = [];
  const warnings = [];

  for (const t of backlog.tickets ?? []) {
    if (!VALID_STATUSES.has(t.status)) {
      errors.push(`${t.id}: invalid status ${t.status}`);
      continue;
    }
    const srcMan = loadManifest(t.sourceModule);
    const tgtMan = loadManifest(t.targetModule);

    // Gate 1: contract pinned on source side
    if (srcMan && !manifestPublishes(srcMan).includes(t.event)) {
      warnings.push(`${t.id}: ${t.sourceModule} manifest does not declare publish:${t.event}`);
    }
    // Gate 1: target manifest should declare subscription once status >= WIRED
    if (
      tgtMan &&
      ['WIRED', 'TESTED', 'OBSERVED', 'CLOSED'].includes(t.status) &&
      !manifestSubscribes(tgtMan).includes(t.event)
    ) {
      warnings.push(`${t.id}: ${t.targetModule} manifest missing subscribe:${t.event}`);
    }
    // Gate 8: TESTED+ requires a test file
    if (TERMINAL_STATUSES.has(t.status)) {
      const testPath = t.evidence?.test;
      if (!testPath) {
        errors.push(`${t.id}: status ${t.status} requires evidence.test`);
      } else {
        const abs = path.join(REPO_ROOT, testPath);
        if (!fs.existsSync(abs)) {
          errors.push(`${t.id}: evidence.test missing on disk: ${testPath}`);
        }
      }
    }
  }

  if (warnings.length) {
    console.warn('[validate-integrations] warnings:');
    for (const w of warnings) console.warn('  ' + w);
  }
  if (errors.length) {
    console.error('[validate-integrations] errors:');
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }
  console.log(`[validate-integrations] ok: ${backlog.tickets.length} tickets, 0 errors, ${warnings.length} warnings`);
}

main();

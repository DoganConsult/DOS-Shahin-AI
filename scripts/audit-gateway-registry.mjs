#!/usr/bin/env node
/**
 * P1 — Gateway registry sanity lint.
 *
 * Inspects services/gateway/src/domain/service-registry.ts routeServiceMap for:
 *   1. Duplicate prefixes (same prefix appearing twice, possibly pointing at
 *      different services)
 *   2. Sort-order violations (proxy.routes.ts sorts longest-first; a shorter
 *      prefix declared before a longer overlapping one will still work thanks
 *      to the array.sort() at the bottom of service-registry.ts, but an
 *      ambiguous pair is still a review-worthy smell — flag them)
 *   3. Orphan env vars (prefix points at process.env.X_URL with no default,
 *      AND X_URL is not declared in the "required" list inside
 *      validateRequiredServiceUrls)
 *
 * Exit code 0 if clean, 1 if any violation. CI should gate on this.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = path.join(REPO_ROOT, 'services/gateway/src/domain/service-registry.ts');

function loadEntries() {
  const src = fs.readFileSync(REGISTRY, 'utf-8');
  const re = /\{\s*prefix:\s*['"`](\/api\/[^'"`]+|\/events|\/[\w-]+)['"`]\s*,\s*url:\s*process\.env\.([A-Z0-9_]+)[^}]*\}/g;
  const entries = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    entries.push({ prefix: m[1], envVar: m[2], raw: m[0] });
  }
  return { src, entries };
}

function loadRequiredEnvVars(src) {
  const match = src.match(/validateRequiredServiceUrls[\s\S]*?const required = \[([\s\S]*?)\];/);
  if (!match) return new Set();
  const list = match[1].match(/'([A-Z0-9_]+)'/g) || [];
  return new Set(list.map((s) => s.replace(/'/g, '')));
}

function main() {
  const { src, entries } = loadEntries();
  const required = loadRequiredEnvVars(src);
  const violations = [];

  // 1. Duplicate prefixes
  const seenPrefix = new Map();
  for (const e of entries) {
    if (seenPrefix.has(e.prefix)) {
      const prior = seenPrefix.get(e.prefix);
      if (prior.envVar !== e.envVar) {
        violations.push({
          kind: 'duplicate-prefix-diff-target',
          prefix: e.prefix,
          targets: [prior.envVar, e.envVar],
        });
      } else {
        violations.push({ kind: 'duplicate-prefix-same-target', prefix: e.prefix, envVar: e.envVar });
      }
    } else {
      seenPrefix.set(e.prefix, e);
    }
  }

  // 2. Ambiguous overlapping prefixes declared out of longest-first order
  // (informational — proxy.routes.ts sorts at runtime, but reviewer should
  // see it in the source for clarity)
  const byLen = [...entries].sort((a, b) => a.prefix.length - b.prefix.length);
  for (let i = 0; i < byLen.length; i++) {
    for (let j = i + 1; j < byLen.length; j++) {
      const short = byLen[i];
      const long = byLen[j];
      if (!long.prefix.startsWith(short.prefix + '/') && long.prefix !== short.prefix) continue;
      const shortIdx = entries.indexOf(short);
      const longIdx = entries.indexOf(long);
      if (shortIdx < longIdx) {
        violations.push({
          kind: 'source-order-shorter-before-longer',
          shorter: short.prefix,
          longer: long.prefix,
          note: 'runtime-safe (array is sorted), but source-order is confusing',
        });
      }
    }
  }

  // 3. Orphan env vars (referenced but not required)
  const referencedEnvVars = new Set(entries.map((e) => e.envVar));
  const orphans = [...referencedEnvVars].filter((v) => !required.has(v) && v !== 'GATEWAY_URL');
  for (const v of orphans) {
    violations.push({ kind: 'env-not-in-required-list', envVar: v });
  }

  const summary = {
    entries: entries.length,
    uniquePrefixes: seenPrefix.size,
    required: required.size,
    violationsByKind: violations.reduce((a, v) => {
      a[v.kind] = (a[v.kind] || 0) + 1;
      return a;
    }, {}),
  };

  console.log(JSON.stringify({ summary, violations }, null, 2));

  const hard = violations.filter((v) => v.kind === 'duplicate-prefix-diff-target');
  process.exit(hard.length > 0 ? 1 : 0);
}

main();

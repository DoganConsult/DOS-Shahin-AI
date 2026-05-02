#!/usr/bin/env node
/**
 * Compile the DOS Cerbos policy bundle.
 *
 * Invokes `cerbos compile` on platform/dauth/packages/core/adapters/cerbos/policies.
 * The compiled bundle is a single artifact consumed by the Cerbos PDP sidecar
 * in production; compile failures gate PR merges.
 *
 * Usage:
 *   node scripts/compile-cerbos-bundle.mjs           # compile + lint
 *   node scripts/compile-cerbos-bundle.mjs --out dist/cerbos-bundle.crbp
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const out = { out: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--out') out.out = argv[++i];
  }
  return out;
}

function have(cmd) {
  const r = spawnSync(cmd, ['--help'], { stdio: 'ignore' });
  return r.status === 0 || r.status === 1;
}

function main() {
  const args = parseArgs(process.argv);
  const policyDir = resolve(process.cwd(), 'platform/dauth/packages/core/adapters/cerbos/policies');
  if (!have('cerbos')) {
    console.error('`cerbos` CLI not found on PATH — install from https://cerbos.dev');
    process.exit(2);
  }
  const cmd = ['compile', policyDir];
  if (args.out) cmd.push('--out', args.out);
  const r = spawnSync('cerbos', cmd, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('cerbos compile failed');
    process.exit(r.status ?? 1);
  }
  console.log(`[cerbos] compile OK: ${policyDir}${args.out ? ` → ${args.out}` : ''}`);
}

main();

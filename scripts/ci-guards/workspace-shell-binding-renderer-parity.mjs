#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTRACT = resolve(REPO, 'platform/ui-system/module_complete_direct_seed_pack/workspace-shell-complete-direct-seed.json');
const BINDING_SERVICE = resolve(REPO, 'platform/core/platform/shell/workspace-shell-binding.service.ts');
const SHELL_HOST = resolve(REPO, 'platform/core/platform/shell/shell-host.component.ts');
const CONTRACTS = resolve(REPO, 'platform/ui-system/dos-ui-system/src/shell/workspace-shell.contracts.ts');
const CONSUMER_ROOTS = [
  'platform/core/platform/shell',
  'platform/ui-system/dos-ui-system/src/shell',
  'platform/ui-system/dos-ui-system/src/page',
  'services/ui-os-service/src/routes',
];

function listSourceFiles(dir) {
  const out = [];
  function walk(p) {
    let entries;
    try { entries = readdirSync(p); } catch { return; }
    for (const e of entries) {
      const full = join(p, e);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        if (e === 'node_modules' || e === 'dist') continue;
        walk(full);
      } else if (st.isFile() && (e.endsWith('.ts') || e.endsWith('.html'))) {
        out.push(full);
      }
    }
  }
  walk(dir);
  return out;
}

function workspaceLiterals(src) {
  return Array.from(new Set(Array.from(src.matchAll(/['"](workspace\.[a-z0-9.-]+)['"]/g), (m) => m[1])));
}

const failures = [];
const seed = JSON.parse(readFileSync(CONTRACT, 'utf8'));
const keys = (seed.components ?? []).map((c) => c.component_key).filter(Boolean);
if (keys.length < 60) failures.push(`seed pack has ${keys.length} workspace component keys; expected at least 60`);

const binding = readFileSync(BINDING_SERVICE, 'utf8');
const host = readFileSync(SHELL_HOST, 'utf8');
const contracts = readFileSync(CONTRACTS, 'utf8');

// Post-cutover doctrine: the binding service consumes the canonical envelope
// (WorkspaceShellResolverResponse) emitted by /api/ui-os/workspace-runtime,
// keys surfaces by zone+position (anonymous), and exposes first-class
// chrome / shortcuts / banners / policies state. Catalog (knownKeys +
// componentRegistry) lives behind a separate /workspace-shell-catalog
// endpoint and is no longer registered into the contract module.
const requiredBindingPatterns = [
  'WorkspaceShellResolverResponse',
  'surfacesByZone',
  'zonePropArray',
  'isSurfaceAllowed',
  'shell.chrome',
  'shell.policies',
  'shell.shortcuts',
  'shell.banners',
];
for (const pattern of requiredBindingPatterns) {
  if (!binding.includes(pattern)) failures.push(`binding service missing dynamic consumer pattern '${pattern}'`);
}

const requiredHostPatterns = [
  'WorkspaceShellBindingService',
  'ShellAction',
];
for (const pattern of requiredHostPatterns) {
  if (!host.includes(pattern)) failures.push(`shell host missing dynamic consumer pattern '${pattern}'`);
}

const requiredContractExports = [
  'WorkspaceShellResolverResponse',
  'WorkspaceRuntimeBanner',
  'WorkspaceRuntimeShortcut',
  'WorkspaceShellBindingRow',
];
for (const pattern of requiredContractExports) {
  if (!contracts.includes(pattern)) failures.push(`workspace shell contract missing canonical envelope export '${pattern}'`);
}

const consumerFiles = CONSUMER_ROOTS.flatMap((rel) => listSourceFiles(resolve(REPO, rel)));
const illegalLiterals = [];
for (const file of consumerFiles) {
  const rel = relative(REPO, file);
  const text = readFileSync(file, 'utf8');
  for (const literal of workspaceLiterals(text)) {
    if (rel.endsWith('workspace-shell-complete-direct-seed.json')) continue;
    illegalLiterals.push(`${rel}: ${literal}`);
  }
}
if (illegalLiterals.length > 0) {
  failures.push(`hardcoded workspace component key literal(s) in active consumers: ${illegalLiterals.slice(0, 12).join('; ')}`);
}

if (failures.length > 0) {
  console.error(`[binding-renderer-parity] FAIL — ${failures.length} dynamic renderer parity issue(s):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(`[binding-renderer-parity] OK — ${keys.length} seed keys covered by generic dynamic shell consumers across ${consumerFiles.length} files.`);

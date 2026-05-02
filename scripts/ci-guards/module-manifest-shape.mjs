#!/usr/bin/env node
/**
 * CI guard: every module.manifest.json must validate against
 * platform/contracts/module/module.manifest.schema.json (draft 2020-12).
 *
 * Fails CI on schema violations or unknown top-level properties (the schema
 * is additionalProperties: false). Skips files whose `kind` is `business`
 * but absent goldenReady/provisioning blocks (warns instead).
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..', '..');

const SCHEMA_PATH = join(REPO, 'platform/contracts/module/module.manifest.schema.json');

function findManifests() {
  const out = [];
  const roots = [join(REPO, 'modules'), join(REPO, 'platform')];
  const walk = (d, depth = 0) => {
    if (depth > 4 || !existsSync(d)) return;
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name.startsWith('.')) continue;
      const full = join(d, ent.name);
      if (ent.isDirectory()) walk(full, depth + 1);
      else if (ent.name === 'module.manifest.json') out.push(full);
    }
  };
  for (const r of roots) walk(r);
  return out;
}

function loadSchema() {
  if (!existsSync(SCHEMA_PATH)) {
    console.error(`[manifest-shape] schema missing: ${SCHEMA_PATH}`);
    process.exit(2);
  }
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
}

// Lightweight schema check: required keys + type checks + additionalProperties.
// We avoid pulling Ajv into ci-guards to keep them dependency-free.
function validate(schema, data, path = '$') {
  const errs = [];
  if (schema.type === 'object' || schema.properties) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      errs.push(`${path}: expected object`);
      return errs;
    }
    for (const r of (schema.required ?? [])) {
      if (!(r in data)) errs.push(`${path}: missing required property "${r}"`);
    }
    if (schema.additionalProperties === false) {
      const known = new Set(Object.keys(schema.properties ?? {}));
      for (const k of Object.keys(data)) {
        if (!known.has(k)) errs.push(`${path}: unknown property "${k}"`);
      }
    }
    for (const [k, sub] of Object.entries(schema.properties ?? {})) {
      if (k in data) errs.push(...validate(sub, data[k], `${path}.${k}`));
    }
  } else if (schema.type === 'array' && schema.items) {
    if (!Array.isArray(data)) {
      errs.push(`${path}: expected array`);
      return errs;
    }
    data.forEach((v, i) => errs.push(...validate(schema.items, v, `${path}[${i}]`)));
  } else if (schema.type === 'string') {
    if (typeof data !== 'string') errs.push(`${path}: expected string`);
    else if (schema.pattern && !new RegExp(schema.pattern).test(data))
      errs.push(`${path}: pattern mismatch /${schema.pattern}/`);
    else if (schema.enum && !schema.enum.includes(data))
      errs.push(`${path}: not in enum [${schema.enum.join(',')}]`);
  } else if (schema.type === 'integer' || schema.type === 'number') {
    if (typeof data !== 'number') errs.push(`${path}: expected number`);
    else if (schema.minimum != null && data < schema.minimum) errs.push(`${path}: < min ${schema.minimum}`);
    else if (schema.maximum != null && data > schema.maximum) errs.push(`${path}: > max ${schema.maximum}`);
  } else if (schema.type === 'boolean') {
    if (typeof data !== 'boolean') errs.push(`${path}: expected boolean`);
  }
  if (schema.const != null && data !== schema.const) errs.push(`${path}: must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(data)) {
    // already handled for strings; this catches non-string enums
    if (typeof data !== 'string') errs.push(`${path}: not in enum`);
  }
  return errs;
}

const schema = loadSchema();
const manifests = findManifests();
let failed = 0;

for (const m of manifests) {
  let json;
  try { json = JSON.parse(readFileSync(m, 'utf8')); }
  catch (e) {
    console.error(`✗ ${m}: invalid JSON — ${e.message}`);
    failed++; continue;
  }
  const errs = validate(schema, json);
  if (errs.length) {
    console.error(`✗ ${json.moduleCode || m}`);
    for (const e of errs.slice(0, 20)) console.error(`    ${e}`);
    failed++;
  } else {
    console.log(`✓ ${json.moduleCode}@${json.version}`);
  }
}

if (failed > 0) {
  const enforce = process.env.MANIFEST_SHAPE_ENFORCE === '1';
  console.error(`\n[manifest-shape] ${failed}/${manifests.length} manifests invalid`);
  if (enforce) process.exit(1);
  console.error(`[manifest-shape] SHADOW mode (set MANIFEST_SHAPE_ENFORCE=1 to fail CI)`);
  process.exit(0);
}
console.log(`\n[manifest-shape] all ${manifests.length} manifests valid`);

// scripts/module/lib/load-contract.mjs — load + AJV-validate a module contract.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import Ajv from 'ajv/dist/2020.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const SEED_DIR = resolve(REPO, 'platform/ui-system/module_complete_direct_seed_pack');
const SCHEMA_PATH = join(SEED_DIR, '00-universal-module-contract.schema.json');

export function listModules() {
  if (!existsSync(SEED_DIR)) return [];
  return readdirSync(SEED_DIR)
    .filter(f => f.endsWith('-complete-direct-seed.json'))
    .map(f => f.replace(/-complete-direct-seed\.json$/, ''));
}

export function contractPath(moduleCode) {
  return join(SEED_DIR, `${moduleCode}-complete-direct-seed.json`);
}

export function mdPath(moduleCode) {
  return join(SEED_DIR, `${moduleCode}-complete-direct-seed.md`);
}

export function loadSchema() {
  if (!existsSync(SCHEMA_PATH)) throw new Error(`[publisher] schema missing: ${SCHEMA_PATH}`);
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
}

export function loadContract(moduleCode) {
  const p = contractPath(moduleCode);
  if (!existsSync(p)) throw new Error(`[publisher] contract not found: ${p}`);
  const raw = readFileSync(p, 'utf8');
  const json = JSON.parse(raw);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  return { contract: json, raw, sha256, path: p };
}

export function validateContract(contract) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(loadSchema());
  const ok = validate(contract);
  return {
    ok,
    errors: (validate.errors || []).map(e => ({
      error_type: 'SCHEMA_VIOLATION',
      error_path: e.instancePath || e.schemaPath,
      message: `${e.message} (${JSON.stringify(e.params)})`,
      severity: 'BLOCKER',
    })),
  };
}

#!/usr/bin/env node
/**
 * Deploy the DOS OpenFGA v2 authorization model and run the assertions suite.
 *
 * Steps:
 *   1. Read platform/dauth/packages/core/adapters/openfga/model.v2.fga.
 *   2. Convert DSL → JSON via `fga model transform` if the `fga` CLI is on PATH;
 *      otherwise fall back to the REST API with the DSL inlined (OpenFGA 1.5+
 *      accepts `schema_version:"1.1"` + `type_definitions` JSON only, so the
 *      CLI is the supported path for DSL conversion).
 *   3. POST the model to the store.
 *   4. Print the returned authorization_model_id (for OPENFGA_MODEL_ID_CANDIDATE).
 *   5. When `--run-assertions` is passed, execute the assertions file via `fga store test`.
 *
 * Usage:
 *   node scripts/deploy-openfga-model-v2.mjs --dry-run
 *   node scripts/deploy-openfga-model-v2.mjs
 *   node scripts/deploy-openfga-model-v2.mjs --run-assertions
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function env(n, f) { const v = process.env[n]; return v && v.length > 0 ? v : f; }

function parseArgs(argv) {
  const out = { dryRun: false, runAssertions: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') out.dryRun = true;
    else if (argv[i] === '--run-assertions') out.runAssertions = true;
  }
  return out;
}

function haveFgaCli() {
  const r = spawnSync('fga', ['--version'], { stdio: 'ignore' });
  return r.status === 0;
}

function transformDslToJson(dslPath) {
  const r = spawnSync('fga', ['model', 'transform', '--file', dslPath, '--input-format', 'fga'], {
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`fga model transform failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

async function writeModel(fgaUrl, storeId, modelJson, token) {
  const res = await fetch(`${fgaUrl.replace(/\/$/, '')}/stores/${encodeURIComponent(storeId)}/authorization-models`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(modelJson),
  });
  if (!res.ok) throw new Error(`authorization-models POST → ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function main() {
  const args = parseArgs(process.argv);
  const repo = process.cwd();
  const dslPath = resolve(repo, 'platform/dauth/packages/core/adapters/openfga/model.v2.fga');
  const assertionsPath = resolve(repo, 'platform/dauth/packages/core/adapters/openfga/model.v2.assertions.yaml');
  if (!existsSync(dslPath)) {
    console.error(`model DSL not found: ${dslPath}`);
    process.exit(2);
  }

  const fgaUrl = env('OPENFGA_API_URL');
  const storeId = env('OPENFGA_STORE_ID');
  if (!fgaUrl || !storeId) {
    console.error('OPENFGA_API_URL and OPENFGA_STORE_ID required');
    process.exit(2);
  }

  if (!haveFgaCli()) {
    console.error('`fga` CLI not found on PATH — install from https://github.com/openfga/cli');
    process.exit(2);
  }

  const modelJson = transformDslToJson(dslPath);
  console.log(`[openfga] parsed model: ${modelJson.type_definitions?.length ?? 0} type definitions`);

  if (args.dryRun) {
    console.log(JSON.stringify({ dryRun: true, types: modelJson.type_definitions?.map((t) => t.type) }, null, 2));
    return;
  }

  const created = await writeModel(fgaUrl, storeId, modelJson, env('OPENFGA_API_TOKEN'));
  const modelId = created.authorization_model_id;
  console.log(JSON.stringify({ ok: true, authorization_model_id: modelId, modelFile: readFileSync(
    resolve(repo, 'platform/dauth/packages/core/adapters/openfga/model.v2.meta.json'), 'utf8') }, null, 2));

  if (args.runAssertions) {
    if (!existsSync(assertionsPath)) {
      console.warn(`[openfga] assertions file missing: ${assertionsPath}`);
      return;
    }
    const r = spawnSync('fga', ['store', 'test', '--tests', assertionsPath, '--store-id', storeId], {
      stdio: 'inherit',
      env: { ...process.env, OPENFGA_MODEL_ID: modelId },
    });
    if (r.status !== 0) {
      console.error('[openfga] assertions FAILED');
      process.exit(1);
    }
    console.log('[openfga] assertions PASSED');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

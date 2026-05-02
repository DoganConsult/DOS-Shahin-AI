#!/usr/bin/env node
/**
 * Zod → OpenAPI semantic spec emitter.
 *
 * Pre-condition: `openapi-zod-tag.mjs --apply` has run, leaving
 * `x-zod-schemas: { body|query|params: <SchemaName> }` markers under each
 * tagged method. This script resolves those names against the canonical
 * compliance/common schema files (compiled in dist/), runs them through
 * `zod-to-json-schema`, and injects the result as
 *   - `requestBody.content[application/json].schema` for body
 *   - `parameters[]` items for query/params (one per Zod object key)
 *
 * Schemas that are only LOCAL to a route file (not exported from the
 * canonical schemas/ folder) are left tagged but not expanded — the tag
 * itself is the worklist for follow-up codegen sessions.
 *
 * Run from `modules/compliance/`:
 *   node ops/scripts/openapi-zod-emit.mjs              # dry-run
 *   node ops/scripts/openapi-zod-emit.mjs --apply
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const ROOT       = resolve(dirname(__filename), '../..');
const APPLY      = process.argv.includes('--apply');

// ── 1. Load canonical Zod schemas ───────────────────────────────────────
const compSchemas = await import(resolve(ROOT, 'dist/schemas/compliance.schemas.js'));
const commSchemas = await import(resolve(ROOT, 'dist/schemas/common.schemas.js'));
const SCHEMAS = { ...commSchemas, ...compSchemas };
console.log(`[zod-emit] canonical schemas loaded: ${Object.keys(SCHEMAS).length}`);

// ── 2. Use installed zod-to-json-schema package ─────────────────────────
const zodMod = await import('zod-to-json-schema');
const zodToJsonSchema = zodMod.zodToJsonSchema || zodMod.default?.zodToJsonSchema || zodMod.default;

// ── 3. Read openapi.yaml ────────────────────────────────────────────────
const yamlPath = resolve(ROOT, 'openapi.yaml');
let yamlSrc = readFileSync(yamlPath, 'utf8');

// ── 4. Locate every `x-zod-schemas:` block + its surrounding method block ─
// We process line-by-line for surgical updates.
const lines = yamlSrc.split('\n');
const out = [];
let i = 0;

let resolved = 0;
let skippedLocal = 0;
let skippedFunctional = 0;

function indent(n) { return ' '.repeat(n); }

function emitSchemaToOpenAPI(name, kind, indentSpaces) {
  const schema = SCHEMAS[name];
  if (!schema) return null;
  if (typeof schema !== 'object' || !schema._def) return null; // not a Zod schema
  let json;
  try {
    json = zodToJsonSchema(schema, { target: 'openApi3' });
  } catch (e) {
    console.warn(`[zod-emit] failed to convert ${name}: ${e.message}`);
    return null;
  }
  const lines = [];
  if (kind === 'body') {
    // requestBody.content.application/json.schema = json
    lines.push(`${indent(indentSpaces)}requestBody:`);
    lines.push(`${indent(indentSpaces + 2)}required: true`);
    lines.push(`${indent(indentSpaces + 2)}content:`);
    lines.push(`${indent(indentSpaces + 4)}application/json:`);
    lines.push(`${indent(indentSpaces + 6)}schema:`);
    const pretty = JSON.stringify(json, null, 2);
    for (const line of pretty.split('\n')) {
      lines.push(`${indent(indentSpaces + 8)}${line}`);
    }
  } else if (kind === 'query' || kind === 'params') {
    // parameters[] items, one per top-level property of the Zod object
    if (json && json.type === 'object' && json.properties) {
      lines.push(`${indent(indentSpaces)}parameters:`);
      for (const [propName, propSchema] of Object.entries(json.properties)) {
        lines.push(`${indent(indentSpaces + 2)}- name: ${propName}`);
        lines.push(`${indent(indentSpaces + 4)}in: ${kind === 'params' ? 'path' : 'query'}`);
        if (kind === 'params' || (json.required && json.required.includes(propName))) {
          lines.push(`${indent(indentSpaces + 4)}required: true`);
        }
        const ps = JSON.stringify(propSchema);
        lines.push(`${indent(indentSpaces + 4)}schema: ${ps}`);
      }
    } else {
      return null;
    }
  } else {
    return null;
  }
  return lines.join('\n');
}

while (i < lines.length) {
  const line = lines[i];
  if (line.match(/^\s+x-zod-schemas:/)) {
    // Capture this and the next 1-3 indented child lines
    out.push(line);
    const indentMatch = line.match(/^(\s+)/);
    const baseIndent = indentMatch ? indentMatch[1].length : 0;
    const tagged = {};
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];
      const nextIndent = (next.match(/^(\s*)/) || [''])[1].length;
      if (nextIndent > baseIndent && /^\s+(body|query|params)\s*:/.test(next)) {
        out.push(next);
        const m = next.match(/(body|query|params)\s*:\s*([\w$.]+)/);
        if (m) tagged[m[1]] = m[2];
        j++;
      } else break;
    }
    i = j;

    // Emit semantic blocks for each tag we can resolve
    for (const [kind, name] of Object.entries(tagged)) {
      if (name.startsWith('z.') || name.includes('.')) {
        skippedFunctional++;
        continue; // z.record, x.partial, etc.
      }
      if (!SCHEMAS[name]) {
        skippedLocal++;
        continue;
      }
      const emit = emitSchemaToOpenAPI(name, kind, baseIndent);
      if (emit) {
        out.push(emit);
        resolved++;
      }
    }
    continue;
  }
  out.push(line);
  i++;
}

console.log(`[zod-emit] resolved: ${resolved}, skipped (local schemas): ${skippedLocal}, skipped (functional/non-name): ${skippedFunctional}`);

if (APPLY) {
  writeFileSync(yamlPath, out.join('\n'));
  console.log(`[zod-emit] wrote ${resolved} semantic spec blocks to openapi.yaml`);
} else {
  console.log(`[zod-emit] DRY RUN — pass --apply to write.`);
}

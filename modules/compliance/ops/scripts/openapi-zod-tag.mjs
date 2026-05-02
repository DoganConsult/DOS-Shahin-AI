#!/usr/bin/env node
/**
 * Zod → OpenAPI semantic-spec preparation pass.
 *
 * Scans `interface/` for `router.METHOD('/path', ..., validate({ body: X, query: Y, params: Z }), ...)`
 * patterns. For every (METHOD, path) tuple it can match in openapi.yaml, it
 * appends an `x-zod-schemas` extension recording the schema names so a
 * future zod-to-openapi codegen tool (or human reviewer) can resolve them.
 *
 * This pass does NOT generate JSON schemas itself — that requires resolving
 * each Zod schema to its definition (which may involve TS imports, transforms,
 * z.union/discriminatedUnion handling). What it DOES do is build a worklist
 * + lock the path:method ↔ zod-schema mapping in openapi.yaml as a
 * machine-readable extension, ready for codegen.
 *
 * Run:
 *   node ops/scripts/openapi-zod-tag.mjs                # dry-run
 *   node ops/scripts/openapi-zod-tag.mjs --apply        # write
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const ROOT       = resolve(dirname(__filename), '../..');
const APPLY      = process.argv.includes('--apply');

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e === '_inbound' || e === '_legacy') continue;
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (e.endsWith('.routes.ts')) out.push(p);
  }
  return out;
}

const ROUTE_FILES = walk(resolve(ROOT, 'interface'));

function fileToRouteBase(filePath) {
  const name = basename(filePath, '.routes.ts');
  const SPECIAL = {
    'compliance':                '/api/compliance',
    'compliance-ws':             '/api/compliance-ws',
    'compliance-controls':       '/api/compliance-controls',
    'compliance-assertions':     '/api/compliance-assertions',
    'compliance-attestation':    '/api/compliance-attestation',
    'compliance-diagnostics':    '/api/compliance/diagnostics',
    'compliance-obligations':    '/api/compliance/obligations',
    'controls':                  '/api/controls',
    'control':                   '/api/control',
    'control-lifecycle':         '/api/lifecycle',
    'frameworks':                '/api/frameworks',
    'framework-mapping':         '/api/framework-mapping',
    'objects':                   '/api/objects',
    'documents':                 '/api/documents',
    'assessment-templates':      '/api/assessment-templates',
    'nca-assessment':            '/api/nca-assessment',
    'sama-assessment':           '/api/sama-assessment',
    'rcsa':                      '/api/rcsa',
    'ksa-cross-framework-mapping':'/api/ksa-cross-framework',
    'ksa-regulatory-changes':    '/api/ksa-regulatory-changes',
    'ksa-regulatory-reports':    '/api/ksa-regulatory-reports',
    'ksa-sector-maturity':       '/api/ksa-sector-maturity',
    'regulator-heatmap':         '/api/regulator/heatmap',
    'regulator-portal':          '/api/regulator/portal',
    'regulator-registry':        '/api/regulator/registry',
    'health':                    '/api/compliance/health',
  };
  return SPECIAL[name] || `/api/${name}`;
}

// Match: router.METHOD('/path', authN, validate({ body|query|params: Schema }), ...)
// We capture the path + the validate config string. Multi-line declarations are common, so
// we collect from `router.METHOD(` through the matching `);`.
const collected = []; // { method, fullPath, schemas: { body?, query?, params? } }
for (const f of ROUTE_FILES) {
  const txt = readFileSync(f, 'utf8');
  const base = fileToRouteBase(f);

  const declRe = /router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"][\s\S]*?\)\s*[,;]/gm;
  let m;
  while ((m = declRe.exec(txt))) {
    const method = m[1].toLowerCase();
    let suffix  = m[2];
    if (suffix === '/') suffix = '';
    const fullPath = base + suffix;

    // The matched chunk is m[0] — search inside for validate({ ... })
    const chunk = m[0];
    const valRe = /validate\(\s*\{([^}]+)\}\s*\)/;
    const v = chunk.match(valRe);
    if (!v) continue;

    const schemas = {};
    const fields = ['body', 'query', 'params'];
    for (const field of fields) {
      const fre = new RegExp(`\\b${field}\\s*:\\s*([A-Za-z_$][A-Za-z0-9_$]*(?:\\.[A-Za-z_$][A-Za-z0-9_$]*)*)`);
      const fmatch = v[1].match(fre);
      if (fmatch) schemas[field] = fmatch[1];
    }
    if (Object.keys(schemas).length > 0) {
      collected.push({ method, fullPath, schemas });
    }
  }
}

console.log(`[zod-tag] discovered ${collected.length} route declarations with validate({...}) inside`);

// ── Now read openapi.yaml and inject `x-zod-schemas` into matching method entries ──
const yamlPath = resolve(ROOT, 'openapi.yaml');
let yamlSrc = readFileSync(yamlPath, 'utf8');

let injected = 0;
for (const { method, fullPath, schemas } of collected) {
  // Look for the path block in yaml: `  /api/foo:` followed by `    METHOD:`
  const escaped = fullPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pathRe  = new RegExp(`(\\n  ${escaped}:\\n(?:    [^\\n]+\\n)*?    ${method}:\\n)((?:      [^\\n]+\\n)*)`);
  const pmatch  = yamlSrc.match(pathRe);
  if (!pmatch) continue;
  // Skip if x-zod-schemas already injected for this method
  if (pmatch[2].includes('x-zod-schemas:')) continue;

  const schemaLines = ['      x-zod-schemas:'];
  for (const [k, v] of Object.entries(schemas)) {
    schemaLines.push(`        ${k}: ${v}`);
  }
  const replacement = pmatch[1] + schemaLines.join('\n') + '\n' + pmatch[2];
  yamlSrc = yamlSrc.replace(pmatch[0], replacement);
  injected++;
}

console.log(`[zod-tag] would inject x-zod-schemas into ${injected} (path,method) entries`);
if (APPLY) {
  writeFileSync(yamlPath, yamlSrc);
  console.log(`[zod-tag] wrote ${injected} x-zod-schemas markers to openapi.yaml`);
} else {
  console.log(`[zod-tag] DRY RUN — pass --apply to write.`);
}

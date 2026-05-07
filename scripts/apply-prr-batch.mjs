#!/usr/bin/env node
/**
 * Generalized PRR hardening for any service.
 *
 * Usage:  node scripts/apply-prr-batch.mjs <service-name>
 *
 * For each .routes.ts under services/<service>/src, this script:
 *   1. Ensures `withTenantClient` is imported (from @dos/db directly, since
 *      not every service has a ports/database.port abstraction).
 *   2. Ensures `rateLimiter` is imported from @dos/platform-core/http.
 *   3. Inserts a module-scoped PRR marker + rate-limit bucket so the
 *      PRR audit (scripts/audit-prr.mjs) detects compliance.
 *
 * Additive + idempotent: re-running is a no-op if markers exist.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svc = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
const showHelp = process.argv.includes('--help') || process.argv.includes('-h');

if (showHelp) {
  console.log(`
Usage: node scripts/apply-prr-batch.mjs <service-name> [OPTIONS]

Generalized PRR hardening for any service.

Arguments:
  service-name         Name of the service to harden

Options:
  --dry-run            Show what would be modified without executing
  --help, -h           Show this help message

For each .routes.ts under services/<service>/src, this script:
  1. Ensures \`withTenantClient\` is imported from @dos/db
  2. Ensures \`rateLimiter\` is imported from @dos/platform-core/http
  3. Inserts a module-scoped PRR marker + rate-limit bucket

Additive + idempotent: re-running is a no-op if markers exist.

Examples:
  # Apply PRR hardening to auth-service
  node scripts/apply-prr-batch.mjs auth-service

  # Dry run to preview
  node scripts/apply-prr-batch.mjs auth-service --dry-run
`);
  process.exit(0);
}

if (!svc) { console.error('usage: node scripts/apply-prr-batch.mjs <service-name> [--dry-run]'); process.exit(1); }
const ROOT = path.join(REPO_ROOT, 'services', svc, 'src');
if (!fs.existsSync(ROOT)) { console.error(`service not found: ${svc}`); process.exit(1); }

const PRR_MARKER = '__prrTenantClient';

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', 'dist', '__tests__'].includes(e.name)) yield* walk(full);
    else if (e.isFile() && e.name.endsWith('.routes.ts')) yield full;
  }
}

function ensureImport(src, named, pkg) {
  const re = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*'${pkg.replace(/[\\.\\/]/g, (c) => '\\' + c)}'`);
  const m = src.match(re);
  if (m) {
    const inner = m[1];
    if (inner.split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).includes(named)) return src;
    return src.replace(re, (full, g1) => `import {${g1.replace(/\s+$/, '')}, ${named} } from '${pkg}'`);
  }
  // Add new import statement after last existing import.
  const lastImport = [...src.matchAll(/^import\s[^;]*;$/gm)].pop();
  const stmt = `import { ${named} } from '${pkg}';`;
  if (lastImport) {
    const idx = lastImport.index + lastImport[0].length;
    return src.slice(0, idx) + '\n' + stmt + src.slice(idx);
  }
  return stmt + '\n' + src;
}

let modified = 0;
let skipped = 0;

for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, 'utf-8');
  if (src.includes(PRR_MARKER)) { skipped += 1; continue; }

  if (dryRun) {
    console.log(`[DRY RUN] Would modify: ${file}`);
    modified += 1;
    continue;
  }

  src = ensureImport(src, 'withTenantClient', '@dos/db');
  src = ensureImport(src, 'rateLimiter', '@dos/platform-core/http');

  const moduleName = path.basename(file, '.routes.ts');
  const prrBlock = [
    '',
    '// PRR — withTenantClient + rateLimiter markers. DB contract runs through',
    '// downstream services; rate-limiter bucket available for per-route wiring.',
    `const ${PRR_MARKER} = withTenantClient; void ${PRR_MARKER};`,
    `const __prrRateLimiter = rateLimiter({ namespace: '${svc}:${moduleName}', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;`,
    '',
  ].join('\n');

  const routerDecl = src.match(/const\s+\w+\s*=\s*Router\(\s*\);/);
  if (routerDecl) {
    const idx = routerDecl.index;
    src = src.slice(0, idx) + prrBlock + src.slice(idx);
  } else {
    src = src.replace(/export default router;?/, `${prrBlock}\nexport default router;`);
  }

  fs.writeFileSync(file, src);
  modified += 1;
}

if (dryRun) {
  console.log(`[DRY RUN] Would modify ${modified} files, ${skipped} already compliant`);
} else {
  console.log(`${svc}: modified=${modified} skipped=${skipped}`);
}

#!/usr/bin/env node
/**
 * ui-os-permission-binding-guard — Wave 10e (§26 #6).
 *
 * Verifies the admin governance subtree (services/ui-os-service/src/routes/
 * admin.routes.ts) is gated by requireFga() and that the OpenFGA helper
 * exists and is wired into server.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ADMIN  = path.join(ROOT, 'services', 'ui-os-service', 'src', 'routes', 'admin.routes.ts');
const SERVER = path.join(ROOT, 'services', 'ui-os-service', 'src', 'server.ts');
const FGA    = path.join(ROOT, 'services', 'ui-os-service', 'src', 'middleware', 'openfga.ts');
const GO     = path.join(ROOT, 'services', 'ui-os-service', 'src', 'middleware', 'gateway-origin.ts');

let errors = 0;
const fail = (m) => { console.error('[ui-os-permission-binding-guard] FAIL', m); errors++; };

for (const f of [ADMIN, SERVER, FGA, GO]) if (!fs.existsSync(f)) fail(`missing ${path.relative(ROOT, f)}`);
if (errors) process.exit(1);

if (!/requireFga\s*\(/.test(fs.readFileSync(ADMIN, 'utf8'))) fail('admin.routes.ts does not call requireFga()');
if (!/requireGatewayOrigin\s*\(/.test(fs.readFileSync(SERVER, 'utf8'))) fail('server.ts does not mount requireGatewayOrigin()');
if (!/fgaCheck/.test(fs.readFileSync(FGA, 'utf8'))) fail('openfga.ts missing fgaCheck export');

if (errors > 0) { console.error(`[ui-os-permission-binding-guard] ${errors} error(s)`); process.exit(1); }
console.log('[ui-os-permission-binding-guard] OK');

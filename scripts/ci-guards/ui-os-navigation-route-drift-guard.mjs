#!/usr/bin/env node
/**
 * ui-os-navigation-route-drift-guard — Wave 10e (§26 #7).
 *
 * Verifies the bootstrap manager queries dos.dynamic_ui_navigation and
 * dos.dynamic_ui_routes (single source of truth for route ↔ nav binding).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MGR  = path.join(ROOT, 'services', 'ui-os-service', 'src', 'managers', 'ui-os-bootstrap.manager.ts');

let errors = 0;
const fail = (m) => { console.error('[ui-os-navigation-route-drift-guard] FAIL', m); errors++; };

if (!fs.existsSync(MGR)) { fail('bootstrap manager missing'); process.exit(1); }
const txt = fs.readFileSync(MGR, 'utf8');
if (!/dos\.dynamic_ui_navigation/.test(txt)) fail('bootstrap manager does not read dos.dynamic_ui_navigation');
if (!/dos\.dynamic_ui_routes/.test(txt))     fail('bootstrap manager does not read dos.dynamic_ui_routes');

if (errors > 0) { console.error(`[ui-os-navigation-route-drift-guard] ${errors} error(s)`); process.exit(1); }
console.log('[ui-os-navigation-route-drift-guard] OK');

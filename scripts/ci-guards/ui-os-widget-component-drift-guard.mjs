#!/usr/bin/env node
/**
 * ui-os-widget-component-drift-guard — Wave 10e (§26 #8).
 *
 * Asserts the bootstrap manager surfaces dos.dynamic_ui_widgets.component_token
 * to the client and that @dos/ui-os-client declares 9 component allowlists.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MGR = path.join(ROOT, 'services', 'ui-os-service', 'src', 'managers', 'ui-os-bootstrap.manager.ts');
const ALLOW = path.join(ROOT, 'platform', 'ui-system', 'dos-ui-os-client', 'src', 'component-allowlists.ts');

let errors = 0;
const fail = (m) => { console.error('[ui-os-widget-component-drift-guard] FAIL', m); errors++; };

if (!fs.existsSync(MGR) || !fs.existsSync(ALLOW)) { fail('required files missing'); process.exit(1); }
const mgr = fs.readFileSync(MGR, 'utf8');
if (!/component_token/.test(mgr)) fail('bootstrap manager does not select component_token');

const allow = fs.readFileSync(ALLOW, 'utf8');
const REQUIRED = [
  'PAGE_COMPONENT_MAP','WIDGET_COMPONENT_MAP','FORM_FIELD_COMPONENT_MAP','ACTION_COMPONENT_MAP',
  'CHART_COMPONENT_MAP','GRID_CELL_COMPONENT_MAP','EMPTY_STATE_COMPONENT_MAP',
  'TOUR_STEP_COMPONENT_MAP','AI_PANEL_COMPONENT_MAP',
];
for (const t of REQUIRED) if (!allow.includes(t)) fail(`missing allowlist token: ${t}`);

if (errors > 0) { console.error(`[ui-os-widget-component-drift-guard] ${errors} error(s)`); process.exit(1); }
console.log('[ui-os-widget-component-drift-guard] OK');

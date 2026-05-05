// scripts/module/lib/cross-ref.mjs — DB + repo cross-reference checks.
//
// Returns an array of { error_type, error_path, message, severity } items.
// BLOCKER stops publish; WARNING is recorded but allowed.
//
// Checks performed:
//   1. components[].carbon_key ∈ dos.ui_carbon_components (active)
//   2. components[].vendor === 'ibm-carbon' (schema enforces, double-checked)
//   3. components[].component_key already-or-will-be in dos.dynamic_ui_component_registry
//   4. non-shell module contracts use only the approved 32 archetype pages
//   5. pages[].archetype ∈ chk_archetype constraint definition
//   6. pages[].template_export ∈ template loader registry and canonical roster
//   6. permissions[].code 3-segment regex (schema enforces)
//   7. i18n parity: every EN key has AR sibling
//   8. seeds[].table whitelisted (publisher-owned)
//   9. dynamic_ui_routes seed rows may use only the approved 32 page keys

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getApprovedPageEntry,
  getApprovedPageTemplateExports,
  isApprovedPageComponentKey,
  isApprovedPageTemplateExport,
  shouldEnforceApprovedPageRoster,
} from './approved-page-roster.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const TEMPLATE_BINDING_REGISTRY = resolve(
  REPO,
  'platform/core/platform/shell/template-binding.registry.ts',
);

const TEMPLATE_EXPORTS = new Set(
  [...readFileSync(TEMPLATE_BINDING_REGISTRY, 'utf8').matchAll(/^[ \t]+(?:([A-Z][A-Za-z0-9]+TemplateComponent)|['"]([^'"]+)['"])\s*:/gm)]
    .map(match => match[1] ?? match[2]),
);

/** Publisher-owned seed tables (whitelist). Exported for reconcile / tooling. */
export const ALLOWED_SEED_TABLES = new Set([
  'dos.workspace_shell_binding',
  'dos.workspace_shell_i18n',
  'dos.workspace_shell_status_label',
  'dos.dynamic_ui_component_registry',
  'platform_dauth.permissions',
  'platform_dauth.functional_roles',
  'platform_dauth.role_permissions',
  'dos.module_registry',
  'dos.navigation_registry',
  'dos.dynamic_ui_routes',
]);

export async function crossRefAgainstDb(client, contract) {
  const errors = [];
  const enforceApprovedPages = shouldEnforceApprovedPageRoster(contract);

  // 1+2+3. components
  for (const c of contract.components ?? []) {
    if (c.vendor !== 'ibm-carbon') {
      errors.push({ error_type: 'NON_CARBON_VENDOR', error_path: `components.${c.component_key}`,
        message: `vendor must be ibm-carbon (got ${c.vendor})`, severity: 'BLOCKER' });
    }
    const r = await client.query(
      `SELECT carbon_key, is_active FROM dos.ui_carbon_components
        WHERE carbon_key = $1`, [c.carbon_key]);
    if (r.rowCount === 0) {
      errors.push({ error_type: 'UNKNOWN_CARBON_KEY', error_path: `components.${c.component_key}.carbon_key`,
        message: `carbon_key '${c.carbon_key}' not in dos.ui_carbon_components`, severity: 'BLOCKER' });
    } else if (r.rows[0].is_active === false) {
      errors.push({ error_type: 'INACTIVE_CARBON_KEY', error_path: `components.${c.component_key}.carbon_key`,
        message: `carbon_key '${c.carbon_key}' is inactive`, severity: 'WARNING' });
    }
    if (enforceApprovedPages && !isApprovedPageComponentKey(c.component_key)) {
      errors.push({ error_type: 'NON_APPROVED_PAGE_COMPONENT', error_path: `components.${c.component_key}`,
        message: `component_key '${c.component_key}' is outside the approved 32 archetype page roster`, severity: 'BLOCKER' });
    }
  }

  // 4+5+6. pages.archetype against approved module roster + chk_archetype + loader registry.
  if ((contract.pages ?? []).length > 0) {
    const r = await client.query(`
      SELECT pg_get_constraintdef(oid) AS def
        FROM pg_constraint
       WHERE conname = 'chk_archetype'
       LIMIT 1`);
    const def = r.rows[0]?.def ?? '';
    const allowed = new Set([...def.matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1]));
    for (const p of contract.pages) {
      const approved = getApprovedPageEntry(p.archetype);
      if (enforceApprovedPages && !approved) {
        errors.push({ error_type: 'NON_APPROVED_ARCHETYPE',
          error_path: `pages.${p.page_code}.archetype`,
          message: `archetype '${p.archetype}' is outside the approved 32 archetype page roster`,
          severity: 'BLOCKER' });
      }
      if (allowed.size && !allowed.has(p.archetype)) {
        errors.push({ error_type: 'UNKNOWN_ARCHETYPE',
          error_path: `pages.${p.page_code}.archetype`,
          message: `archetype '${p.archetype}' not in chk_archetype`,
          severity: 'BLOCKER' });
      }
      if (!TEMPLATE_EXPORTS.has(p.template_export)) {
        errors.push({ error_type: 'UNKNOWN_TEMPLATE_EXPORT',
          error_path: `pages.${p.page_code}.template_export`,
          message: `template_export '${p.template_export}' not in template-binding.registry.ts`,
          severity: 'BLOCKER' });
      } else if (enforceApprovedPages && approved && !isApprovedPageTemplateExport(p.archetype, p.template_export)) {
        const allowed = getApprovedPageTemplateExports(p.archetype).join("', '");
        errors.push({ error_type: 'NON_CANONICAL_TEMPLATE_EXPORT',
          error_path: `pages.${p.page_code}.template_export`,
          message: `template_export '${p.template_export}' must be one of '${allowed}' for archetype '${p.archetype}'`,
          severity: 'BLOCKER' });
      }
    }
  }

  // 7. i18n parity
  const en = Object.keys(contract.i18n?.en ?? {});
  const arSet = new Set(Object.keys(contract.i18n?.ar ?? {}));
  for (const k of en) {
    if (!arSet.has(k)) {
      errors.push({ error_type: 'MISSING_AR_TRANSLATION', error_path: `i18n.ar.${k}`,
        message: `EN key '${k}' has no AR sibling`, severity: 'BLOCKER' });
    }
  }
  for (const k of arSet) {
    if (!(k in (contract.i18n?.en ?? {}))) {
      errors.push({ error_type: 'ORPHAN_AR_KEY', error_path: `i18n.en.${k}`,
        message: `AR key '${k}' has no EN sibling`, severity: 'WARNING' });
    }
  }

  // 8. seed table whitelist
  for (const s of contract.seeds ?? []) {
    if (!ALLOWED_SEED_TABLES.has(s.table)) {
      errors.push({ error_type: 'UNAPPROVED_SEED_TABLE', error_path: `seeds.${s.table}`,
        message: `seed target table '${s.table}' not in publisher allowlist`,
        severity: 'BLOCKER' });
    }
    if (enforceApprovedPages && s.table === 'dos.dynamic_ui_component_registry') {
      for (const [index, row] of (s.rows ?? []).entries()) {
        if (!isApprovedPageComponentKey(row.component_key)) {
          errors.push({ error_type: 'NON_APPROVED_SEED_COMPONENT', error_path: `seeds.${s.table}.rows.${index}.component_key`,
            message: `component_key '${row.component_key}' is outside the approved 32 archetype page roster`,
            severity: 'BLOCKER' });
        }
      }
    }
    if (enforceApprovedPages && s.table === 'dos.dynamic_ui_routes') {
      for (const [index, row] of (s.rows ?? []).entries()) {
        if (!isApprovedPageComponentKey(row.component_key)) {
          errors.push({ error_type: 'NON_APPROVED_ROUTE_COMPONENT', error_path: `seeds.${s.table}.rows.${index}.component_key`,
            message: `route component_key '${row.component_key}' is outside the approved 32 archetype page roster`,
            severity: 'BLOCKER' });
        }
      }
    }
  }

  return errors;
}

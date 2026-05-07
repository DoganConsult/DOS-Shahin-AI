#!/usr/bin/env node
/**
 * Enforces only published JSON module contracts participate in DB publisher pipeline
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/module-template-approval.mjs [OPTIONS]

Enforces that every published page targets an approved template export from shell loader registry.

Options:
  --help, -h           Show this help message

Environment Variables:
  MODULE_TEMPLATE_APPROVAL_ENFORCE  Set to 1 to enforce ban (default: shadow mode)

Policy:
  Only published JSON module contracts may participate in DB publisher pipeline.
  Every published page must target approved template export from canonical shell loader registry.

Exit codes:
  Non-zero on template approval violation (when enforced)

Examples:
  # Run in shadow mode (default)
  node scripts/ci-guards/module-template-approval.mjs

  # Run with enforcement
  MODULE_TEMPLATE_APPROVAL_ENFORCE=1 node scripts/ci-guards/module-template-approval.mjs
`);
  process.exit(0);
}

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SEED_DIR,
  listModules,
  loadContract,
  validateContract,
} from '../module/lib/load-contract.mjs';
import {
  APPROVED_PAGE_ARCHETYPE_COUNT,
  getApprovedPageEntry,
  getApprovedPageTemplateExports,
  isApprovedPageComponentKey,
  isApprovedPageTemplateExport,
  shouldEnforceApprovedPageRoster,
} from '../module/lib/approved-page-roster.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENFORCE = process.env.MODULE_TEMPLATE_APPROVAL_ENFORCE === '1';

const TEMPLATE_BINDING_REGISTRY = resolve(
  REPO,
  'platform/core/platform/shell/template-binding.registry.ts',
);

const TEMPLATE_EXPORTS = new Set(
  [...readFileSync(TEMPLATE_BINDING_REGISTRY, 'utf8').matchAll(/^[ \t]+(?:([A-Z][A-Za-z0-9]+TemplateComponent)|['"]([^'"]+)['"])\s*:/gm)]
    .map(match => match[1] ?? match[2]),
);

const files = readdirSync(SEED_DIR);
const published = listModules();
const publishedSet = new Set(published);
const dropped = files
  .filter(file => file.endsWith('-complete-direct-seed.md'))
  .map(file => file.replace(/-complete-direct-seed\.md$/, ''))
  .filter(code => !publishedSet.has(code));

const failures = [];

for (const code of published) {
  let contract;
  try {
    ({ contract } = loadContract(code));
  } catch (error) {
    failures.push(`${code}: ${error.message}`);
    continue;
  }

  const schema = validateContract(contract);
  for (const error of schema.errors) {
    failures.push(`${code}: ${error.error_type} @ ${error.error_path} — ${error.message}`);
  }

  const enforceApprovedPages = shouldEnforceApprovedPageRoster(contract);

  for (const component of contract.components ?? []) {
    const carbonKey = String(component.carbon_key ?? '');
    if (/^VERIFY_/i.test(carbonKey)) {
      failures.push(
        `${code}: components.${component.component_key}.carbon_key uses placeholder '${carbonKey}'`,
      );
    }
    const approval = component.approval_status ?? 'approved';
    if (approval !== 'approved') {
      failures.push(
        `${code}: components.${component.component_key}.approval_status is '${approval}', expected 'approved'`,
      );
    }
    if (enforceApprovedPages && !isApprovedPageComponentKey(component.component_key)) {
      failures.push(
        `${code}: components.${component.component_key} is outside the approved ${APPROVED_PAGE_ARCHETYPE_COUNT}-archetype page roster`,
      );
    }
  }

  for (const page of contract.pages ?? []) {
    const approved = getApprovedPageEntry(page.archetype);
    if (enforceApprovedPages && !approved) {
      failures.push(
        `${code}: pages.${page.page_code}.archetype '${page.archetype}' is outside the approved ${APPROVED_PAGE_ARCHETYPE_COUNT}-archetype page roster`,
      );
    }
    if (!TEMPLATE_EXPORTS.has(page.template_export)) {
      failures.push(
        `${code}: pages.${page.page_code}.template_export '${page.template_export}' is not in template-binding.registry.ts`,
      );
    } else if (enforceApprovedPages && approved && !isApprovedPageTemplateExport(page.archetype, page.template_export)) {
      const allowed = getApprovedPageTemplateExports(page.archetype).join("', '");
      failures.push(
        `${code}: pages.${page.page_code}.template_export '${page.template_export}' must be one of '${allowed}' for archetype '${page.archetype}'`,
      );
    }
  }

  for (const seed of contract.seeds ?? []) {
    if (!enforceApprovedPages) continue;
    if (seed.table !== 'dos.dynamic_ui_component_registry' && seed.table !== 'dos.dynamic_ui_routes') continue;
    for (const [index, row] of (seed.rows ?? []).entries()) {
      if (!isApprovedPageComponentKey(row.component_key)) {
        failures.push(
          `${code}: seeds.${seed.table}.rows.${index}.component_key '${row.component_key}' is outside the approved ${APPROVED_PAGE_ARCHETYPE_COUNT}-archetype page roster`,
        );
      }
    }
  }
}

console.log(
  `[module-template-approval] published=${published.length} dropped=${dropped.length} approved-pages=${APPROVED_PAGE_ARCHETYPE_COUNT} loaders=${TEMPLATE_EXPORTS.size} failures=${failures.length}`,
);

if (dropped.length) {
  const preview = dropped.slice(0, 12).join(', ');
  const suffix = dropped.length > 12 ? `, +${dropped.length - 12} more` : '';
  console.log(`  dropped md-only seed packs: ${preview}${suffix}`);
}

for (const failure of failures) {
  console.error(`  ✗ ${failure}`);
}

if (failures.length && ENFORCE) {
  process.exit(1);
}

console.log('[module-template-approval] ' + (failures.length === 0 ? 'PASS' : 'WARN (non-enforced)'));
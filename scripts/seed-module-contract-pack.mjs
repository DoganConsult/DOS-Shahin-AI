#!/usr/bin/env node
// scripts/seed-module-contract-pack.mjs
//
// Phase F-F11 — Idempotent seeder that imports every JSON contract from
//   platform/ui-system/module_ui_os_contract-pack/*-complete-direct-seed.json
// into the DB-driven UI OS so every workspace, module, page, and
// component is bound for ALL tenants and ALL users by default.
//
// Tables touched (UPSERT semantics):
//   - dos.dynamic_ui_component_registry  (from .components[])
//   - dos.ui_route_template_binding      (from .pages[])
//   - dos.ui_module_nav_group            (synthetic group per module — root
//                                         items where route=null)
//   - dos.ui_module_nav_item             (from .navigation[] items where
//                                         route is non-null)
//
// Layer: this is the LAYER 3 (module default) write path. Tenant- and
// user-level overrides live in dos.ui_module_nav_override_{tenant,user}
// and are NOT touched here — operators add them per-tenant via SQL or
// the admin UI.
//
// Run:
//   node scripts/seed-module-contract-pack.mjs
//
// Env:
//   DATABASE_URL  (default: postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)
//   DRY_RUN=1     (print plan, do not write)

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const REPO_ROOT  = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK_DIR   = resolve(REPO_ROOT, 'platform/ui-system/module_ui_os_contract-pack');
const DB_URL     = process.env.DATABASE_URL
                ?? 'postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';
const DRY_RUN    = process.env.DRY_RUN === '1';

const ALLOWED_ARCHETYPES = new Set([
  'command-home','decision-dashboard','command-dashboard','posture-overview',
  'trend-intelligence','intelligent-register','risk-landscape','record-story',
  'guided-create','action-queue','workflow-control','workflow-timeline',
  'follow-up-center','evidence-reports','export-center','audit-trail',
  'audit-trail-ledger','audit-trail-evidence','calendar-timeline',
  'compliance-calendar','remediation-roadmap','org-chart','ownership-map',
  'delegation-center','ai-advisor','agent-flow','agent-registry',
  'user-agent-workbench','module-settings','activation-journey',
  'incident-response','case-finalization','marketing-landing',
]);

function discoverContracts() {
  return readdirSync(PACK_DIR)
    .filter(f => f.endsWith('-complete-direct-seed.json'))
    .map(f => {
      const path = join(PACK_DIR, f);
      const json = JSON.parse(readFileSync(path, 'utf8'));
      return { file: basename(path), json };
    });
}

async function seedComponents(client, contract, summary) {
  const list = contract.components ?? [];
  for (const c of list) {
    // Use a savepoint so a single bad component doesn't abort the
    // whole module's transaction.
    await client.query('SAVEPOINT comp');
    try {
      // Selector is stashed inside `metadata.selector` because the
      // physical schema doesn't expose a top-level `selector` column.
      const meta = { ...(c.metadata ?? {}) };
      if (c.selector) meta.selector = c.selector;
      await client.query(
        `INSERT INTO dos.dynamic_ui_component_registry
           (component_key, vendor, carbon_key, schema_version,
            approval_status, metadata)
         VALUES ($1,'ibm-carbon',$2,$3,$4,$5::jsonb)
         ON CONFLICT (component_key) DO UPDATE
            SET carbon_key      = EXCLUDED.carbon_key,
                approval_status = EXCLUDED.approval_status,
                metadata        = dos.dynamic_ui_component_registry.metadata || EXCLUDED.metadata`,
        [c.component_key, c.carbon_key, String(c.schema_version ?? 1),
         c.approval_status ?? 'approved',
         JSON.stringify(meta)]
      );
      await client.query('RELEASE SAVEPOINT comp');
      summary.components++;
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT comp');
      summary.componentErrors.push({ key: c.component_key, error: String(e?.message ?? e) });
    }
  }
}

async function seedPages(client, contract, summary) {
  const i18n = contract.i18n ?? { en: {}, ar: {} };
  for (const p of contract.pages ?? []) {
    if (!ALLOWED_ARCHETYPES.has(p.archetype)) {
      summary.pageErrors.push({ route: p.route, error: `archetype not allowed: ${p.archetype}` });
      continue;
    }
    // Pull masthead i18n from contract.i18n if keys exist:
    //   page.title.<page_code>, page.subtitle.<page_code>, page.eyebrow.<page_code>
    const tEn = i18n.en?.[`page.title.${p.page_code}`]    ?? null;
    const tAr = i18n.ar?.[`page.title.${p.page_code}`]    ?? null;
    const sEn = i18n.en?.[`page.subtitle.${p.page_code}`] ?? null;
    const sAr = i18n.ar?.[`page.subtitle.${p.page_code}`] ?? null;
    const eEn = contract.module?.name_en ?? null;
    const eAr = contract.module?.name_ar ?? null;
    await client.query('SAVEPOINT page');
    try {
      await client.query(
        `INSERT INTO dos.ui_route_template_binding
           (route, archetype, template_export, props,
            title_en, title_ar, subtitle_en, subtitle_ar,
            eyebrow_en, eyebrow_ar)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (route) DO UPDATE
            SET archetype       = EXCLUDED.archetype,
                template_export = EXCLUDED.template_export,
                -- props: only fill if currently empty (preserve hand-curated
                -- rich seeds like /workspace-home).
                props           = CASE
                                    WHEN dos.ui_route_template_binding.props = '{}'::jsonb
                                      THEN EXCLUDED.props
                                    ELSE dos.ui_route_template_binding.props
                                  END,
                title_en        = COALESCE(dos.ui_route_template_binding.title_en,    EXCLUDED.title_en),
                title_ar        = COALESCE(dos.ui_route_template_binding.title_ar,    EXCLUDED.title_ar),
                subtitle_en     = COALESCE(dos.ui_route_template_binding.subtitle_en, EXCLUDED.subtitle_en),
                subtitle_ar     = COALESCE(dos.ui_route_template_binding.subtitle_ar, EXCLUDED.subtitle_ar),
                eyebrow_en      = COALESCE(dos.ui_route_template_binding.eyebrow_en,  EXCLUDED.eyebrow_en),
                eyebrow_ar      = COALESCE(dos.ui_route_template_binding.eyebrow_ar,  EXCLUDED.eyebrow_ar),
                version         = dos.ui_route_template_binding.version + 1,
                updated_at      = now()`,
        [p.route, p.archetype, p.template_export,
         JSON.stringify(p.props ?? {}),
         tEn, tAr, sEn, sAr, eEn, eAr]
      );
      await client.query('RELEASE SAVEPOINT page');
      summary.pages++;
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT page');
      summary.pageErrors.push({ route: p.route, error: String(e?.message ?? e) });
    }
  }
}

async function seedNavigation(client, contract, summary) {
  const moduleCode = contract.module?.code;
  if (!moduleCode) return;
  const nav = contract.navigation ?? [];
  // ── Identify groups (route=null + parent_code=null) and items.
  // Seed strategy:
  //   - For each module, ensure ONE default group <module>.group.main with
  //     sort_order=10 if the contract has no explicit group containers.
  //   - Items with parent_code===<moduleCode> → bound to the main group.
  //   - Items with route=null & parent_code≠null → treated as nested groups
  //     (group_id = nav_item_code).
  const containerNodes = nav.filter(n => !n.route);          // route is null/undefined
  const leafNodes      = nav.filter(n =>  n.route);

  // Groups: every container node EXCEPT the module-root becomes a group.
  // Module-root (parent_code === null) maps to a synthetic "main" group.
  const mainGroupId = `${moduleCode}.group.main`;
  await client.query(
    `INSERT INTO dos.ui_module_nav_group
       (module_code, group_id, sort_order, label_en, label_ar)
     VALUES ($1,$2,10,$3,$4)
     ON CONFLICT (module_code, group_id) DO UPDATE
       SET sort_order = EXCLUDED.sort_order,
           label_en   = EXCLUDED.label_en,
           label_ar   = EXCLUDED.label_ar,
           updated_at = now()`,
    [moduleCode, mainGroupId,
     contract.module?.name_en ?? moduleCode,
     contract.module?.name_ar ?? moduleCode]
  );
  summary.groups++;

  for (const node of containerNodes) {
    if (node.parent_code === null) continue;       // module-root = main group
    const groupId = node.nav_item_code;
    await client.query(
      `INSERT INTO dos.ui_module_nav_group
         (module_code, group_id, sort_order, label_en, label_ar)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (module_code, group_id) DO UPDATE
         SET sort_order = EXCLUDED.sort_order,
             label_en   = EXCLUDED.label_en,
             label_ar   = EXCLUDED.label_ar,
             updated_at = now()`,
      [moduleCode, groupId, node.sort_order ?? 100,
       node.label_en, node.label_ar]
    );
    summary.groups++;
  }

  // Items
  for (const it of leafNodes) {
    const groupId = (it.parent_code === moduleCode || !it.parent_code)
      ? mainGroupId
      : it.parent_code;
    await client.query(
      `INSERT INTO dos.ui_module_nav_item
         (module_code, item_id, group_id, sort_order, route, icon,
          permission, label_en, label_ar)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (module_code, item_id) DO UPDATE
         SET group_id   = EXCLUDED.group_id,
             sort_order = EXCLUDED.sort_order,
             route      = EXCLUDED.route,
             icon       = EXCLUDED.icon,
             permission = EXCLUDED.permission,
             label_en   = EXCLUDED.label_en,
             label_ar   = EXCLUDED.label_ar,
             updated_at = now()`,
      [moduleCode, it.nav_item_code, groupId, it.sort_order ?? 0,
       it.route, it.icon ?? null, it.permission ?? null,
       it.label_en, it.label_ar]
    );
    summary.items++;
  }
}

async function main() {
  const contracts = discoverContracts();
  console.log(`[seed-pack] discovered ${contracts.length} JSON contracts in ${PACK_DIR}`);
  for (const c of contracts) {
    console.log(`           - ${c.file} (module=${c.json.module?.code ?? '?'})`);
  }
  if (DRY_RUN) {
    console.log('[seed-pack] DRY_RUN=1 — no writes.');
    return;
  }

  const pool = new pg.Pool({ connectionString: DB_URL });
  const totals = {
    contracts: 0, components: 0, pages: 0, groups: 0, items: 0,
    componentErrors: [], pageErrors: [],
  };

  for (const { file, json } of contracts) {
    const moduleCode = json.module?.code;
    if (!moduleCode) {
      console.warn(`[seed-pack] SKIP ${file} — no module.code`);
      continue;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const summary = { components: 0, pages: 0, groups: 0, items: 0,
                        componentErrors: [], pageErrors: [] };
      await seedComponents(client, json, summary);
      await seedPages(client, json, summary);
      await seedNavigation(client, json, summary);
      await client.query('COMMIT');
      console.log(`[seed-pack] ${moduleCode}: components=${summary.components} pages=${summary.pages} groups=${summary.groups} items=${summary.items}`);
      if (summary.componentErrors.length) console.warn('  componentErrors:', summary.componentErrors);
      if (summary.pageErrors.length)      console.warn('  pageErrors:',      summary.pageErrors);
      totals.contracts++;
      totals.components += summary.components;
      totals.pages      += summary.pages;
      totals.groups     += summary.groups;
      totals.items      += summary.items;
      totals.componentErrors.push(...summary.componentErrors);
      totals.pageErrors.push(...summary.pageErrors);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(`[seed-pack] FAILED ${moduleCode}: ${e.message}`);
      throw e;
    } finally {
      client.release();
    }
  }

  await pool.end();
  console.log('---');
  console.log(`[seed-pack] DONE. contracts=${totals.contracts} components=${totals.components} pages=${totals.pages} groups=${totals.groups} items=${totals.items}`);
  if (totals.componentErrors.length || totals.pageErrors.length) {
    console.log(`[seed-pack] WARNINGS: componentErrors=${totals.componentErrors.length} pageErrors=${totals.pageErrors.length}`);
    process.exit(1);
  }
}

main().catch(e => { console.error('[seed-pack] FATAL', e); process.exit(2); });

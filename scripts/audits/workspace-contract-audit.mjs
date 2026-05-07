#!/usr/bin/env node
// WORKSPACE CONTRACT AUDIT — evidence-only edition.

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/audits/workspace-contract-audit.mjs [OPTIONS]

Evidence-only audit of workspace contract compliance.

Options:
  --tenant <tenantId>   Specific tenant ID to audit (default: deterministic selection)
  --user <userId>       Specific user ID to audit
  --product <productCode> Specific product code
  --runtime <baseUrl>   Runtime base URL
  --out <dir>          Output directory
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string

Exit codes:
  0 — audit produced, verdict in JSON.verdict
  2 — environment failure (DB unreachable, seed missing)

Behavior:
  - Deterministic tenant selection
  - Runtime probe uses authenticated headers
  - Set-based comparisons (onlyInSeed / onlyInRegistry / onlyInBinding / onlyInRuntime)
  - COMPONENT_MAP null means structural (no Angular renderer expected)

Examples:
  # Audit with deterministic tenant
  node scripts/audits/workspace-contract-audit.mjs

  # Audit specific tenant
  node scripts/audits/workspace-contract-audit.mjs --tenant abc-123

  # Audit with custom runtime
  node scripts/audits/workspace-contract-audit.mjs --runtime http://localhost:4000
`);
  process.exit(0);
}

import pg from 'pg';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '../..');

// ── COMPONENT_MAP semantics ──────────────────────────────────────────
//   value === null            → structural (no Angular renderer expected).
//   value === '<ComponentName>' → visual renderer is mapped.
//   key absent                → not registered in the SPA shell map.
const SHELL_COMPONENT_MAP = {
  'shell.frame'              : null,
  'shell.workspace-header'   : 'DosWorkspaceHeaderComponent',
  'shell.empty-state'        : 'DosEmptyStateComponent',
  'shell.brand'              : 'DosShellBrandComponent',
  'shell.workspace-title'    : 'DosShellWorkspaceTitleComponent',
  'shell.user-menu'          : 'DosShellUserMenuComponent',
  'shell.settings-action'    : 'DosShellSettingsActionComponent',
  'shell.global-quick-actions': 'DosShellGlobalQuickActionsComponent',
  'shell.sidebar-nav'        : 'DosShellSidebarNavComponent',
  'shell.module-cards'       : 'DosShellModuleCardsComponent',
  'shell.catalog-action'     : 'DosShellCatalogWidgetComponent',
  'shell.catalog-data'       : 'DosShellCatalogWidgetComponent',
  'shell.catalog-input'      : 'DosShellCatalogWidgetComponent',
  'shell.catalog-nav'        : 'DosShellCatalogWidgetComponent',
  'shell.catalog-polish'     : 'DosShellCatalogWidgetComponent',
};

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tenant')  out.tenant  = argv[++i];
    else if (a === '--user')    out.user    = argv[++i];
    else if (a === '--product') out.product = argv[++i];
    else if (a === '--runtime') out.runtime = argv[++i];
    else if (a === '--out')     out.outDir  = argv[++i];
  }
  return out;
}

async function resolveTenant(pool, requested) {
  if (requested) {
    const r = await pool.query(
      `SELECT tenant_id, status FROM dos.tenants WHERE tenant_id = $1`, [requested],
    );
    if (r.rows.length === 0) throw new Error(`tenant not found: ${requested}`);
    return { tenantId: r.rows[0].tenant_id, status: r.rows[0].status, source: 'cli' };
  }
  const r = await pool.query(
    `SELECT tenant_id, status FROM dos.tenants
       WHERE status = 'active'
       ORDER BY tenant_id ASC LIMIT 1`,
  );
  if (r.rows.length === 0) throw new Error('no active tenant');
  return { tenantId: r.rows[0].tenant_id, status: r.rows[0].status, source: 'auto-first-active' };
}

async function resolveCallerForTenant(pool, tenantId, requestedUserId) {
  // Prefer the explicit user, otherwise pick a real active member so the
  // runtime probe can clear the NOT_A_MEMBER guard. We do NOT invent
  // /system-user/ — the runtime gate proves real membership.
  if (requestedUserId) {
    const r = await pool.query(
      `SELECT user_id FROM dos.tenant_memberships
        WHERE tenant_id = $1 AND user_id = $2
          AND COALESCE(status,'active') = 'active'`,
      [tenantId, requestedUserId],
    );
    if (r.rows.length === 0) {
      return { userId: requestedUserId, member: false, source: 'cli', note: 'requested user is not an active member of tenant' };
    }
    return { userId: r.rows[0].user_id, member: true, source: 'cli', note: null };
  }
  const r = await pool.query(
    `SELECT user_id FROM dos.tenant_memberships
      WHERE tenant_id = $1 AND COALESCE(status,'active') = 'active'
      ORDER BY user_id ASC LIMIT 1`,
    [tenantId],
  );
  if (r.rows.length === 0) {
    return { userId: null, member: false, source: 'auto', note: 'tenant has no active members' };
  }
  return { userId: r.rows[0].user_id, member: true, source: 'auto-first-member', note: null };
}

async function resolveProductForTenant(pool, tenantId, requested) {
  if (requested) {
    const r = await pool.query(
      `SELECT product_key FROM dos.tenant_product_activation
        WHERE tenant_id = $1 AND product_key = $2
          AND COALESCE(status,'active') = 'active'`,
      [tenantId, requested],
    );
    return { productCode: requested, active: r.rows.length > 0, source: 'cli' };
  }
  const r = await pool.query(
    `SELECT product_key FROM dos.tenant_product_activation
      WHERE tenant_id = $1 AND COALESCE(status,'active') = 'active'
      ORDER BY product_key ASC LIMIT 1`,
    [tenantId],
  );
  if (r.rows.length === 0) {
    return { productCode: null, active: false, source: 'auto' };
  }
  return { productCode: r.rows[0].product_key, active: true, source: 'auto-first-active' };
}

async function probeRuntime(baseUrl, tenantId, userId, productCode) {
  const status = {
    baseUrl, tenantId, userId, productCode,
    requestedUrl: null, httpStatus: null, ok: false, body: null, error: null, surfaceCount: 0,
  };
  if (!userId || !productCode) {
    status.error = `cannot probe runtime: ${!userId ? 'no userId' : 'no productCode'}`;
    return status;
  }
  const url = `${baseUrl}/api/ui-os/workspace-runtime?tenant_id=${encodeURIComponent(tenantId)}&user_id=${encodeURIComponent(userId)}&product_code=${encodeURIComponent(productCode)}`;
  status.requestedUrl = url;
  try {
    const res = await fetch(url, {
      headers: {
        'x-user-sub'      : userId,
        'x-tenant-id'     : tenantId,
        'x-user-roles'    : 'platform_admin',
        'x-dos-tenant-id' : tenantId,
        'x-dos-user-id'   : userId,
        'accept'          : 'application/json',
      },
    });
    status.httpStatus = res.status;
    const text = await res.text();
    let parsed = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }
    status.body = parsed;
    if (res.ok) {
      status.ok = true;
      status.surfaceCount = parsed?.shell?.surfaces?.length ?? 0;
    } else {
      status.error = `HTTP ${res.status}: ${typeof parsed === 'object' ? JSON.stringify(parsed) : String(parsed)}`;
    }
  } catch (e) {
    status.error = `network: ${e instanceof Error ? e.message : String(e)}`;
  }
  return status;
}

// Category model — driven by registry evidence, NOT by key prefix alone.
//
//   workspace.frame.*           → structural shell-host frame primitives.
//   workspace.shell.*           → first-class visual shell renderers.
//   workspace.action.* / .data.* / .input.* / .nav.* / .polish.*
//                                → Carbon vocabulary primitives. They are
//                                  catalog-only UNLESS the registry
//                                  explicitly assigns a renderer_key
//                                  (i.e. they have been promoted to a
//                                  real shell-host renderable surface).
//                                  This matches how `workspace.input.*`,
//                                  `workspace.nav.*`, `workspace.polish.*`
//                                  have always been treated and removes
//                                  the v2 false-positive on the 14
//                                  `workspace.action.*`/`workspace.data.*`
//                                  rows that have no rendererKey.
function classifyCategory(key, meta, rendererKey) {
  // Explicit DB metadata wins. A registry row marked
  // `catalog_only=true` or `shell_renderable=false` is, by doctrine,
  // catalog vocabulary — never a workspace-shell renderable surface.
  if (meta && (meta.catalog_only === true || meta.shell_renderable === false)) {
    return 'catalog-only';
  }
  if (key.startsWith('workspace.frame.'))  return 'structural';
  if (key.startsWith('workspace.shell.')) {
    const zone = meta?.zone || '';
    if (zone === 'header')  return 'visual-shell';
    if (zone === 'sidebar') return 'visual-nav';
    if (zone === 'main')    return 'visual-main';
    return 'visual-shell';
  }
  if (rendererKey) {
    if (key.startsWith('workspace.action.')) return 'action';
    if (key.startsWith('workspace.data.'))   return 'data-binding';
    if (key.startsWith('workspace.input.'))  return 'data-binding';
    if (key.startsWith('workspace.nav.'))    return 'visual-main';
    if (key.startsWith('workspace.polish.')) return 'visual-main';
  }
  return 'catalog-only';
}

function normalizeZone(raw) {
  if (!raw) return null;
  const map = { content: 'main', body: 'main', nav: 'sidebar', side: 'sidebar', top: 'header', topbar: 'header' };
  const k = String(raw).trim().toLowerCase();
  return map[k] || k || null;
}

function buildSurfaceId(key, zone, id, props) {
  const slug = key.replace(/^workspace\./, '').replace(/[^a-z0-9.-]+/gi, '-');
  return `workspace.${zone || 'unzoned'}.${slug}.${props?.id || `b${id}`}`;
}

// COMPONENT_MAP classification per row.
//   'visual-mapped'          → key present, value is a non-null component name
//   'structural-null'        → key present, value === null (e.g. shell.frame)
//   'unmapped'               → key not present at all
function componentMapStatus(rendererKey) {
  if (!rendererKey) return 'no-renderer-key';
  if (!(rendererKey in SHELL_COMPONENT_MAP)) return 'unmapped';
  return SHELL_COMPONENT_MAP[rendererKey] === null ? 'structural-null' : 'visual-mapped';
}

function asKeySet(x) {
  if (x instanceof Set) return x;
  if (x instanceof Map) return new Set(x.keys());
  return new Set(x);
}
function setDiff(a, b) {
  const A = asKeySet(a);
  const B = asKeySet(b);
  const out = [];
  for (const k of A) if (!B.has(k)) out.push(k);
  return out.sort();
}

async function main() {
  const args = parseArgs(process.argv);
  const databaseUrl = process.env.DATABASE_URL
    || 'postgresql://dos_migrator:dos_migrator_pass_2026@localhost:5432/shahin_grc';

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    // ── 1. Seed pack ───────────────────────────────────────────────
    const seedPath = join(ROOT, 'platform/ui-system/module_complete_direct_seed_pack/workspace-shell-complete-direct-seed.json');
    if (!existsSync(seedPath)) {
      console.error(`[audit] seed pack missing: ${seedPath}`);
      process.exit(2);
    }
    const seedFile = JSON.parse(readFileSync(seedPath, 'utf-8'));
    const seedKeys = new Set((seedFile.components || []).map((c) => c.component_key));

    // ── 2. Registry ────────────────────────────────────────────────
    const registryRows = await pool.query(`
      SELECT component_key, vendor, carbon_key, metadata, approval_status,
             renderer_key, component_type
        FROM dos.dynamic_ui_component_registry
       WHERE component_key LIKE 'workspace.%'
       ORDER BY component_key`);
    const registryByKey = new Map(registryRows.rows.map((r) => [r.component_key, r]));

    // ── 3. Deterministic tenant ────────────────────────────────────
    const tenant   = await resolveTenant(pool, args.tenant);
    const caller   = await resolveCallerForTenant(pool, tenant.tenantId, args.user);
    const product  = await resolveProductForTenant(pool, tenant.tenantId, args.product);

    // ── 4. Bindings for that tenant ────────────────────────────────
    const bindingRows = await pool.query(`
      SELECT id, component_key, enabled, position, perms_required, props, version
        FROM dos.workspace_shell_binding
       WHERE tenant_id = $1 AND component_key LIKE 'workspace.%'
       ORDER BY position, id`, [tenant.tenantId]);
    const bindingsByKey = new Map();
    for (const row of bindingRows.rows) {
      if (!bindingsByKey.has(row.component_key)) bindingsByKey.set(row.component_key, []);
      bindingsByKey.get(row.component_key).push(row);
    }
    const bindingKeySet = new Set(bindingsByKey.keys());

    // ── 5. Runtime probe ───────────────────────────────────────────
    const runtimeBase = args.runtime || process.env.UI_OS_BASE_URL || 'http://localhost:4015';
    const runtime = await probeRuntime(runtimeBase, tenant.tenantId, caller.userId, product.productCode);
    const runtimeKeySet = new Set();
    if (runtime.ok && runtime.body?.shell?.surfaces) {
      for (const s of runtime.body.shell.surfaces) {
        if (s?.componentKey) runtimeKeySet.add(s.componentKey);
      }
    }

    // ── 6. Per-key audit rows ──────────────────────────────────────
    const allKeys = new Set([...seedKeys, ...registryByKey.keys(), ...bindingKeySet, ...runtimeKeySet]);
    const auditData = [];
    for (const componentKey of [...allKeys].sort()) {
      const seed       = (seedFile.components || []).find((c) => c.component_key === componentKey);
      const registry   = registryByKey.get(componentKey);
      const bindings   = bindingsByKey.get(componentKey) || [];
      const metadata   = registry?.metadata || seed?.metadata || {};
      const rendererKey = registry?.renderer_key || null;
      const binding    = bindings[0] || null;
      const zone       = normalizeZone(metadata?.zone || binding?.props?.zone);
      const category   = classifyCategory(componentKey, metadata, rendererKey);
      const hasBinding = bindings.length > 0;
      const enabled    = hasBinding && binding.enabled === true;
      const registryApproved = registry?.approval_status === 'approved';
      const mapStatus  = componentMapStatus(rendererKey);
      const emittedByRuntime = runtimeKeySet.has(componentKey);

      // Catalog-only disposition (driven by registry metadata flags).
      const isCatalogOnly =
        category === 'catalog-only'
        || metadata?.catalog_only === true
        || metadata?.shell_renderable === false;

      // Failure semantics: missing rendererKey is a failure ONLY for
      // bound or runtime-emitted visual/action/data-binding surfaces.
      const renderableCategory =
        category === 'visual-shell' || category === 'visual-nav' ||
        category === 'visual-main'  || category === 'action'      || category === 'data-binding';
      const isStructural = category === 'structural';
      const reasons = [];
      const warnings = [];
      if (!registry) reasons.push('missing-registry');
      if (!hasBinding && (renderableCategory || isStructural)) reasons.push('no-binding');
      if (renderableCategory && (hasBinding || emittedByRuntime) && !rendererKey) {
        reasons.push('no-renderer-key');
      }
      if (renderableCategory && rendererKey && mapStatus !== 'visual-mapped') {
        reasons.push(`component-map-${mapStatus}`);
      }
      // Catalog-only invariants:
      //   - binding presence is drift (warning), not a render obligation.
      //   - emission by /api/ui-os/workspace-runtime is a hard failure.
      if (isCatalogOnly && hasBinding) {
        warnings.push('catalog-only-binding-drift');
      }
      if (isCatalogOnly && emittedByRuntime) {
        reasons.push('catalog-only-emitted-by-runtime');
      }
      // structural rows: structural-null is the expected, healthy state.

      auditData.push({
        componentKey,
        componentType: registry?.component_type || metadata.component_type || null,
        rendererKey,
        carbonKey   : registry?.carbon_key || seed?.carbon_key || null,
        zone,
        category,
        source      : seed ? 'seed' : (registry ? 'registry' : (hasBinding ? 'binding' : (emittedByRuntime ? 'runtime' : 'unknown'))),
        registryApproved,
        bindingId   : hasBinding ? binding.id : null,
        surfaceId   : hasBinding ? buildSurfaceId(componentKey, zone, binding.id, binding.props) : null,
        slotKey     : hasBinding ? `${zone}#${binding.position}#b${binding.id}` : null,
        hasBinding,
        enabled,
        permsRequired   : binding?.perms_required ?? null,
        componentMapStatus: mapStatus,
        emittedByRuntime,
        catalogOnly : isCatalogOnly,
        reasons     : reasons,
        warnings    : warnings,
        reason      : reasons.length ? reasons.join('; ') : 'OK',
      });
    }

    // ── 7. Set-based comparisons ───────────────────────────────────
    const comparisons = {
      onlyInSeed     : setDiff(seedKeys, registryByKey),
      onlyInRegistry : setDiff(registryByKey, seedKeys),
      seedAndRegistry: [...seedKeys].filter((k) => registryByKey.has(k)).sort(),
      onlyInBinding  : setDiff(bindingKeySet, registryByKey),
      registryNotBound: setDiff(registryByKey, bindingKeySet),
      onlyInRuntime  : setDiff(runtimeKeySet, bindingKeySet),
      bindingNotEmittedByRuntime: setDiff(bindingKeySet, runtimeKeySet),
    };

    // ── 8. Failure rules — evidence only, no hardcoded pushes ──────
    const failures = [];
    for (const row of auditData) {
      for (const r of row.reasons) {
        // surface a structured failure entry per (rule, key)
        failures.push({ rule: r, componentKey: row.componentKey, category: row.category, rendererKey: row.rendererKey });
      }
    }
    if (!runtime.ok) {
      failures.push({
        rule: 'runtime-probe-non-2xx',
        httpStatus: runtime.httpStatus,
        error: runtime.error,
        url: runtime.requestedUrl,
      });
    }
    if (!caller.member) {
      failures.push({
        rule: 'tenant-has-no-active-member',
        tenantId: tenant.tenantId,
        note: caller.note,
      });
    }

    // ── 9. Verdict ─────────────────────────────────────────────────
    const verdict = failures.length === 0 ? 'WORKSPACE_CONTRACT_AUDIT_GATE_PASS'
                                          : 'BLOCKED';

    // ── 10. Summary ────────────────────────────────────────────────
    const summary = {
      seedKeyCount    : seedKeys.size,
      registryKeyCount: registryByKey.size,
      tenantBindingCount: bindingRows.rowCount,
      runtimeEmittedCount: runtimeKeySet.size,
      catalogOnly     : auditData.filter((r) => r.category === 'catalog-only').length,
      structural      : auditData.filter((r) => r.category === 'structural').length,
      visual          : auditData.filter((r) => r.category.startsWith('visual')).length,
      action          : auditData.filter((r) => r.category === 'action').length,
      dataBinding     : auditData.filter((r) => r.category === 'data-binding').length,
      missingBinding  : auditData.filter((r) => !r.hasBinding).length,
      missingRendererKeyForRenderable: auditData.filter((r) =>
        (r.category.startsWith('visual') || r.category === 'action' || r.category === 'data-binding')
        && (r.hasBinding || r.emittedByRuntime) && !r.rendererKey).length,
      visualMappedCount: auditData.filter((r) => r.componentMapStatus === 'visual-mapped').length,
      structuralNullCount: auditData.filter((r) => r.componentMapStatus === 'structural-null').length,
      unmappedCount    : auditData.filter((r) => r.componentMapStatus === 'unmapped').length,
    };

    const output = {
      schemaVersion: 2,
      generatedAt: new Date().toISOString(),
      tenant : tenant,
      caller : caller,
      product: product,
      runtime: {
        baseUrl: runtime.baseUrl,
        requestedUrl: runtime.requestedUrl,
        httpStatus: runtime.httpStatus,
        ok: runtime.ok,
        error: runtime.error,
        surfaceCount: runtime.surfaceCount,
        // body intentionally omitted from MD; keep in JSON for debugging
        body: runtime.body,
      },
      domProbe: { mode: 'disabled', reason: 'option-B: DOM/visible columns removed pending Playwright probe for /workspace-home' },
      summary,
      comparisons,
      failures,
      verdict,
      auditData,
    };

    // ── 11. Write outputs ──────────────────────────────────────────
    const outDir = args.outDir || join(ROOT, 'platform/docs/workspace-contract-audit');
    mkdirSync(outDir, { recursive: true });
    const jsonPath = join(outDir, 'workspace-contract-audit.json');
    const mdPath   = join(outDir, 'workspace-contract-audit.md');
    writeFileSync(jsonPath, JSON.stringify(output, null, 2));
    writeFileSync(mdPath, renderMarkdown(output));

    console.log(JSON.stringify({
      tenantId: tenant.tenantId,
      callerUserId: caller.userId,
      productCode: product.productCode,
      runtimeStatus: runtime.httpStatus,
      runtimeOk: runtime.ok,
      verdict,
      failureCount: failures.length,
      jsonPath, mdPath,
    }, null, 2));
  } finally {
    await pool.end();
  }
}

function renderMarkdown(o) {
  let md = `# Workspace Contract Audit Report (v${o.schemaVersion})\n\n`;
  md += `Generated: ${o.generatedAt}\n\n`;
  md += `## Resolved Inputs\n\n`;
  md += `- Tenant: \`${o.tenant.tenantId}\` (status=${o.tenant.status}, source=${o.tenant.source})\n`;
  md += `- Caller user: \`${o.caller.userId ?? '(none)'}\` (member=${o.caller.member}, source=${o.caller.source})${o.caller.note ? ' — ' + o.caller.note : ''}\n`;
  md += `- Product: \`${o.product.productCode ?? '(none)'}\` (active=${o.product.active}, source=${o.product.source})\n\n`;

  md += `## Runtime Probe\n\n`;
  md += `- URL: \`${o.runtime.requestedUrl ?? '(not requested)'}\`\n`;
  md += `- HTTP status: ${o.runtime.httpStatus ?? 'n/a'}\n`;
  md += `- ok: ${o.runtime.ok}\n`;
  md += `- surfaces emitted: ${o.runtime.surfaceCount}\n`;
  if (o.runtime.error) md += `- error: \`${o.runtime.error}\`\n`;
  md += `\n`;

  md += `## DOM Probe\n\n- mode: ${o.domProbe.mode}\n- reason: ${o.domProbe.reason}\n\n`;

  md += `## Summary\n\n`;
  for (const [k, v] of Object.entries(o.summary)) md += `- ${k}: ${v}\n`;
  md += `\n`;

  md += `## Set Comparisons\n\n`;
  for (const [k, arr] of Object.entries(o.comparisons)) {
    md += `- ${k} (${arr.length})${arr.length ? ': ' + arr.map((x) => '`' + x + '`').join(', ') : ''}\n`;
  }
  md += `\n`;

  md += `## Failures (${o.failures.length})\n\n`;
  if (o.failures.length === 0) {
    md += `OK — no evidence-backed failures.\n\n`;
  } else {
    for (const f of o.failures) {
      md += `- \`${f.rule}\` ${JSON.stringify({ ...f, rule: undefined })}\n`;
    }
    md += `\n`;
  }

  md += `## Verdict: ${o.verdict}\n\n`;

  md += `## Audit Table\n\n`;
  md += `| componentKey | componentType | rendererKey | carbonKey | zone | category | source | approved | bound | enabled | mapStatus | emitted | reason |\n`;
  md += `|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of o.auditData) {
    md += `| ${r.componentKey} | ${r.componentType ?? '-'} | ${r.rendererKey ?? '-'} | ${r.carbonKey ?? '-'} | ${r.zone ?? '-'} | ${r.category} | ${r.source} | ${r.registryApproved ? 'Y' : 'N'} | ${r.hasBinding ? 'Y' : 'N'} | ${r.enabled ? 'Y' : 'N'} | ${r.componentMapStatus} | ${r.emittedByRuntime ? 'Y' : 'N'} | ${r.reason} |\n`;
  }
  return md;
}

main().catch((e) => {
  console.error('[audit] fatal:', e instanceof Error ? e.stack || e.message : String(e));
  process.exit(2);
});

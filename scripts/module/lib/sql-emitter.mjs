// scripts/module/lib/sql-emitter.mjs — render a contract into idempotent SQL
// statements ready for execution under withPublisherTx().
//
// Returns: { statements: [{ sql, params, name }], rowsByTable: {...} }

import { getApprovedPageEntry } from './approved-page-roster.mjs';

function lit(v) {
  // Used only inside emitted comments (never for parameterised values).
  return JSON.stringify(v);
}

function titleCase(segment) {
  return String(segment ?? '')
    .split(/[_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function roleDisplayName(roleCode, moduleName) {
  const raw = String(roleCode ?? '').split('.').pop() ?? roleCode;
  return `${moduleName} ${titleCase(raw)}`.trim();
}

export function emit(contract, { tenantIds = null } = {}) {
  const stmts = [];
  const rowsByTable = {};
  const inc = (t, n = 1) => { rowsByTable[t] = (rowsByTable[t] ?? 0) + n; };

  const moduleCode = String(contract.module?.code ?? '');
  const moduleName = String(contract.module?.name_en ?? moduleCode);
  const navByRoute = new Map(
    (contract.navigation ?? [])
      .filter(n => n.route)
      .map(n => [n.route, n]),
  );

  // ─── module → dos.module_registry ────────────────────────────────────────
  if (moduleCode) {
    stmts.push({
      name: `module:${moduleCode}`,
      sql: `INSERT INTO dos.module_registry
              (module_code, product_key, display_name, status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (module_code) DO UPDATE SET
              product_key = EXCLUDED.product_key,
              display_name = EXCLUDED.display_name,
              status = EXCLUDED.status`,
      params: [
        moduleCode,
        contract.module?.product_key ?? null,
        moduleName,
        'active',
      ],
    });
    inc('dos.module_registry');
  }

  // ─── components → dos.dynamic_ui_component_registry ──────────────────────
  for (const c of contract.components ?? []) {
    stmts.push({
      name: `component:${c.component_key}`,
      sql: `INSERT INTO dos.dynamic_ui_component_registry
              (component_key, bundle_url, schema_version, vendor,
               approval_status, carbon_key, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
            ON CONFLICT (component_key) DO UPDATE SET
              schema_version  = EXCLUDED.schema_version,
              vendor          = EXCLUDED.vendor,
              approval_status = EXCLUDED.approval_status,
              carbon_key      = EXCLUDED.carbon_key,
              metadata        = EXCLUDED.metadata`,
      params: [
        c.component_key,
        c.metadata?.bundle_url ?? `/shell/${c.component_key.split('.')[1] ?? c.component_key}.bundle.js`,
        c.schema_version ?? 1,
        'ibm-carbon',
        c.approval_status ?? 'approved',
        c.carbon_key,
        JSON.stringify({ ...(c.metadata ?? {}), selector: c.selector,
          published_by: 'contract-publisher@v1', module_code: contract.module.code }),
      ],
    });
    inc('dos.dynamic_ui_component_registry');
  }

  // ─── permissions → platform_dauth.permissions ────────────────────────────
  for (const p of contract.permissions ?? []) {
    const segs = p.code.split('.');
    const moduleCode = segs[0] ?? contract.module.code;
    const resourceType = segs[1] ?? null;
    const actionType = segs[2] ?? null;
    const permId = p.code.replace(/\./g, '_').slice(0, 64);
    stmts.push({
      name: `perm:${p.code}`,
      sql: `INSERT INTO platform_dauth.permissions
              (permission_id, permission_code, module_code,
               resource_type, action_type, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (permission_code) DO UPDATE SET
              module_code   = EXCLUDED.module_code,
              resource_type = EXCLUDED.resource_type,
              action_type   = EXCLUDED.action_type,
              description   = EXCLUDED.description`,
      params: [permId, p.code, moduleCode, resourceType, actionType, p.description ?? p.code],
    });
    inc('platform_dauth.permissions');
  }

  // ─── roles → platform_dauth.functional_roles + role_permissions ─────────
  if ((contract.roles ?? []).length) {
    stmts.push({
      name: `roleperm-clean:${moduleCode}`,
      sql: `DELETE FROM platform_dauth.role_permissions
            WHERE role_id = ANY($1::varchar[])`,
      params: [(contract.roles ?? []).map(role => role.code)],
    });
  }

  for (const role of contract.roles ?? []) {
    const displayName = roleDisplayName(role.code, moduleName.replace(/\s+—.*$/, ''));
    const description = `${moduleName} role (${role.archetype ?? 'custom'})`;
    stmts.push({
      name: `role:${role.code}`,
      sql: `INSERT INTO platform_dauth.functional_roles
              (role_id, role_code, display_name, description, permissions)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (role_id) DO UPDATE SET
              role_code = EXCLUDED.role_code,
              display_name = EXCLUDED.display_name,
              description = EXCLUDED.description,
              permissions = EXCLUDED.permissions`,
      params: [role.code, role.code, displayName, description, role.permissions ?? []],
    });
    inc('platform_dauth.functional_roles');

    for (const permCode of role.permissions ?? []) {
      stmts.push({
        name: `roleperm:${role.code}:${permCode}`,
        sql: `INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
              SELECT $1::varchar, p.permission_id
                FROM platform_dauth.permissions p
               WHERE p.permission_code = $2::varchar
                 AND NOT EXISTS (
                   SELECT 1 FROM platform_dauth.role_permissions rp
                    WHERE rp.role_id = $1::varchar
                      AND rp.permission_id = p.permission_id
                 )`,
        params: [role.code, permCode],
      });
      inc('platform_dauth.role_permissions');
    }
  }

  // ─── navigation → dos.navigation_registry ────────────────────────────────
  if ((contract.navigation ?? []).length) {
    stmts.push({
      name: `nav-clean:${moduleCode}`,
      sql: `DELETE FROM dos.navigation_registry
            WHERE module_code = $1`,
      params: [moduleCode],
    });
  }

  for (const nav of contract.navigation ?? []) {
    stmts.push({
      name: `nav:${nav.nav_item_code}`,
      sql: `INSERT INTO dos.navigation_registry
              (module_code, nav_item_code, label_en, label_ar, icon, route, parent_code, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT DO NOTHING`,
      params: [
        moduleCode,
        nav.nav_item_code,
        nav.label_en,
        nav.label_ar,
        nav.icon ?? null,
        nav.route ?? null,
        nav.parent_code ?? null,
        nav.sort_order ?? 0,
      ],
    });
    inc('dos.navigation_registry');
  }

  // ─── pages → dos.ui_route_template_binding + dos.dynamic_ui_routes ──────
  if ((contract.pages ?? []).length) {
    stmts.push({
      name: `route-clean:${moduleCode}`,
      sql: `DELETE FROM dos.dynamic_ui_routes
            WHERE module_code = $1
              AND tenant_id IS NULL`,
      params: [moduleCode],
    });
  }

  if ((contract.pages ?? []).length && contract.module?.route_base && contract.module.route_base !== '/') {
    stmts.push({
      name: `binding-clean:${moduleCode}`,
      sql: `DELETE FROM dos.ui_route_template_binding
            WHERE route = $1
               OR route LIKE $1 || '/%'`,
      params: [contract.module.route_base],
    });
  }

  for (const [index, page] of (contract.pages ?? []).entries()) {
    const nav = navByRoute.get(page.route);
    const approved = getApprovedPageEntry(page.archetype);
    stmts.push({
      name: `binding:${page.route}`,
      sql: `INSERT INTO dos.ui_route_template_binding
              (route, archetype, template_export, props, title_en, title_ar)
            VALUES ($1, $2, $3, $4::jsonb, $5, $6)
            ON CONFLICT (route) DO UPDATE SET
              archetype = EXCLUDED.archetype,
              template_export = EXCLUDED.template_export,
              props = EXCLUDED.props,
              title_en = EXCLUDED.title_en,
              title_ar = EXCLUDED.title_ar`,
      params: [
        page.route,
        page.archetype,
        page.template_export,
        JSON.stringify(page.props ?? {}),
        nav?.label_en ?? titleCase(page.page_code.split('.').pop()),
        nav?.label_ar ?? null,
      ],
    });
    inc('dos.ui_route_template_binding');

    stmts.push({
      name: `route:${page.route}`,
      sql: `INSERT INTO dos.dynamic_ui_routes
              (path_pattern, component_key, permission_key, module_code, sort_order, tenant_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (module_code, path_pattern) WHERE tenant_id IS NULL DO UPDATE SET
              component_key = EXCLUDED.component_key,
              permission_key = EXCLUDED.permission_key,
              sort_order = EXCLUDED.sort_order`,
      params: [
        page.route,
        approved?.componentKey ?? page.template_export,
        page.permission ?? null,
        moduleCode,
        nav?.sort_order ?? (index + 1) * 10,
        null,
      ],
    });
    inc('dos.dynamic_ui_routes');
  }

  // ─── i18n → dos.workspace_shell_i18n (workspace-shell module only) ───────
  if (contract.module.code === 'workspace-shell') {
    for (const locale of ['en', 'ar']) {
      const m = contract.i18n?.[locale] ?? {};
      for (const [key, value] of Object.entries(m)) {
        const ns = key.split('.')[0];
        stmts.push({
          name: `i18n:${locale}:${key}`,
          sql: `INSERT INTO dos.workspace_shell_i18n (ns, key, locale, value, module_code)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (key, locale) DO UPDATE SET
                  value = EXCLUDED.value,
                  version = dos.workspace_shell_i18n.version + 1,
                  updated_at = now()`,
          params: [ns, key, locale, value, contract.module.code],
        });
        inc('dos.workspace_shell_i18n');
      }
    }
  }

  // ─── seeds[] ──────────────────────────────────────────────────────────────
  for (const s of contract.seeds ?? []) {
    if (s.scope === 'per_tenant' && tenantIds && tenantIds.length) {
      for (const tid of tenantIds) {
        for (const row of s.rows) {
          stmts.push(...emitSeedRow(s.table, { tenant_id: tid, ...row }, s));
          inc(s.table);
        }
      }
    } else {
      for (const row of s.rows) {
        stmts.push(...emitSeedRow(s.table, row, s));
        inc(s.table);
      }
    }
  }

  return { statements: stmts, rowsByTable };
}

function emitSeedRow(table, row, seed) {
  const keys = Object.keys(row);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  const params = keys.map(k => {
    const v = row[k];
    if (Array.isArray(v)) return v;                   // pg driver → text[]
    if (v !== null && typeof v === 'object') return JSON.stringify(v);
    return v;
  });
  const conflict = (seed.conflict_target || []).map(c => `"${c}"`).join(', ');
  let onConflict = '';
  if (conflict) {
    if (seed.on_conflict === 'do_update') {
      const upd = keys
        .filter(k => !seed.conflict_target.includes(k))
        .map(k => `"${k}" = EXCLUDED."${k}"`)
        .join(', ');
      onConflict = upd
        ? `ON CONFLICT (${conflict}) DO UPDATE SET ${upd}`
        : `ON CONFLICT (${conflict}) DO NOTHING`;
    } else {
      onConflict = `ON CONFLICT (${conflict}) DO NOTHING`;
    }
  }
  // Cast jsonb columns. We assume `props`, `metadata`, `perms_required` etc. by name.
  const colList = keys.map(k => `"${k}"`).join(', ');
  const valList = keys.map((k, i) => {
    if (k === 'props' || k === 'metadata') return `${placeholders[i]}::jsonb`;
    return placeholders[i];
  }).join(', ');

  return [{
    name: `seed:${table}`,
    sql: `INSERT INTO ${table} (${colList}) VALUES (${valList}) ${onConflict}`,
    params,
  }];
}

export function emitSqlBundleText(emitted) {
  const out = [
    '-- Auto-generated by `pnpm module:dry-run`. Do not commit.',
    "BEGIN;",
    "SET LOCAL dos.publisher_session = 'contract-publisher@v1';",
    '',
  ];
  for (const s of emitted.statements) {
    out.push(`-- ${s.name}`);
    out.push(`-- params: ${JSON.stringify(s.params).slice(0, 200)}`);
    out.push(s.sql.replace(/\s+/g, ' ').trim() + ';');
    out.push('');
  }
  out.push('COMMIT;');
  return out.join('\n');
}

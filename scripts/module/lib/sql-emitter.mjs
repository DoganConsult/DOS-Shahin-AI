// scripts/module/lib/sql-emitter.mjs — render a contract into idempotent SQL
// statements ready for execution under withPublisherTx().
//
// Returns: { statements: [{ sql, params, name }], rowsByTable: {...} }

function lit(v) {
  // Used only inside emitted comments (never for parameterised values).
  return JSON.stringify(v);
}

export function emit(contract, { tenantIds = null } = {}) {
  const stmts = [];
  const rowsByTable = {};
  const inc = (t, n = 1) => { rowsByTable[t] = (rowsByTable[t] ?? 0) + n; };

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

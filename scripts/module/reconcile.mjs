#!/usr/bin/env node
/**
 * pnpm module:reconcile <module_code> [flags]
 *
 * Deterministic reconciliation pipeline (worst exit wins):
 *   90 fatal internal > 50 frontend > 40 API probe > 30 DB > 20 AJV/naming > 10 MD↔JSON > 2 usage/dry+apply > 0 OK
 *
 * --full enables parity, AJV, DB cross-ref + gap verify, SQL emit, API probe, frontend (never --apply-db).
 * CI smoke (--skip-*): omit parity / gap-verify / API probe / frontend without disabling AJV or DB cross-ref.
 * --apply-db must be explicit; forbidden with --dry-run (exit 2).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadContract,
  validateContract,
  contractPath,
  mdPath,
} from './lib/load-contract.mjs';
import {
  compareMdToJson,
  formatMdJsonDiffReport,
  patchContractPermissionsFromMd,
} from './lib/md-inventory.mjs';
import { crossRefAgainstDb } from './lib/cross-ref.mjs';
import { emit, emitSqlBundleText } from './lib/sql-emitter.mjs';
import { makePool, withPublisherTx } from './lib/db.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const EXIT_ORDER = [90, 50, 40, 30, 20, 10, 2, 0];

/** Three-part permission code (matches publisher / cross-ref expectation). */
const PERM_CODE_RE = /^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/;

function worstExit(a, b) {
  const rank = x => {
    const i = EXIT_ORDER.indexOf(x);
    return i < 0 ? -1 : i;
  };
  return rank(a) <= rank(b) ? a : b;
}

function normalizeModuleCode(raw) {
  if (!raw) return null;
  return raw
    .replace(/-complete-direct-seed$/i, '')
    .replace(/\.json$/i, '')
    .trim();
}

function parseArgs(argv) {
  const positional = [];
  const flags = new Set();
  for (const a of argv) {
    if (a.startsWith('--')) flags.add(a);
    else positional.push(a);
  }
  return {
    code: normalizeModuleCode(positional[0]),
    flags,
    positional,
  };
}

function usage() {
  console.error(`usage: pnpm module:reconcile <module_code> [flags]

flags:
  --full              run parity + AJV + DB + emit SQL + probe + frontend (no DB apply)
  --dry-run           never write canonical JSON or apply DB; artifacts under /tmp only
  --write-canonical   after --patch-json, write JSON back to seed pack (blocked by --dry-run)
  --patch-json        merge MD-only permission codes into contract JSON (nav gaps must be empty)
  --parity            MD↔JSON parity only (subset)
  --ajv               schema + naming rules only
  --db                DB cross-ref + publish-verify-style gaps
  --generate-sql      emit UPSERT bundle to /tmp/<module>-emit.sql
  --apply-db          execute publisher transaction (like module:publish); not allowed with --dry-run
  --probe-api         GET contract apis[] against GATEWAY_URL (default http://localhost:4000)
  --check-frontend    Shahin SPA routes + i18n key presence
  --skip-parity       skip MD↔JSON parity (full/--parity still runs rest)
  --skip-db-gap-verify skip verifyDbGaps after DB cross-ref (cross-ref still runs)
  --skip-api-probe    skip gateway probe (--probe-api/--full)
  --skip-frontend     skip SPA/i18n check (--check-frontend/--full)

Exit tiers (worst wins): 90 50 40 30 20 10 2 0`);
}

function flattenI18n(obj, prefix = '') {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenI18n(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

/** @param {string} slug */
function tmp(slug, suffix) {
  return `/tmp/${slug}-${suffix}`;
}

async function probeGatewayApis(contract, slug, lines) {
  const base =
    process.env.GATEWAY_URL?.replace(/\/$/, '') || 'http://localhost:4000';
  const apis = contract.apis ?? [];
  if (!apis.length) {
    lines.push('API probe: skipped (contract.apis empty)');
    return 0;
  }
  let worst = 0;
  const detail = [];
  for (const api of apis) {
    const p = api.path?.startsWith('/') ? api.path : `/${api.path ?? ''}`;
    const url = `${base}${p}`;
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 10_000);
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: ac.signal,
        headers: { Accept: 'application/json, text/plain, */*' },
      });
      clearTimeout(t);
      const st = res.status;
      if (st === 401 || st === 403) {
        detail.push(`PASS ${st} ${url} (gated)`);
      } else if (st === 404 || st >= 500) {
        detail.push(`FAIL ${st} ${url}`);
        worst = worstExit(worst, 40);
      } else {
        detail.push(`PASS ${st} ${url}`);
      }
    } catch (e) {
      detail.push(`FAIL network ${url}: ${e instanceof Error ? e.message : e}`);
      worst = worstExit(worst, 40);
    }
  }
  writeFileSync(tmp(slug, 'api-probe.txt'), detail.join('\n') + '\n');
  lines.push(`API probe: ${worst === 0 ? 'OK' : 'FAIL'} → /tmp/${slug}-api-probe.txt`);
  return worst;
}

function checkFrontend(contract, slug, lines) {
  const routesPath = join(
    REPO,
    'products/shahin-ai/app/src/app/app.routes.ts',
  );
  if (!existsSync(routesPath)) {
    lines.push(`Frontend: skipped (missing ${routesPath})`);
    return 0;
  }
  const routesFile = readFileSync(routesPath, 'utf8');
  const want = new Set();
  for (const p of contract.pages ?? []) {
    if (p.route) want.add(String(p.route).replace(/^\/+|\/+$/g, ''));
  }
  for (const n of contract.navigation ?? []) {
    if (n.route) want.add(String(n.route).replace(/^\/+|\/+$/g, ''));
  }
  const missingRoutes = [];
  for (const r of want) {
    const hit =
      routesFile.includes(`/${r}`) ||
      routesFile.includes(`'/${r}'`) ||
      routesFile.includes(`"/${r}"`) ||
      routesFile.includes(`'${r}'`) ||
      routesFile.includes(`"${r}"`);
    if (!hit) missingRoutes.push(r);
  }

  const enCandidates = [
    join(REPO, 'products/shahin-ai/app/src/assets/i18n/en.json'),
    join(REPO, 'products/shahin-ai/app/public/assets/i18n/en.json'),
  ];
  let flatEn = {};
  for (const p of enCandidates) {
    if (existsSync(p)) {
      try {
        flatEn = { ...flatEn, ...flattenI18n(JSON.parse(readFileSync(p, 'utf8'))) };
      } catch {
        lines.push(`Frontend: warn failed parse ${p}`);
      }
    }
  }
  const missingI18n = [];
  for (const k of Object.keys(contract.i18n?.en ?? {})) {
    if (!(k in flatEn)) missingI18n.push(k);
  }

  const md = [
    `# Frontend check — ${contract.module?.code ?? slug}`,
    '',
    `## Routes missing from app.routes.ts (${missingRoutes.length})`,
    missingRoutes.map(r => `- \`${r}\``).join('\n') || '- none',
    '',
    `## Contract i18n.en keys missing from merged SPA en.json (${missingI18n.length})`,
    missingI18n.map(k => `- \`${k}\``).join('\n') || '- none',
    '',
  ].join('\n');
  writeFileSync(tmp(slug, 'frontend-check.md'), md);

  let worst = 0;
  if (missingRoutes.length || missingI18n.length) worst = worstExit(worst, 50);
  lines.push(
    `Frontend: ${worst === 0 ? 'OK' : 'FAIL'} → /tmp/${slug}-frontend-check.md`,
  );
  return worst;
}

async function verifyDbGaps(client, code, contract, slug, lines) {
  const failures = [];
  for (const c of contract.components ?? []) {
    const r = await client.query(
      `SELECT 1 FROM dos.dynamic_ui_component_registry
        WHERE component_key = $1 AND vendor='ibm-carbon' AND approval_status='approved'`,
      [c.component_key],
    );
    if ((r.rowCount ?? r.rows?.length ?? 0) === 0) {
      failures.push(`component ${c.component_key} not registered/approved`);
    }
  }
  for (const p of contract.permissions ?? []) {
    const r = await client.query(
      `SELECT 1 FROM platform_dauth.permissions WHERE permission_code=$1`,
      [p.code],
    );
    if ((r.rowCount ?? r.rows?.length ?? 0) === 0) {
      failures.push(`permission ${p.code} not present`);
    }
  }
  if (code === 'workspace-shell') {
    const enKeys = Object.keys(contract.i18n?.en ?? {});
    const r = await client.query(
      `SELECT count(*)::int AS n FROM dos.workspace_shell_i18n WHERE locale='en'`,
    );
    if (r.rows[0].n < enKeys.length) {
      failures.push(
        `workspace_shell_i18n EN row count ${r.rows[0].n} < contract ${enKeys.length}`,
      );
    }
    const r2 = await client.query(
      `SELECT count(*)::int AS n FROM dos.workspace_shell_binding
        WHERE component_key LIKE 'workspace.%' AND props <> '{}'::jsonb`,
    );
    if (r2.rows[0].n === 0) {
      failures.push(`workspace_shell_binding has no non-empty props rows`);
    }
  }
  const r3 = await client.query(
    `SELECT contract_version, applied_at FROM dos.module_contract_publish_log
      WHERE module_code=$1 ORDER BY applied_at DESC LIMIT 1`,
    [code],
  );
  if ((r3.rowCount ?? r3.rows?.length ?? 0) === 0) {
    failures.push(`no publish_log entry for ${code}`);
  }

  const report = [
    `# DB gap verify — ${code}`,
    '',
    `failures=${failures.length}`,
    '',
    ...failures.map(f => `- ${f}`),
    '',
  ].join('\n');
  writeFileSync(tmp(slug, 'db-gap-report.md'), report);
  lines.push(
    `DB verify: ${failures.length ? 'FAIL' : 'OK'} → /tmp/${slug}-db-gap-report.md`,
  );
  return failures.length ? 30 : 0;
}

async function main() {
  const { code, flags } = parseArgs(process.argv.slice(2));
  const dryRun = flags.has('--dry-run');
  const full = flags.has('--full');
  const applyDb = flags.has('--apply-db');
  const skipParity = flags.has('--skip-parity');
  const skipDbGapVerify = flags.has('--skip-db-gap-verify');
  const skipApiProbe = flags.has('--skip-api-probe');
  const skipFrontend = flags.has('--skip-frontend');

  if (!code) {
    usage();
    process.exit(2);
  }

  if (dryRun && applyDb) {
    console.error('[module:reconcile] --apply-db is not allowed with --dry-run');
    process.exit(2);
  }

  const doParity = !skipParity && (full || flags.has('--parity'));
  const doAjv = full || flags.has('--ajv');
  const doDb = full || flags.has('--db');
  const doSql = full || flags.has('--generate-sql');
  const doProbe =
    !skipApiProbe && (full || flags.has('--probe-api'));
  const doFe =
    !skipFrontend && (full || flags.has('--check-frontend'));

  if (
    !full &&
    !doParity &&
    !doAjv &&
    !doDb &&
    !doSql &&
    !doProbe &&
    !doFe &&
    !applyDb
  ) {
    usage();
    process.exit(2);
  }

  const slug = code;
  let worst = 0;
  const reportLines = [];
  reportLines.push(`# Module reconcile — ${code}`);
  reportLines.push('');
  reportLines.push(`Flags: ${[...flags].join(', ') || '(none)'}`);
  if (skipParity)
    reportLines.push('_Skip parity (--skip-parity)_');
  if (skipDbGapVerify)
    reportLines.push('_Skip DB gap verify (--skip-db-gap-verify)_');
  if (skipApiProbe)
    reportLines.push('_Skip API probe (--skip-api-probe)_');
  if (skipFrontend)
    reportLines.push('_Skip frontend (--skip-frontend)_');
  reportLines.push('');

  /** @type {object | null} */
  let contract = null;
  /** @type {string | null} */
  let raw = null;
  /** @type {string | null} */
  let sha256 = null;

  try {
    const loaded = loadContract(code);
    contract = loaded.contract;
    raw = loaded.raw;
    sha256 = loaded.sha256;
  } catch {
    // markdown-only or missing JSON — parity handles
  }

  // ─── MD↔JSON parity ─────────────────────────────────────────────────────
  if (doParity) {
    const cmp = compareMdToJson(code, mdPath(code), contract);
    writeFileSync(
      tmp(slug, 'md-json-diff.md'),
      formatMdJsonDiffReport(code, cmp),
    );
    reportLines.push(`Parity: ${cmp.ok ? 'OK' : 'GAPS'} → /tmp/${slug}-md-json-diff.md`);
    if (!cmp.ok) worst = worstExit(worst, 10);

    if (
      flags.has('--patch-json') &&
      contract &&
      cmp.mdOnlyCodes?.length &&
      !cmp.navConflicts?.length
    ) {
      const navGap =
        (cmp.navMdOnly?.length ?? 0) > 0 || (cmp.navJsonOnly?.length ?? 0) > 0;
      if (navGap) {
        reportLines.push(
          'Patch-json: skipped (resolve navigation MD↔JSON gaps first)',
        );
      } else {
        contract = patchContractPermissionsFromMd(contract, cmp.mdOnlyCodes);
        raw = JSON.stringify(contract);
        sha256 = createHash('sha256').update(raw).digest('hex');
        if (flags.has('--write-canonical')) {
          if (dryRun) {
            reportLines.push(
              'Write-canonical: skipped (--dry-run blocks repo writes)',
            );
          } else {
            writeFileSync(contractPath(code), `${raw}\n`);
            reportLines.push(`Write-canonical: updated ${contractPath(code)}`);
          }
        }
        const cmp2 = compareMdToJson(code, mdPath(code), contract);
        writeFileSync(
          tmp(slug, 'md-json-diff-after-patch.md'),
          formatMdJsonDiffReport(code, cmp2),
        );
        if (!cmp2.ok) worst = worstExit(worst, 10);
      }
    }
  }

  // ─── AJV + naming ───────────────────────────────────────────────────────
  if (doAjv) {
    if (!contract) {
      reportLines.push('AJV: skipped (no JSON contract)');
      worst = worstExit(worst, 10);
    } else {
      const sv = validateContract(contract);
      writeFileSync(
        tmp(slug, 'ajv-errors.json'),
        `${JSON.stringify(sv.errors, null, 2)}\n`,
      );
      const blockers = sv.errors.filter(e => e.severity === 'BLOCKER');
      reportLines.push(
        `AJV: ${blockers.length ? 'FAIL' : 'OK'} (${sv.errors.length} issues) → /tmp/${slug}-ajv-errors.json`,
      );
      if (blockers.length) worst = worstExit(worst, 20);

      const badPerm = (contract.permissions ?? []).filter(
        p => !PERM_CODE_RE.test(p.code),
      );
      if (badPerm.length) {
        writeFileSync(
          tmp(slug, 'naming-permissions.txt'),
          badPerm.map(p => p.code).join('\n') + '\n',
        );
        reportLines.push(
          `Naming: FAIL (${badPerm.length} permission codes) → /tmp/${slug}-naming-permissions.txt`,
        );
        worst = worstExit(worst, 20);
      } else {
        reportLines.push('Naming: permission codes OK');
      }
    }
  }

  let pool = null;
  try {
    const needPool = doDb || doSql || applyDb;
    if (needPool) {
      pool = makePool();
    }

    // ─── DB cross-ref + verify ───────────────────────────────────────────
    if (doDb && contract && pool) {
      const client = await pool.connect();
      try {
        const xref = await crossRefAgainstDb(client, contract);
        writeFileSync(
          tmp(slug, 'db-crossref.md'),
          xref
            .map(
              e =>
                `- [${e.severity}] ${e.error_type} ${e.error_path}: ${e.message}`,
            )
            .join('\n') + '\n',
        );
        const xb = xref.filter(e => e.severity === 'BLOCKER');
        reportLines.push(
          `DB cross-ref: ${xb.length ? 'FAIL' : 'OK'} → /tmp/${slug}-db-crossref.md`,
        );
        if (xb.length) worst = worstExit(worst, 30);

        if (!skipDbGapVerify) {
          const v = await verifyDbGaps(client, code, contract, slug, reportLines);
          worst = worstExit(worst, v);
        } else {
          reportLines.push(
            'DB verify: skipped (--skip-db-gap-verify; cross-ref above still applies)',
          );
        }
      } finally {
        client.release();
      }
    } else if (doDb && !contract) {
      reportLines.push('DB: skipped (no JSON contract)');
      worst = worstExit(worst, 10);
    }

    // ─── Emit SQL ────────────────────────────────────────────────────────
    if (doSql && contract && pool) {
      const sv = validateContract(contract);
      const blockers = sv.errors.filter(e => e.severity === 'BLOCKER');
      if (blockers.length) {
        reportLines.push('SQL emit: skipped (AJV blockers)');
        worst = worstExit(worst, 20);
      } else {
        const client = await pool.connect();
        try {
          const xref = await crossRefAgainstDb(client, contract);
          const xb = xref.filter(e => e.severity === 'BLOCKER');
          if (xb.length) {
            reportLines.push('SQL emit: skipped (cross-ref blockers)');
            worst = worstExit(worst, 30);
          } else {
            let tenantIds = null;
            if ((contract.seeds || []).some(s => s.scope === 'per_tenant')) {
              const r = await client.query(
                `SELECT tenant_id FROM dos.tenants ORDER BY tenant_id`,
              );
              tenantIds = r.rows.map(x => x.tenant_id);
            }
            const out = emit(contract, { tenantIds });
            writeFileSync(tmp(slug, 'emit.sql'), emitSqlBundleText(out));
            reportLines.push(
              `SQL emit: OK (${out.statements.length} stmts) → /tmp/${slug}-emit.sql`,
            );
          }
        } finally {
          client.release();
        }
      }
    } else if (doSql && !contract) {
      reportLines.push('SQL emit: skipped (no JSON contract)');
      worst = worstExit(worst, 10);
    }

    // ─── Apply DB (publisher transaction) ────────────────────────────────
    if (applyDb && contract && pool) {
      const sv = validateContract(contract);
      const blockers = sv.errors.filter(e => e.severity === 'BLOCKER');
      if (blockers.length) {
        reportLines.push('Apply-db: skipped (AJV blockers)');
        worst = worstExit(worst, 20);
      } else {
        let xrefOk = false;
        let tenantIds = [];
        const client = await pool.connect();
        try {
          const xref = await crossRefAgainstDb(client, contract);
          const xb = xref.filter(e => e.severity === 'BLOCKER');
          if (xb.length) {
            reportLines.push('Apply-db: aborted (cross-ref blockers)');
            worst = worstExit(worst, 30);
          } else {
            xrefOk = true;
            const r = await client.query(
              `SELECT tenant_id FROM dos.tenants ORDER BY tenant_id`,
            );
            tenantIds = r.rows.map(x => x.tenant_id);
          }
        } finally {
          client.release();
        }

        if (xrefOk) {
          try {
            const out = emit(contract, { tenantIds });
            const sqlText = emitSqlBundleText(out);
            const sqlSha = createHash('sha256').update(sqlText).digest('hex');
            await withPublisherTx(pool, async c => {
              for (const s of out.statements) {
                await c.query(s.sql, s.params);
              }
              await c.query(
                `INSERT INTO dos.module_contract_publish_log
                    (module_code, contract_version, schema_version,
                     contract_sha256, sql_sha256, rows_emitted, summary)
                   VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
                [
                  code,
                  contract.module.version,
                  contract.schemaVersion ?? 1,
                  sha256,
                  sqlSha,
                  JSON.stringify(out.rowsByTable),
                  `${out.statements.length} stmts; reconcile apply-db`,
                ],
              );
            });
            reportLines.push(`Apply-db: OK (${out.statements.length} stmts)`);
          } catch (e) {
            reportLines.push(
              `Apply-db: FAIL ${e instanceof Error ? e.message : e}`,
            );
            worst = worstExit(worst, 30);
          }
        }
      }
    } else if (applyDb && !contract) {
      reportLines.push('Apply-db: skipped (no JSON contract)');
      worst = worstExit(worst, 10);
    }
  } finally {
    if (pool) await pool.end();
  }

  // ─── API probe + frontend (no DB) ───────────────────────────────────────
  if (doProbe && contract) {
    worst = worstExit(
      worst,
      await probeGatewayApis(contract, slug, reportLines),
    );
  } else if (doProbe && !contract) {
    reportLines.push('API probe: skipped (no JSON contract)');
    worst = worstExit(worst, 10);
  }

  if (doFe && contract) {
    worst = worstExit(worst, checkFrontend(contract, slug, reportLines));
  } else if (doFe && !contract) {
    reportLines.push('Frontend: skipped (no JSON contract)');
    worst = worstExit(worst, 10);
  }

  const argvReplay = process.argv.slice(2).join(' ');
  reportLines.push('');
  reportLines.push(`## Worst exit: ${worst}`);
  reportLines.push('');
  reportLines.push('## Command');
  reportLines.push(`pnpm module:reconcile ${argvReplay}`);

  writeFileSync(tmp(slug, 'final-report.md'), `${reportLines.join('\n')}\n`);

  console.log(`[module:reconcile] worst exit=${worst}`);
  console.log(`  report: ${tmp(slug, 'final-report.md')}`);
  process.exit(worst);
}

main().catch(err => {
  console.error('[module:reconcile] fatal:', err);
  process.exit(90);
});
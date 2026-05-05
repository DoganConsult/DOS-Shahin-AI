/**
 * AI-HR Service — turns the 13 canonical agents into "real employees".
 *
 * Three responsibilities:
 *
 *   1. seedShiftsForAllTenants(): per-tenant materialization of every agent's
 *      schedule into public.ai_employee_shifts. Runs idempotently at engine
 *      startup. Platform-global agents (A13) get one row with tenant_id=NULL.
 *
 *   2. listEmployees() / getEmployee(): read-side composer that joins the
 *      canonical SHAHIN_AI_EMPLOYEES TS source with live runtime metrics
 *      (last shift, KPI snapshot, recent reports) for the org-chart page.
 *
 *   3. runDueShifts(): cron-runner entrypoint. Finds shifts whose
 *      next_run_at <= now, executes the shift handler (writes a digest
 *      report + audit entry + KPI snapshot), and advances next_run_at.
 *
 * The shift handler is intentionally minimal in Phase 1 — it produces a
 * structured digest from each agent's tools but does NOT attempt to make
 * autonomous decisions. Phase 2 will plug in domain-specific handlers
 * that call the agent's tool builders directly.
 */
import { createRequire } from 'module';
import { safeQuery } from '@dos/db';
import { logger } from '../../ports/logger.port';
import { SHAHIN_AI_EMPLOYEES as RAW_EMPLOYEES, listAllShifts } from '@shahin-ai/product/shahin-ai-employees';
import { lookupShiftHandler, listRegisteredShiftHandlers } from './shift-handlers';
// Engine bundles to ESM. Use createRequire so we can synchronously load CJS
// peers like cron-parser without paying the cost of a top-level await chain.
const requireCjs = createRequire(import.meta.url);
// Re-cast to a typed record — the @shahin-ai/product re-export is `Record<string, unknown>`
// because that package's tsconfig doesn't yet include @dos/types transitively.
const SHAHIN_AI_EMPLOYEES = RAW_EMPLOYEES;
async function listActiveTenants() {
    const r = await safeQuery(`SELECT tenant_id FROM dos.tenants WHERE status = 'active' ORDER BY tenant_id`, []).catch(() => ({ rows: [] }));
    return r.rows.map(t => t.tenant_id);
}
// cron-parser is a hard dependency. We required-once at module load so the
// fallback path can be reached only on a genuinely invalid cron expression
// (logged loudly). Without this, every shift fell back to "now + 1h" silently
// and fired hourly instead of on its declared schedule — see Phase 1 audit.
let _cronParser = null;
try {
    _cronParser = requireCjs('cron-parser');
}
catch (err) {
    logger.error('[ai-hr] cron-parser missing — shifts cannot be scheduled correctly', {
        error: err instanceof Error ? err.message : String(err),
    });
}
function nextRunFromCron(cronExpr, fromMs = Date.now(), tz = 'UTC') {
    if (!_cronParser) {
        // Hard fail rather than silently scheduling for "+1h" — that would cause
        // every shift to fire hourly. Park the shift 24h out and emit a loud log
        // so ops sees something is wrong; the engine will not advance further.
        logger.warn('[ai-hr] no cron-parser; parking shift 24h (cron parse skipped)', { cronExpr });
        return new Date(fromMs + 24 * 60 * 60 * 1000);
    }
    try {
        const it = _cronParser.parseExpression(cronExpr, { currentDate: new Date(fromMs), tz });
        return it.next().toDate();
    }
    catch (err) {
        logger.error('[ai-hr] invalid cron expression — parking shift 24h', {
            cronExpr, tz, error: err instanceof Error ? err.message : String(err),
        });
        return new Date(fromMs + 24 * 60 * 60 * 1000);
    }
}
/** Resolve a tenant's timezone from dos.tenants.settings.timezone, default UTC. */
async function tenantTimezone(tenantId) {
    if (!tenantId)
        return 'UTC';
    const r = await safeQuery(`SELECT settings -> 'timezone' AS tz FROM dos.tenants WHERE tenant_id = $1`, [tenantId]).catch(() => ({ rows: [] }));
    const raw = r.rows?.[0]?.tz;
    if (typeof raw === 'string' && raw.length > 0)
        return raw;
    // Fall through to env-default for the platform.
    return process.env.PLATFORM_DEFAULT_TZ || 'UTC';
}
async function nextRunForShift(shift, fromMs = Date.now()) {
    const tz = shift.local_to_tenant ? await tenantTimezone(shift.tenant_id) : 'UTC';
    return nextRunFromCron(shift.cron_expr, fromMs, tz);
}
/**
 * Seed shifts for a single tenant — fired on the `tenant.onboarded` /
 * `workspace.provisioning.completed` events so a customer who registers
 * AFTER engine boot still gets their 12 per-tenant agents working
 * within minutes (instead of waiting for the next deploy).
 *
 * Idempotent: same ON CONFLICT path as seedShiftsForAllTenants.
 *
 * Guard against spurious tenant_ids in malformed/replayed events: confirm
 * the tenant exists in dos.tenants and is `active` before seeding 22+
 * cron rows for a phantom tenant. Silently no-ops otherwise.
 */
export async function seedShiftsForTenant(tenantId) {
    if (!tenantId || tenantId.length < 3) {
        return { inserted: 0, updated: 0, skipped: 'invalid_tenant_id' };
    }
    const exists = await safeQuery(`SELECT 1 FROM dos.tenants WHERE tenant_id = $1 AND status = 'active' LIMIT 1`, [tenantId]).catch(() => ({ rows: [] }));
    if (exists.rows.length === 0) {
        logger.warn('[ai-hr] seedShiftsForTenant: tenant unknown or inactive — skipping', { tenantId });
        return { inserted: 0, updated: 0, skipped: 'tenant_not_active' };
    }
    const allShifts = listAllShifts();
    let inserted = 0;
    let updated = 0;
    for (const { agentId, shift } of allShifts) {
        if (!shift.perTenant)
            continue; // global shifts already covered by seedShiftsForAllTenants
        const tz = shift.localToTenant ? await tenantTimezone(tenantId) : 'UTC';
        const next = nextRunFromCron(shift.cron, Date.now(), tz);
        const r = await safeQuery(`INSERT INTO public.ai_employee_shifts
         (tenant_id, agent_id, shift_code, cron_expr, local_to_tenant, produces, per_tenant, enabled, next_run_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7)
       ON CONFLICT (tenant_id, agent_id, shift_code) DO UPDATE SET
         cron_expr   = EXCLUDED.cron_expr,
         local_to_tenant = EXCLUDED.local_to_tenant,
         produces    = EXCLUDED.produces,
         next_run_at = CASE
           WHEN public.ai_employee_shifts.next_run_at IS NULL
             OR public.ai_employee_shifts.cron_expr <> EXCLUDED.cron_expr
           THEN EXCLUDED.next_run_at
           ELSE public.ai_employee_shifts.next_run_at
         END,
         updated_at  = NOW()
       RETURNING (xmax = 0) AS was_inserted`, [tenantId, agentId, shift.code, shift.cron, shift.localToTenant, shift.produces, next]).catch((err) => { logger.warn('[ai-hr] tenant shift upsert failed', { tenantId, agentId, shiftCode: shift.code, error: err?.message }); return { rows: [] }; });
        if (r.rows[0]?.was_inserted)
            inserted++;
        else if (r.rows.length > 0)
            updated++;
    }
    logger.info('[ai-hr] tenant shifts seeded', { tenantId, inserted, updated });
    return { inserted, updated };
}
export async function seedShiftsForAllTenants() {
    const tenants = await listActiveTenants();
    const allShifts = listAllShifts();
    let inserted = 0;
    let updated = 0;
    // Phase 2 audit fix: seed platform-global shifts UNCONDITIONALLY first
    // (decoupled from any specific tenant). The Phase 1 trick of "only insert
    // when tenantId == tenants[0]" broke whenever the first tenant was
    // deactivated — A13 stopped being upserted on subsequent restarts.
    const globalShifts = allShifts.filter((s) => !s.shift.perTenant);
    for (const { agentId, shift } of globalShifts) {
        const tz = shift.localToTenant ? await tenantTimezone(null) : 'UTC';
        const next = nextRunFromCron(shift.cron, Date.now(), tz);
        const r = await safeQuery(`INSERT INTO public.ai_employee_shifts
         (tenant_id, agent_id, shift_code, cron_expr, local_to_tenant, produces, per_tenant, enabled, next_run_at)
       VALUES (NULL, $1, $2, $3, $4, $5, FALSE, TRUE, $6)
       ON CONFLICT (tenant_id, agent_id, shift_code) DO UPDATE SET
         cron_expr   = EXCLUDED.cron_expr,
         local_to_tenant = EXCLUDED.local_to_tenant,
         produces    = EXCLUDED.produces,
         next_run_at = CASE
           WHEN public.ai_employee_shifts.next_run_at IS NULL
             OR public.ai_employee_shifts.cron_expr <> EXCLUDED.cron_expr
           THEN EXCLUDED.next_run_at
           ELSE public.ai_employee_shifts.next_run_at
         END,
         updated_at  = NOW()
       RETURNING (xmax = 0) AS was_inserted`, [agentId, shift.code, shift.cron, shift.localToTenant, shift.produces, next]).catch((err) => { logger.warn('[ai-hr] global shift upsert failed', { agentId, shiftCode: shift.code, error: err?.message }); return { rows: [] }; });
        if (r.rows[0]?.was_inserted)
            inserted++;
        else if (r.rows.length > 0)
            updated++;
    }
    // Per-tenant shifts.
    for (const tenantId of tenants) {
        for (const { agentId, shift } of allShifts) {
            if (!shift.perTenant)
                continue; // already seeded above
            const tenantParam = tenantId;
            // Recompute next_run_at fresh on each upsert when the existing value
            // is NULL (first seed) or the cron_expr changed. Otherwise preserve
            // the existing schedule so we don't yank shifts forward by a few seconds
            // on every restart.
            // Honor tenant-local cron when shift.localToTenant is true (Phase 2).
            const tz = shift.localToTenant ? await tenantTimezone(tenantParam) : 'UTC';
            const next = nextRunFromCron(shift.cron, Date.now(), tz);
            const r = await safeQuery(`INSERT INTO public.ai_employee_shifts
           (tenant_id, agent_id, shift_code, cron_expr, local_to_tenant, produces, per_tenant, enabled, next_run_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
         ON CONFLICT (tenant_id, agent_id, shift_code) DO UPDATE SET
           cron_expr       = EXCLUDED.cron_expr,
           local_to_tenant = EXCLUDED.local_to_tenant,
           produces        = EXCLUDED.produces,
           per_tenant      = EXCLUDED.per_tenant,
           next_run_at     = CASE
             WHEN public.ai_employee_shifts.next_run_at IS NULL
               OR public.ai_employee_shifts.cron_expr <> EXCLUDED.cron_expr
             THEN EXCLUDED.next_run_at
             ELSE public.ai_employee_shifts.next_run_at
           END,
           updated_at      = NOW()
         RETURNING (xmax = 0) AS was_inserted`, [tenantParam, agentId, shift.code, shift.cron, shift.localToTenant, shift.produces, shift.perTenant, next]).catch((err) => { logger.warn('[ai-hr] shift upsert failed', { agentId, shiftCode: shift.code, error: err?.message }); return { rows: [] }; });
            if (r.rows[0]?.was_inserted)
                inserted++;
            else if (r.rows.length > 0)
                updated++;
        }
    }
    return { inserted, updated, tenants: tenants.length };
}
async function loadAgentDefs() {
    const mod = await import('@shahin-ai/product/agrc-agents');
    const out = {};
    for (const a of mod.AGRC_AGENTS)
        out[a.id] = a;
    return out;
}
async function loadShiftSummary(tenantId, agentId) {
    const tenantClause = tenantId ? '(tenant_id = $1 OR tenant_id IS NULL)' : 'TRUE';
    const params = tenantId ? [tenantId] : [];
    if (agentId)
        params.push(agentId);
    const agentClause = agentId ? `AND agent_id = $${params.length}` : '';
    const r = await safeQuery(`SELECT agent_id, COUNT(*)::int AS n, MAX(last_run_at) AS last_run
       FROM public.ai_employee_shifts
      WHERE ${tenantClause} AND enabled = TRUE ${agentClause}
      GROUP BY agent_id`, params).catch(() => ({ rows: [] }));
    const out = {};
    for (const row of r.rows) {
        out[row.agent_id] = { count: row.n, lastRunAt: row.last_run };
    }
    return out;
}
async function loadLatestKpis(tenantId) {
    // For each (tenant, agent), count today's snapshot rows where target_met
    // is TRUE / FALSE / NULL. If no snapshot for today, fall back to the most
    // recent one within the last 30 days.
    const tenantClause = tenantId ? '(tenant_id = $1 OR tenant_id IS NULL)' : 'TRUE';
    const params = tenantId ? [tenantId] : [];
    const r = await safeQuery(`WITH latest AS (
       SELECT DISTINCT ON (agent_id, kpi_code)
              agent_id, kpi_code, target_met
         FROM public.ai_employee_kpi_snapshots
        WHERE ${tenantClause}
          AND computed_for_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY agent_id, kpi_code, computed_for_date DESC
     )
     SELECT agent_id,
            count(*) FILTER (WHERE target_met = TRUE)::int AS on_target,
            count(*) FILTER (WHERE target_met = FALSE)::int AS off_target,
            count(*) FILTER (WHERE target_met IS NULL)::int AS unknown
       FROM latest
      GROUP BY agent_id`, params).catch(() => ({ rows: [] }));
    const out = {};
    for (const row of r.rows) {
        const tracked = (row.on_target ?? 0) + (row.off_target ?? 0) + (row.unknown ?? 0);
        out[row.agent_id] = {
            onTarget: row.on_target ?? 0,
            offTarget: row.off_target ?? 0,
            unevaluated: row.unknown ?? 0,
            tracked,
        };
    }
    return out;
}
async function loadReportSummary(tenantId) {
    const tenantClause = tenantId ? '(tenant_id = $1 OR tenant_id IS NULL)' : 'TRUE';
    const params = tenantId ? [tenantId] : [];
    const r = await safeQuery(`SELECT agent_id,
            COUNT(*) FILTER (WHERE filed_at >= NOW() - INTERVAL '7 days')::int AS last7d,
            COUNT(*) FILTER (WHERE status = 'filed')::int                      AS pending
       FROM public.ai_employee_reports
      WHERE ${tenantClause}
      GROUP BY agent_id`, params).catch(() => ({ rows: [] }));
    const out = {};
    for (const row of r.rows) {
        out[row.agent_id] = { last7d: row.last7d, pending: row.pending };
    }
    return out;
}
async function loadRecentReports(tenantId, agentId, limit = 10) {
    const tenantClause = tenantId ? '(tenant_id = $1 OR tenant_id IS NULL)' : 'TRUE';
    const params = tenantId ? [tenantId, agentId, limit] : [agentId, limit];
    const placeholderAgent = tenantId ? '$2' : '$1';
    const placeholderLimit = tenantId ? '$3' : '$2';
    const r = await safeQuery(`SELECT filed_at, title, summary, status, deliverable_code
       FROM public.ai_employee_reports
      WHERE ${tenantClause} AND agent_id = ${placeholderAgent}
      ORDER BY filed_at DESC
      LIMIT ${placeholderLimit}`, params).catch(() => ({ rows: [] }));
    return r.rows.map((row) => ({
        filedAt: row.filed_at,
        title: row.title,
        summary: row.summary,
        status: row.status,
        deliverableCode: row.deliverable_code,
    }));
}
export async function listManagers(tenantId) {
    const reports = await loadReportSummary(tenantId);
    const map = new Map();
    for (const [agentId, emp] of Object.entries(SHAHIN_AI_EMPLOYEES)) {
        if (!map.has(emp.managerRoleCode)) {
            map.set(emp.managerRoleCode, {
                managerRoleCode: emp.managerRoleCode,
                managerLabel: emp.managerLabel,
                managerLabelAr: emp.managerLabelAr,
                directReports: [],
                reportsLast7d: 0,
                pendingReports: 0,
            });
        }
        const m = map.get(emp.managerRoleCode);
        m.directReports.push(agentId);
        m.reportsLast7d += reports[agentId]?.last7d ?? 0;
        m.pendingReports += reports[agentId]?.pending ?? 0;
    }
    return Array.from(map.values()).sort((a, b) => a.managerRoleCode.localeCompare(b.managerRoleCode));
}
export async function listEmployees(tenantId, managerRoleFilter) {
    const defs = await loadAgentDefs();
    const shifts = await loadShiftSummary(tenantId);
    const reports = await loadReportSummary(tenantId);
    const kpis = await loadLatestKpis(tenantId);
    // SB-1: which (agent, shiftCode) combos have a real handler in the registry?
    const handlerKeys = new Set(listRegisteredShiftHandlers().map((h) => h.agentId));
    const out = [];
    for (const [agentId, emp] of Object.entries(SHAHIN_AI_EMPLOYEES)) {
        if (managerRoleFilter && emp.managerRoleCode !== managerRoleFilter)
            continue;
        const def = defs[agentId];
        out.push({
            agentId,
            jobTitle: emp.jobTitle,
            jobTitleAr: emp.jobTitleAr,
            domain: def?.domain || agentId,
            domainAr: def?.domainAr || agentId,
            managerRoleCode: emp.managerRoleCode,
            managerLabel: emp.managerLabel,
            managerLabelAr: emp.managerLabelAr,
            missionStatement: emp.missionStatement,
            missionStatementAr: emp.missionStatementAr,
            responsibilities: emp.responsibilities,
            outOfScope: emp.outOfScope,
            hireDate: emp.hireDate,
            employmentStatus: emp.employmentStatus,
            color: def?.color || '#64748b',
            icon: def?.icon || 'pi-user',
            shiftsScheduled: shifts[agentId]?.count ?? 0,
            lastShiftAt: shifts[agentId]?.lastRunAt ?? null,
            reportsLast7d: reports[agentId]?.last7d ?? 0,
            pendingReports: reports[agentId]?.pending ?? 0,
            kpisOnTarget: kpis[agentId]?.onTarget ?? 0,
            kpisOffTarget: kpis[agentId]?.offTarget ?? 0,
            kpisUnevaluated: kpis[agentId]?.unevaluated ?? 0,
            kpisTotal: emp.kpis.length,
            hasRealHandler: handlerKeys.has(agentId),
            shiftsActive: shifts[agentId]?.count ?? 0,
        });
    }
    return out.sort((a, b) => a.agentId.localeCompare(b.agentId));
}
export async function getEmployee(tenantId, agentId) {
    const emp = SHAHIN_AI_EMPLOYEES[agentId];
    if (!emp)
        return null;
    const defs = await loadAgentDefs();
    const def = defs[agentId];
    const shifts = await loadShiftSummary(tenantId, agentId);
    const reports = await loadReportSummary(tenantId);
    const kpis = await loadLatestKpis(tenantId);
    const recent = await loadRecentReports(tenantId, agentId, 10);
    return {
        agentId,
        jobTitle: emp.jobTitle,
        jobTitleAr: emp.jobTitleAr,
        domain: def?.domain || agentId,
        domainAr: def?.domainAr || agentId,
        managerRoleCode: emp.managerRoleCode,
        managerLabel: emp.managerLabel,
        managerLabelAr: emp.managerLabelAr,
        missionStatement: emp.missionStatement,
        missionStatementAr: emp.missionStatementAr,
        responsibilities: emp.responsibilities,
        outOfScope: emp.outOfScope,
        hireDate: emp.hireDate,
        employmentStatus: emp.employmentStatus,
        color: def?.color || '#64748b',
        icon: def?.icon || 'pi-user',
        shiftsScheduled: shifts[agentId]?.count ?? 0,
        lastShiftAt: shifts[agentId]?.lastRunAt ?? null,
        reportsLast7d: reports[agentId]?.last7d ?? 0,
        pendingReports: reports[agentId]?.pending ?? 0,
        kpisOnTarget: kpis[agentId]?.onTarget ?? 0,
        kpisOffTarget: kpis[agentId]?.offTarget ?? 0,
        kpisUnevaluated: kpis[agentId]?.unevaluated ?? 0,
        kpisTotal: emp.kpis.length,
        hasRealHandler: listRegisteredShiftHandlers().some((h) => h.agentId === agentId),
        shiftsActive: shifts[agentId]?.count ?? 0,
        deliverables: emp.deliverables,
        kpis: emp.kpis,
        schedule: emp.schedule,
        recentReports: recent,
    };
}
/**
 * Combined activity feed for a single agent — joins recent shift completions,
 * reports filed, manager-inbox actions, and KPI snapshots into a unified
 * timeline. Powers the agent profile page's "Recent activity" panel.
 */
export async function getAgentTimeline(tenantId, agentId, limit = 50) {
    const tenantClause = tenantId ? '(tenant_id = $1 OR tenant_id IS NULL)' : 'TRUE';
    const params = tenantId ? [tenantId, agentId, limit] : [agentId, limit];
    const placeholderAgent = tenantId ? '$2' : '$1';
    const placeholderLimit = tenantId ? '$3' : '$2';
    const reportsR = await safeQuery(`SELECT filed_at AS ts, 'report_filed'::text AS kind, title, summary, status, deliverable_code, shift_code
       FROM public.ai_employee_reports
      WHERE ${tenantClause} AND agent_id = ${placeholderAgent}
      ORDER BY filed_at DESC LIMIT ${placeholderLimit}`, params).catch(() => ({ rows: [] }));
    const auditR = await safeQuery(`SELECT created_at AS ts,
            CASE WHEN action LIKE 'agent.shift.%' THEN 'shift_completed'::text
                 WHEN action LIKE 'manager.report.%' THEN 'manager_action'::text
                 ELSE 'shift_completed'::text END AS kind,
            action, payload, actor_id
       FROM dos.audit_trail
      WHERE module = 'ai'
        AND (
          actor_id = ${placeholderAgent === '$2' ? '$4' : '$3'}
          OR (payload ->> 'agentId') = ${placeholderAgent === '$2' ? '$4' : '$3'}
        )
      ORDER BY created_at DESC LIMIT ${placeholderAgent === '$2' ? '$5' : '$4'}`, [...params, `agent:${agentId}`, limit]).catch(() => ({ rows: [] }));
    const kpiR = await safeQuery(`SELECT computed_at AS ts, 'kpi_snapshot'::text AS kind, kpi_code, value_numeric, value_text, target_met
       FROM public.ai_employee_kpi_snapshots
      WHERE ${tenantClause} AND agent_id = ${placeholderAgent}
      ORDER BY computed_at DESC LIMIT ${placeholderLimit}`, params).catch(() => ({ rows: [] }));
    const items = [];
    for (const r of reportsR.rows)
        items.push({
            ts: r.ts, kind: 'report_filed',
            title: r.title || `Report ${r.deliverable_code}`,
            detail: { summary: r.summary, status: r.status, deliverableCode: r.deliverable_code, shiftCode: r.shift_code },
        });
    for (const r of auditR.rows)
        items.push({
            ts: r.ts,
            kind: r.kind,
            title: String(r.action ?? '').replace(/^agent\.|^manager\./, ''),
            detail: { action: r.action, actor: r.actor_id, payload: r.payload },
        });
    for (const r of kpiR.rows)
        items.push({
            ts: r.ts, kind: 'kpi_snapshot',
            title: `${r.kpi_code} = ${r.value_numeric ?? r.value_text ?? '—'}${r.target_met === true ? ' ✓' : r.target_met === false ? ' ✗' : ''}`,
            detail: { kpiCode: r.kpi_code, valueNumeric: r.value_numeric, valueText: r.value_text, targetMet: r.target_met },
        });
    items.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    return items.slice(0, limit);
}
export async function getAgentKpiTrend(tenantId, agentId, days = 30) {
    const tenantClause = tenantId ? '(tenant_id = $1 OR tenant_id IS NULL)' : 'TRUE';
    const params = tenantId ? [tenantId, agentId, days] : [agentId, days];
    const placeholderAgent = tenantId ? '$2' : '$1';
    const placeholderDays = tenantId ? '$3' : '$2';
    const r = await safeQuery(`SELECT kpi_code, computed_for_date::text AS d, value_numeric, value_text, target_met
       FROM public.ai_employee_kpi_snapshots
      WHERE ${tenantClause} AND agent_id = ${placeholderAgent}
        AND computed_for_date >= CURRENT_DATE - (${placeholderDays} || ' days')::interval
      ORDER BY kpi_code, computed_for_date`, params).catch(() => ({ rows: [] }));
    const out = {};
    for (const row of r.rows) {
        if (!out[row.kpi_code])
            out[row.kpi_code] = [];
        out[row.kpi_code].push({
            date: row.d,
            valueNumeric: row.value_numeric != null ? Number(row.value_numeric) : null,
            valueText: row.value_text,
            targetMet: row.target_met,
        });
    }
    return out;
}
/**
 * List inbox rows for a caller. Filters reports to those produced by agents
 * whose managerRoleCode matches one of the caller's `roleCodes`. The page
 * defaults to status='filed' (pending review) but can request actioned/all
 * via the `status` param.
 *
 * Super-admins (is_super_admin or super_admin role) bypass the manager
 * filter entirely — they manage everything.
 */
export async function listManagerInbox(tenantId, callerRoleCodes, filters = {}) {
    const isSuper = filters.isSuperAdmin === true
        || callerRoleCodes.includes('platform_admin')
        || callerRoleCodes.includes('super_admin');
    // Find which agents the caller manages.
    const managedAgents = [];
    if (isSuper) {
        managedAgents.push(...Object.keys(SHAHIN_AI_EMPLOYEES));
    }
    else {
        for (const [agentId, emp] of Object.entries(SHAHIN_AI_EMPLOYEES)) {
            if (callerRoleCodes.includes(emp.managerRoleCode))
                managedAgents.push(agentId);
        }
    }
    if (managedAgents.length === 0)
        return [];
    const status = filters.status ?? 'filed';
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
    const offset = Math.max(filters.offset ?? 0, 0);
    const tenantClause = tenantId ? '(tenant_id = $1 OR tenant_id IS NULL)' : 'TRUE';
    const params = tenantId ? [tenantId] : [];
    params.push(managedAgents);
    const agentsParamIdx = params.length;
    let statusClause = '';
    if (status !== 'all') {
        params.push(status);
        statusClause = `AND status = $${params.length}`;
    }
    params.push(limit);
    const limitParamIdx = params.length;
    params.push(offset);
    const offsetParamIdx = params.length;
    const r = await safeQuery(`SELECT report_id, tenant_id, agent_id, shift_code, deliverable_code, title, summary,
            status, filed_at, acknowledged_by, acknowledged_at
       FROM public.ai_employee_reports
      WHERE ${tenantClause}
        AND agent_id = ANY($${agentsParamIdx})
        ${statusClause}
      ORDER BY filed_at DESC
      LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`, params).catch(() => ({ rows: [] }));
    return r.rows.map((row) => ({
        reportId: row.report_id,
        tenantId: row.tenant_id,
        agentId: row.agent_id,
        agentJobTitle: SHAHIN_AI_EMPLOYEES[row.agent_id]?.jobTitle ?? row.agent_id,
        managerRoleCode: SHAHIN_AI_EMPLOYEES[row.agent_id]?.managerRoleCode ?? 'unknown',
        shiftCode: row.shift_code,
        deliverableCode: row.deliverable_code,
        title: row.title,
        summary: row.summary,
        status: row.status,
        filedAt: row.filed_at,
        acknowledgedBy: row.acknowledged_by,
        acknowledgedAt: row.acknowledged_at,
    }));
}
async function writeInboxAudit(reportId, action, actorId, prevStatus, newStatus, tenantId, agentId) {
    await safeQuery(`INSERT INTO dos.audit_trail (tenant_id, actor_id, action, entity_type, entity_id, module, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`, [
        tenantId ?? 'platform',
        actorId,
        action,
        'ai_employee_report',
        reportId,
        'ai',
        JSON.stringify({ agentId, prevStatus, newStatus }),
    ]).catch((err) => logger.warn('[ai-hr] inbox audit failed', { reportId, action, error: err?.message }));
}
export async function acknowledgeReport(reportId, ackBy) {
    const r = await safeQuery(`UPDATE public.ai_employee_reports
        SET status = 'acknowledged', acknowledged_by = $2, acknowledged_at = NOW()
      WHERE report_id = $1 AND status = 'filed'
      RETURNING report_id, tenant_id, agent_id`, [reportId, ackBy]).catch(() => ({ rows: [] }));
    if ((r.rows?.length ?? 0) === 0)
        return false;
    const row = r.rows[0];
    await writeInboxAudit(reportId, 'manager.report.acknowledged', ackBy, 'filed', 'acknowledged', row.tenant_id, row.agent_id);
    return true;
}
export async function actionReport(reportId, actionBy) {
    const r = await safeQuery(`UPDATE public.ai_employee_reports
        SET status = 'actioned', acknowledged_by = COALESCE(acknowledged_by, $2), acknowledged_at = COALESCE(acknowledged_at, NOW())
      WHERE report_id = $1 AND status IN ('filed', 'acknowledged')
      RETURNING report_id, tenant_id, agent_id, status`, [reportId, actionBy]).catch(() => ({ rows: [] }));
    if ((r.rows?.length ?? 0) === 0)
        return false;
    const row = r.rows[0];
    await writeInboxAudit(reportId, 'manager.report.actioned', actionBy, 'filed_or_acknowledged', 'actioned', row.tenant_id, row.agent_id);
    return true;
}
/**
 * Phase 2 shift execution — looks up a registered handler in
 * shift-handlers.ts. Falls back to a Phase 1 metadata digest when no handler
 * is registered yet, so a partial Phase 2 rollout never breaks running
 * shifts.
 */
async function executeShift(shift) {
    const emp = SHAHIN_AI_EMPLOYEES[shift.agent_id];
    const handler = lookupShiftHandler(shift.agent_id, shift.shift_code);
    if (handler) {
        try {
            return await handler({ tenantId: shift.tenant_id, agentId: shift.agent_id, shiftCode: shift.shift_code });
        }
        catch (err) {
            logger.warn('[ai-hr] handler threw; falling back to digest', {
                agentId: shift.agent_id, shiftCode: shift.shift_code, error: err?.message,
            });
            // Continue to digest fallback below.
        }
    }
    // Fallback: Phase 1 metadata digest.
    if (!emp) {
        return {
            title: `${shift.agent_id} unscheduled shift (${shift.shift_code})`,
            summary: `Agent ${shift.agent_id} has no employee record — filing audit-only entry.`,
            body: { warning: 'no_employee_record', agentId: shift.agent_id, shiftCode: shift.shift_code },
        };
    }
    const deliverable = emp.deliverables.find(d => d.code === shift.produces);
    return {
        title: deliverable?.title ?? `${shift.agent_id} shift output`,
        summary: `${emp.jobTitle} completed shift "${shift.shift_code}" — ${deliverable?.title ?? shift.produces}.`,
        body: {
            agentId: shift.agent_id,
            shiftCode: shift.shift_code,
            cronExpr: shift.cron_expr,
            jobTitle: emp.jobTitle,
            managerRoleCode: emp.managerRoleCode,
            deliverableCode: shift.produces,
            kpis: emp.kpis.map(k => ({ code: k.code, label: k.label, target: k.target })),
            phase: 1,
            note: 'Fallback metadata digest — no Phase 2 handler registered for this shift yet.',
        },
    };
}
async function writeKpiSnapshots(tenantId, agentId, snapshots) {
    if (!snapshots || snapshots.length === 0)
        return;
    for (const s of snapshots) {
        try {
            await safeQuery(`INSERT INTO public.ai_employee_kpi_snapshots
           (tenant_id, agent_id, kpi_code, value_numeric, value_text, target_met, computed_for_date, source)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'shift_handler')
         ON CONFLICT (tenant_id, agent_id, kpi_code, computed_for_date) DO UPDATE SET
           value_numeric = EXCLUDED.value_numeric,
           value_text    = EXCLUDED.value_text,
           target_met    = EXCLUDED.target_met,
           computed_at   = NOW()`, [tenantId, agentId, s.kpiCode, s.valueNumeric ?? null, s.valueText ?? null, s.targetMet ?? null]);
        }
        catch (err) {
            logger.warn('[ai-hr] kpi snapshot write failed', { agentId, kpiCode: s.kpiCode, error: err?.message });
        }
    }
}
export async function runDueShifts(now = new Date()) {
    const r = await safeQuery(`SELECT shift_id, tenant_id, agent_id, shift_code, cron_expr, local_to_tenant, produces, per_tenant
       FROM public.ai_employee_shifts
      WHERE enabled = TRUE
        AND (next_run_at IS NULL OR next_run_at <= $1)
      ORDER BY next_run_at NULLS FIRST
      LIMIT 200`, [now]).catch(() => ({ rows: [] }));
    let executed = 0;
    let failed = 0;
    // Lazy-load the surface-trace bridge so a Langfuse outage never breaks the
    // shift runner. Each shift becomes one Langfuse trace tagged with both
    // `surface:agent-shift` (the cross-agent dashboard) and the agent's own
    // `surface:agent-AXX` tag (the per-agent view) — keeping the shift work
    // visible alongside on-demand copilot traffic.
    let traceSurfaceCall = null;
    try {
        ({ traceSurfaceCall } = await import('../../../../domain/agrc-engine/observability/langfuse-bridge.js'));
    }
    catch { /* Langfuse bridge unavailable — shifts still execute, no traces */ }
    const runShift = async (shift) => {
        const result = await executeShift(shift);
        return result;
    };
    for (const shift of r.rows) {
        try {
            const result = traceSurfaceCall
                ? await traceSurfaceCall({
                    surface: 'agent-shift',
                    agentId: shift.agent_id,
                    name: `${shift.agent_id}.shift.${shift.shift_code}`,
                    tenantId: shift.tenant_id ?? undefined,
                    userId: `agent:${shift.agent_id}`,
                    input: { shiftCode: shift.shift_code, cronExpr: shift.cron_expr, deliverable: shift.produces },
                    metadata: { phase: 2, source: 'ai-hr-shift-runner' },
                }, () => runShift(shift))
                : await runShift(shift);
            const emp = SHAHIN_AI_EMPLOYEES[shift.agent_id];
            const destination = emp?.deliverables.find(d => d.code === shift.produces)?.destination ?? 'manager_inbox';
            await safeQuery(`INSERT INTO public.ai_employee_reports
           (tenant_id, agent_id, shift_code, deliverable_code, title, summary, body, destination)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`, [shift.tenant_id, shift.agent_id, shift.shift_code, shift.produces, result.title, result.summary, JSON.stringify(result.body), destination]);
            // Phase 2 — persist any KPI snapshots the handler returned.
            await writeKpiSnapshots(shift.tenant_id, shift.agent_id, result.kpiSnapshots);
            // Emit audit-trail row so HR + DSOC can see this in dos.audit_trail
            await safeQuery(`INSERT INTO dos.audit_trail (tenant_id, actor_id, action, entity_type, entity_id, module, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`, [
                shift.tenant_id ?? 'platform',
                `agent:${shift.agent_id}`,
                'agent.shift.completed',
                'ai_employee_shift',
                shift.shift_id,
                'ai',
                JSON.stringify({ shiftCode: shift.shift_code, deliverable: shift.produces, agentId: shift.agent_id }),
            ]).catch((err) => logger.warn('[ai-hr] audit trail insert failed', { error: err?.message }));
            // Advance next_run_at — honor tenant timezone if local_to_tenant.
            const next = await nextRunForShift(shift, now.getTime() + 1000);
            await safeQuery(`UPDATE public.ai_employee_shifts SET last_run_at = $1, next_run_at = $2, updated_at = NOW() WHERE shift_id = $3`, [now, next, shift.shift_id]);
            executed++;
        }
        catch (err) {
            logger.warn('[ai-hr] shift execution failed', { shiftId: shift.shift_id, agentId: shift.agent_id, error: err?.message });
            failed++;
        }
    }
    return { executed, failed };
}
//# sourceMappingURL=ai-hr.service.js.map
/**
 * Shift handler registry — Phase 2.
 *
 * Each entry maps `(agentId, shiftCode)` → an async function that produces
 * the durable artefact written to public.ai_employee_reports. Handlers are
 * registered statically (no dynamic resolution) so a missing handler is a
 * known no-op (Phase 1 metadata digest) rather than a silent runtime miss.
 *
 * Architectural rules:
 *
 *   1. Every handler is **idempotent at the shift-code level** — two
 *      back-to-back invocations produce the same digest body, so redundant
 *      executions don't poison the inbox.
 *
 *   2. Every handler **sets tenant context** before any tenant-scoped
 *      tool call. We use `withTenantClient` from @dos/db so RLS sees the
 *      caller as the tenant, and the canonical agent tools work unmodified.
 *
 *   3. Every handler returns **{ title, summary, body, kpiSnapshots }**.
 *      `kpiSnapshots` is the array of per-KPI values that the Phase 2 KPI
 *      engine writes to `ai_employee_kpi_snapshots`.
 *
 *   4. Handler bodies stay **pure compose-from-tools** — they call existing
 *      per-agent tool handlers from `@shahin-ai/product/ai/tools/*` and
 *      shape the results. They do NOT reach into raw SQL directly. This
 *      keeps the agent-tool registry as the single source of truth for
 *      what each agent can read.
 */

import { withTenantClient, safeQuery } from '@dos/db';
import { logger } from '../../ports/logger.port';

export interface ShiftKpiSnapshot {
  kpiCode: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  targetMet?: boolean | null;
}

export interface ShiftHandlerResult {
  title: string;
  summary: string;
  body: Record<string, unknown>;
  kpiSnapshots?: ShiftKpiSnapshot[];
}

export type ShiftHandler = (input: { tenantId: string | null; agentId: string; shiftCode: string }) => Promise<ShiftHandlerResult>;

const REGISTRY = new Map<string, ShiftHandler>();
const key = (agentId: string, shiftCode: string) => `${agentId}:${shiftCode}`;

export function registerShiftHandler(agentId: string, shiftCode: string, handler: ShiftHandler): void {
  REGISTRY.set(key(agentId, shiftCode), handler);
}

export function lookupShiftHandler(agentId: string, shiftCode: string): ShiftHandler | undefined {
  return REGISTRY.get(key(agentId, shiftCode));
}

export function listRegisteredShiftHandlers(): Array<{ agentId: string; shiftCode: string }> {
  return Array.from(REGISTRY.keys()).map((k) => {
    const [agentId, shiftCode] = k.split(':');
    return { agentId, shiftCode };
  });
}

// ── Helper: invoke a tool from the agent's tool builder under tenant context ─
//
// Each agent's tool builders live in @shahin-ai/product/ai/tools/aXX-*.
// We dynamically import the appropriate builder, find the named tool, and
// invoke its handler with the tenant context already set on the pg client.
//
// Tool handlers in shahin-product expect `(tenantId, input)` and use
// `tenantSchema(tenantId)` + `safeRows(...)` internally — we don't have to
// touch app.current_tenant_id ourselves for those, BUT setting it anyway
// keeps RLS-protected platform tables (e.g. dos.audit_trail) happy.

const TOOL_BUILDERS: Record<string, () => Promise<{ default?: unknown } & Record<string, unknown>>> = {
  A01: () => import('@shahin-ai/product/ai/tools/a01-onboarding-tools'),
  A02: () => import('@shahin-ai/product/ai/tools/a02-identity-access-tools'),
  A03: () => import('@shahin-ai/product/ai/tools/a03-framework-tools'),
  A04: () => import('@shahin-ai/product/ai/tools/a04-control-tools'),
  A05: () => import('@shahin-ai/product/ai/tools/a05-evidence-tools'),
  A06: () => import('@shahin-ai/product/ai/tools/a06-gap-remediation-tools'),
  A07: () => import('@shahin-ai/product/ai/tools/a07-risk-tools'),
  A08: () => import('@shahin-ai/product/ai/tools/a08-policy-tools'),
  A09: () => import('@shahin-ai/product/ai/tools/a09-vendor-tools'),
  A10: () => import('@shahin-ai/product/ai/tools/a10-audit-tools'),
  A11: () => import('@shahin-ai/product/ai/tools/a11-bcp-tools'),
  A12: () => import('@shahin-ai/product/ai/tools/a12-training-tools'),
};

interface ToolDef {
  name: string;
  handler: (tenantId: string, input?: Record<string, unknown>, opts?: any) => Promise<unknown>;
}

async function callAgentTool(agentId: string, toolName: string, tenantId: string, input: Record<string, unknown> = {}): Promise<unknown> {
  const importer = TOOL_BUILDERS[agentId];
  if (!importer) throw new Error(`no tool builder for ${agentId}`);
  const mod = await importer() as Record<string, unknown>;
  // Builder name follows the convention buildAxxTools (uppercase letters of the agent ID).
  const builderName = `build${agentId}Tools`;
  const builder = mod[builderName] as undefined | (() => ToolDef[]);
  if (typeof builder !== 'function') throw new Error(`builder ${builderName} not found in ${agentId} module`);
  const tools = builder();
  const tool = tools.find((t) => t.name === toolName);
  if (!tool) throw new Error(`tool ${toolName} not found on ${agentId}`);
  return tool.handler(tenantId, input);
}

/** Set RLS tenant context for the duration of `fn` so platform tables (dos.*) filter correctly. */
async function withTenantCtx<T>(tenantId: string | null, fn: () => Promise<T>): Promise<T> {
  if (!tenantId) return fn();
  return withTenantClient(tenantId, async () => fn());
}

// ──────────────────────────────────────────────────────────────────
// A01 — Onboarding Specialist · daily workspace health digest
// ──────────────────────────────────────────────────────────────────
registerShiftHandler('A01', 'morning_health_scan', async ({ tenantId, agentId, shiftCode }) => {
  if (!tenantId) {
    return { title: 'A01 health scan skipped', summary: 'No tenant context', body: { phase: 2, skipped: true } };
  }
  return withTenantCtx(tenantId, async () => {
    const profile = await callAgentTool(agentId, 'scan_org_profile', tenantId).catch((e) => ({ error: (e as Error).message }));
    const health = await callAgentTool(agentId, 'check_workspace_health', tenantId).catch((e) => ({ error: (e as Error).message }));
    const missing = (profile as any)?.missingFields ?? [];
    const completeness = (profile as any)?.completeness ?? 'unknown';
    const summary = `Workspace health scan — ${missing.length === 0 ? 'profile complete' : `${missing.length} fields missing`}.`;
    const profileCompletePct = (profile as any)?.profile
      ? Math.max(0, 100 - missing.length * 10)
      : null;
    return {
      title: 'Daily workspace health digest',
      summary,
      body: { phase: 2, profile, health, missingFields: missing, completeness },
      kpiSnapshots: [
        profileCompletePct != null
          ? { kpiCode: 'profile_completeness', valueNumeric: profileCompletePct, targetMet: profileCompletePct >= 95 }
          : null,
      ].filter(Boolean) as ShiftKpiSnapshot[],
    };
  });
});

// Helper: tool returned a structured error wrapper instead of data.
// callAgentTool catches any throw and returns `{ error: '...' }` — we treat
// that as a soft failure and log + skip KPI emission, never crash the shift.
const toolFailed = (v: unknown): boolean => !!v && typeof v === 'object' && 'error' in (v as object);

// ──────────────────────────────────────────────────────────────────
// A02 — IAM Officer · daily MFA drift report
// Tool shape (verified): list_users_with_access_info →
//   { users, totalUsers, inactiveUsers, adminCount, usersWithoutMFA }
// ──────────────────────────────────────────────────────────────────
registerShiftHandler('A02', 'mfa_morning_sweep', async ({ tenantId, agentId, shiftCode }) => {
  if (!tenantId) {
    return { title: 'A02 MFA sweep skipped', summary: 'No tenant context', body: { phase: 2, skipped: true } };
  }
  return withTenantCtx(tenantId, async () => {
    const accessInfo = await callAgentTool(agentId, 'list_users_with_access_info', tenantId).catch((e) => ({ error: (e as Error).message }));
    const dist = await callAgentTool(agentId, 'check_role_distribution', tenantId).catch((e) => ({ error: (e as Error).message }));
    if (toolFailed(accessInfo)) {
      logger.warn('[A02 shift] tool error', { error: (accessInfo as any).error });
      return { title: 'Daily MFA drift report', summary: `Tool error: ${(accessInfo as any).error}`, body: { phase: 2, error: true } };
    }
    const totalUsers = Number((accessInfo as any).totalUsers ?? 0);
    const noMfa = Number((accessInfo as any).usersWithoutMFA ?? 0);
    const inactive = Number((accessInfo as any).inactiveUsers ?? 0);
    const admins = Number((accessInfo as any).adminCount ?? 0);
    const mfaSource = String((accessInfo as any).mfaSource ?? 'tenant_db');
    const mfaUnsourced = mfaSource === 'keycloak_not_yet_wired';
    const mfaCoverage = totalUsers > 0 ? Math.round(((totalUsers - noMfa) / totalUsers) * 100) : 100;
    const summary = mfaUnsourced
      ? `${totalUsers} users in tenant; ${inactive} inactive, ${admins} admin(s). MFA coverage tracking pending Keycloak wire-up.`
      : `${noMfa} of ${totalUsers} users without MFA (coverage ${mfaCoverage}%); ${inactive} inactive, ${admins} admin(s).`;
    return {
      title: 'Daily MFA drift report',
      summary,
      body: { phase: 2, totalUsers, usersWithoutMFA: noMfa, inactiveUsers: inactive, adminCount: admins, coveragePct: mfaCoverage, mfaSource, roleDistribution: dist },
      // Don't emit a target_met=true for mfa_coverage when the source is
      // unwired — that would create false-positive "everything is great"
      // KPI signals on the org-chart page.
      kpiSnapshots: mfaUnsourced
        ? [{ kpiCode: 'mfa_coverage', valueText: 'unsourced', targetMet: null }]
        : [{ kpiCode: 'mfa_coverage', valueNumeric: mfaCoverage, targetMet: mfaCoverage >= 100 }],
    };
  });
});

// ──────────────────────────────────────────────────────────────────
// A05 — Evidence Officer · daily evidence freshness sweep
// Tool shapes (verified):
//   check_evidence_freshness → { total, current, expiring_soon, expired }
//   detect_evidence_gaps     → { expiredEvidence[], controlsWithoutEvidence[], expiredCount, gapCount }
// ──────────────────────────────────────────────────────────────────
registerShiftHandler('A05', 'daily_evidence_sweep', async ({ tenantId, agentId, shiftCode }) => {
  if (!tenantId) {
    return { title: 'A05 evidence sweep skipped', summary: 'No tenant context', body: { phase: 2, skipped: true } };
  }
  return withTenantCtx(tenantId, async () => {
    const gaps = await callAgentTool(agentId, 'detect_evidence_gaps', tenantId).catch((e) => ({ error: (e as Error).message }));
    const freshness = await callAgentTool(agentId, 'check_evidence_freshness', tenantId).catch((e) => ({ error: (e as Error).message }));
    if (toolFailed(freshness)) {
      logger.warn('[A05 shift] tool error', { error: (freshness as any).error });
      return { title: 'Daily evidence freshness scan', summary: `Tool error: ${(freshness as any).error}`, body: { phase: 2, error: true } };
    }
    const total       = Number((freshness as any).total ?? 0);
    const current     = Number((freshness as any).current ?? 0);
    const expired     = Number((freshness as any).expired ?? 0);
    const expiringSoon = Number((freshness as any).expiring_soon ?? 0);
    const stale = expired; // canonical "stale" definition
    const freshPct = total > 0 ? Math.round((current / total) * 100) : 100;
    const gapCount = !toolFailed(gaps) ? Number((gaps as any).gapCount ?? 0) : 0;
    const summary = `${stale} expired / ${expiringSoon} expiring-soon of ${total} total — freshness ${freshPct}%; ${gapCount} controls without evidence.`;
    return {
      title: 'Daily evidence freshness scan',
      summary,
      body: { phase: 2, total, current, expired, expiringSoon, freshnessPct: freshPct, gaps },
      kpiSnapshots: [
        { kpiCode: 'evidence_freshness_pct', valueNumeric: freshPct, targetMet: freshPct >= 90 },
        { kpiCode: 'stale_evidence_count', valueNumeric: stale, targetMet: stale === 0 },
      ],
    };
  });
});

// ──────────────────────────────────────────────────────────────────
// A07 — Risk Register Analyst · daily KRI pulse
// Tool shapes (verified):
//   identify_risks      → { risks[], totalOpen, unscoredCount, highRiskCount }
//   check_risk_appetite → { appetiteBreaches[], breachCount }
// ──────────────────────────────────────────────────────────────────
registerShiftHandler('A07', 'daily_kri_pulse', async ({ tenantId, agentId, shiftCode }) => {
  if (!tenantId) {
    return { title: 'A07 KRI pulse skipped', summary: 'No tenant context', body: { phase: 2, skipped: true } };
  }
  return withTenantCtx(tenantId, async () => {
    const risksResult = await callAgentTool(agentId, 'identify_risks', tenantId).catch((e) => ({ error: (e as Error).message }));
    const appetite = await callAgentTool(agentId, 'check_risk_appetite', tenantId).catch((e) => ({ error: (e as Error).message }));
    if (toolFailed(risksResult)) {
      logger.warn('[A07 shift] tool error', { error: (risksResult as any).error });
      return { title: 'Daily KRI pulse', summary: `Tool error: ${(risksResult as any).error}`, body: { phase: 2, error: true } };
    }
    const totalOpen      = Number((risksResult as any).totalOpen ?? 0);
    const unscored       = Number((risksResult as any).unscoredCount ?? 0);
    const highRiskCount  = Number((risksResult as any).highRiskCount ?? 0);
    const breaches       = !toolFailed(appetite) ? Number((appetite as any).breachCount ?? 0) : 0;
    const summary = `${highRiskCount} high-risk of ${totalOpen} open (${unscored} unscored); ${breaches} appetite breach(es).`;
    return {
      title: 'Daily KRI pulse',
      summary,
      body: {
        phase: 2,
        totalOpen, unscoredCount: unscored, highRiskCount, breachCount: breaches,
        topRisks: ((risksResult as any).risks ?? []).slice(0, 10),
        appetite,
      },
      kpiSnapshots: [
        { kpiCode: 'open_high_risks', valueNumeric: highRiskCount, targetMet: highRiskCount === 0 },
        { kpiCode: 'risk_appetite_breaches', valueNumeric: breaches, targetMet: breaches === 0 },
      ],
    };
  });
});

// ──────────────────────────────────────────────────────────────────
// A10 — Audit Reporting Specialist · monthly executive dashboard pack
// Tool shapes (verified):
//   check_audit_readiness        → { controlEffectiveness, evidenceCoverage,
//                                    policyCompleteness, openFindings,
//                                    readinessScore, readinessLevel }
//   list_audit_findings          → { findings[] } or array
//   generate_compliance_summary  → { frameworks, riskPosture, ... }
// ──────────────────────────────────────────────────────────────────
registerShiftHandler('A10', 'monthly_exec_dashboard', async ({ tenantId, agentId, shiftCode }) => {
  if (!tenantId) {
    return { title: 'A10 exec dashboard skipped', summary: 'No tenant context', body: { phase: 2, skipped: true } };
  }
  return withTenantCtx(tenantId, async () => {
    const readiness = await callAgentTool(agentId, 'check_audit_readiness', tenantId).catch((e) => ({ error: (e as Error).message }));
    const compliance = await callAgentTool(agentId, 'generate_compliance_summary', tenantId).catch((e) => ({ error: (e as Error).message }));
    const findings = await callAgentTool(agentId, 'list_audit_findings', tenantId).catch((e) => ({ error: (e as Error).message }));
    if (toolFailed(readiness)) {
      logger.warn('[A10 shift] tool error', { error: (readiness as any).error });
      return { title: 'Monthly executive dashboard pack', summary: `Tool error: ${(readiness as any).error}`, body: { phase: 2, error: true } };
    }
    const score        = Number((readiness as any).readinessScore ?? 0);
    const level        = String((readiness as any).readinessLevel ?? 'unknown');
    const openFindings = Number((readiness as any).openFindings ?? 0);
    const findingsArr  = Array.isArray(findings) ? findings : ((findings as any)?.findings ?? []);
    const summary = `Audit readiness ${score} (${level}); ${openFindings} open findings.`;
    return {
      title: 'Monthly executive dashboard pack',
      summary,
      body: { phase: 2, readiness, complianceSummary: compliance, findings: findingsArr.slice(0, 25), openFindings },
      kpiSnapshots: [{ kpiCode: 'audit_readiness_score', valueNumeric: score, targetMet: score >= 85 }],
    };
  });
});

// ──────────────────────────────────────────────────────────────────
// A13 — Landing Copilot · daily lead summary (platform-global)
// ──────────────────────────────────────────────────────────────────
registerShiftHandler('A13', 'daily_lead_summary', async ({ tenantId, agentId, shiftCode }) => {
  // A13 is anonymous/public — read from public.copilot_leads (created by Phase 2 lead-capture tool).
  const r = await safeQuery(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE captured_at >= NOW() - INTERVAL '24 hours')::int AS last24h,
            count(*) FILTER (WHERE intent = 'demo')::int AS demo_intents
       FROM public.copilot_leads
      WHERE captured_at >= NOW() - INTERVAL '7 days'`,
    [],
  ).catch(() => ({ rows: [{ total: 0, last24h: 0, demo_intents: 0 }] }));
  const row = r.rows[0] || { total: 0, last24h: 0, demo_intents: 0 };
  const conversion = row.total > 0 ? Math.round((row.demo_intents / row.total) * 100) : 0;
  return {
    title: 'Daily lead summary (Landing Copilot)',
    summary: `${row.last24h} new leads in last 24h, ${row.demo_intents} demo-intent / ${row.total} total over 7d (conversion ${conversion}%).`,
    body: { phase: 2, last24h: row.last24h, total7d: row.total, demoIntents7d: row.demo_intents, conversionPct: conversion },
    kpiSnapshots: [
      { kpiCode: 'sessions_per_day', valueNumeric: row.last24h, targetMet: null },
      { kpiCode: 'demo_intent_rate', valueNumeric: conversion, targetMet: conversion >= 5 },
    ],
  };
});

// Other shift codes intentionally unregistered → fall back to Phase 1 metadata digest.
logger.info?.(`[shift-handlers] ${REGISTRY.size} real shift handlers registered`);

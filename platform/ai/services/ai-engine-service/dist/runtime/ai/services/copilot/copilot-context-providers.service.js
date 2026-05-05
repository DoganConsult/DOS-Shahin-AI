// ============================================
// Shahin-Ai — AI Copilot Context Providers
// Per-module context enrichment for the AI
// copilot. Each GRC module (A01–A10) gets a
// dedicated context provider that gathers key
// metrics, recent activity, open items, and
// actionable insights for contextual responses.
// ============================================
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
// ── Module metadata (A01–A10) ────────────────────────────────────────────────
const MODULE_META = {
    onboarding: { name: 'Onboarding & Workspace', agentId: 'A01' },
    identity: { name: 'Identity & Access', agentId: 'A02' },
    frameworks: { name: 'Frameworks & Mapping', agentId: 'A03' },
    controls: { name: 'Controls & Implementation', agentId: 'A04' },
    evidence: { name: 'Evidence & Artifacts', agentId: 'A05' },
    compliance: { name: 'Compliance & Gap Analysis', agentId: 'A06' },
    risk: { name: 'Risk Management', agentId: 'A07' },
    policies: { name: 'Policy Lifecycle', agentId: 'A08' },
    vendors: { name: 'Vendor & Third-Party', agentId: 'A09' },
    audit: { name: 'Audit & Reporting', agentId: 'A10' },
};
/** A01 – Onboarding & workspace setup */
async function onboardingCtx(schema) {
    const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, completed: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
     FROM "${schema}".onboarding_steps`), { operation: 'query onboarding_steps' });
    const r = res.rows[0];
    const pct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
    const alerts = [];
    if (pct < 100)
        alerts.push({ severity: 'info', message: `Onboarding ${pct}% complete — ${r.total - r.completed} steps remaining`, route: '/onboarding' });
    return { metrics: { totalSteps: r.total, completedSteps: r.completed, completionPct: pct }, alerts };
}
/** A02 – Identity & access governance */
async function identityCtx(schema) {
    const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, active: 0, dormant: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'active')::int AS active,
            COUNT(*) FILTER (WHERE last_login < NOW() - INTERVAL '90 days')::int AS dormant
     FROM "${schema}".users`), { operation: 'query users' });
    const r = res.rows[0];
    const alerts = [];
    if (r.dormant > 0)
        alerts.push({ severity: 'warning', message: `${r.dormant} user(s) dormant for 90+ days — review access`, route: '/identity/users' });
    return { metrics: { totalUsers: r.total, activeUsers: r.active, dormantUsers: r.dormant }, alerts };
}
/** A03 – Frameworks & cross-mapping */
async function frameworksCtx(schema) {
    const [fw, maps] = await Promise.all([
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, active: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active FROM "${schema}".frameworks`), { operation: 'query frameworks' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ mappings: 0 }]), safeQuery(`SELECT COUNT(*)::int AS mappings FROM "${schema}".control_mappings`), { operation: 'query frameworks' }),
    ]);
    const alerts = [];
    if (maps.rows[0].mappings === 0 && fw.rows[0].active > 1) {
        alerts.push({ severity: 'info', message: 'Multiple frameworks active but no cross-mappings — harmonization reduces effort', route: '/frameworks/mappings' });
    }
    return { metrics: { totalFrameworks: fw.rows[0].total, activeFrameworks: fw.rows[0].active, controlMappings: maps.rows[0].mappings }, alerts };
}
/** A04 – Controls & implementation */
async function controlsCtx(schema) {
    const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, implemented: 0, ineffective: 0, draft: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE implementation_status = 'implemented')::int AS implemented,
            COUNT(*) FILTER (WHERE effectiveness = 'ineffective')::int AS ineffective,
            COUNT(*) FILTER (WHERE status = 'draft')::int AS draft
     FROM "${schema}".controls`), { operation: 'query controls' });
    const r = res.rows[0];
    const implRate = r.total > 0 ? Math.round((r.implemented / r.total) * 100) : 0;
    const alerts = [];
    if (r.ineffective > 0)
        alerts.push({ severity: 'warning', message: `${r.ineffective} control(s) marked ineffective — remediation needed`, route: '/controls' });
    return { metrics: { totalControls: r.total, implementedControls: r.implemented, ineffectiveControls: r.ineffective, draftControls: r.draft, implementationRate: implRate }, alerts };
}
/** A05 – Evidence & artifacts */
async function evidenceCtx(schema) {
    const [ev, req] = await Promise.all([
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, expiring: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < NOW() + INTERVAL '30 days' AND expiry_date > NOW())::int AS expiring FROM "${schema}".evidence`), { operation: 'query evidence' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ pending: 0, overdue: 0 }]), safeQuery(`SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending, COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('approved','cancelled'))::int AS overdue FROM "${schema}".evidence_requests`), { operation: 'query evidence' }),
    ]);
    const alerts = [];
    if (req.rows[0].overdue > 0)
        alerts.push({ severity: 'warning', message: `${req.rows[0].overdue} overdue evidence request(s)`, route: '/evidence/requests' });
    if (ev.rows[0].expiring > 0)
        alerts.push({ severity: 'info', message: `${ev.rows[0].expiring} evidence item(s) expiring within 30 days`, route: '/evidence' });
    return { metrics: { totalEvidence: ev.rows[0].total, expiringSoon: ev.rows[0].expiring, pendingRequests: req.rows[0].pending, overdueRequests: req.rows[0].overdue }, alerts };
}
/** A06 – Compliance & gap analysis */
async function complianceCtx(schema) {
    const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, open: 0, critical: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'open')::int AS open,
            COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical
     FROM "${schema}".compliance_gaps`), { operation: 'query compliance_gaps' });
    const r = res.rows[0];
    const alerts = [];
    if (r.critical > 0)
        alerts.push({ severity: 'critical', message: `${r.critical} critical compliance gap(s) require immediate attention`, route: '/compliance/gaps' });
    return { metrics: { totalGaps: r.total, openGaps: r.open, criticalGaps: r.critical }, alerts };
}
/** A07 – Risk management */
async function riskCtx(schema) {
    const [risks, kris] = await Promise.all([
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, critical: 0, high: 0, avg_score: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE risk_level IN ('critical'))::int AS critical, COUNT(*) FILTER (WHERE risk_level = 'high')::int AS high, COALESCE(AVG(risk_score),0)::int AS avg_score FROM "${schema}".risks`), { operation: 'query risks' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, breached: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE current_value > threshold_value)::int AS breached FROM "${schema}".key_risk_indicators`), { operation: 'query risks' }),
    ]);
    const r = risks.rows[0];
    const k = kris.rows[0];
    const alerts = [];
    if (r.critical > 0)
        alerts.push({ severity: 'critical', message: `${r.critical} risk(s) in critical zone`, route: '/risk/register' });
    if (k.breached > 0)
        alerts.push({ severity: 'warning', message: `${k.breached} KRI(s) breached thresholds`, route: '/risk/kris' });
    return { metrics: { totalRisks: r.total, criticalRisks: r.critical, highRisks: r.high, avgRiskScore: r.avg_score, totalKRIs: k.total, breachedKRIs: k.breached }, alerts };
}
/** A08 – Policy lifecycle */
async function policiesCtx(schema) {
    const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, expired: 0, pending: 0, overdue_review: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'expired')::int AS expired,
            COUNT(*) FILTER (WHERE status = 'pending_approval')::int AS pending,
            COUNT(*) FILTER (WHERE review_date < NOW())::int AS overdue_review
     FROM "${schema}".policies`), { operation: 'query policies' });
    const r = res.rows[0];
    const alerts = [];
    if (r.expired > 0)
        alerts.push({ severity: 'warning', message: `${r.expired} policy/policies expired — renewal required`, route: '/policies' });
    if (r.overdue_review > 0)
        alerts.push({ severity: 'info', message: `${r.overdue_review} policy/policies overdue for periodic review`, route: '/policies' });
    return { metrics: { totalPolicies: r.total, expiredPolicies: r.expired, pendingApproval: r.pending, overdueReview: r.overdue_review }, alerts };
}
/** A09 – Vendor & third-party risk */
async function vendorsCtx(schema) {
    const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, high_risk: 0, overdue: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE risk_tier IN ('critical','high'))::int AS high_risk,
            COUNT(*) FILTER (WHERE reassessment_due < NOW())::int AS overdue
     FROM "${schema}".vendor_profiles`), { operation: 'query vendor_profiles' });
    const r = res.rows[0];
    const alerts = [];
    if (r.high_risk > 0)
        alerts.push({ severity: 'warning', message: `${r.high_risk} vendor(s) in high/critical risk tier`, route: '/vendors' });
    if (r.overdue > 0)
        alerts.push({ severity: 'info', message: `${r.overdue} vendor reassessment(s) overdue`, route: '/vendors' });
    return { metrics: { totalVendors: r.total, highRiskVendors: r.high_risk, overdueReassessments: r.overdue }, alerts };
}
/** A10 – Audit & reporting */
async function auditCtx(schema) {
    const [eng, findings] = await Promise.all([
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, active: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'in_progress')::int AS active FROM "${schema}".audit_engagements`), { operation: 'query audit_engagements' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, open: 0, critical: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'open')::int AS open, COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'open')::int AS critical FROM "${schema}".audit_findings`), { operation: 'query audit_engagements' }),
    ]);
    const alerts = [];
    if (findings.rows[0].critical > 0)
        alerts.push({ severity: 'critical', message: `${findings.rows[0].critical} critical audit finding(s) open`, route: '/audit/findings' });
    return { metrics: { totalEngagements: eng.rows[0].total, activeEngagements: eng.rows[0].active, totalFindings: findings.rows[0].total, openFindings: findings.rows[0].open, criticalFindings: findings.rows[0].critical }, alerts };
}
// ── Provider registry ────────────────────────────────────────────────────────
const PROVIDERS = {
    onboarding: onboardingCtx,
    identity: identityCtx,
    frameworks: frameworksCtx,
    controls: controlsCtx,
    evidence: evidenceCtx,
    compliance: complianceCtx,
    risk: riskCtx,
    policies: policiesCtx,
    vendors: vendorsCtx,
    audit: auditCtx,
};
// ── Public API ───────────────────────────────────────────────────────────────
/**
 * Retrieve enriched context for a single GRC module.
 * Used by the copilot to ground agent responses in real tenant data.
 */
export async function getModuleContext(tenantId, moduleKey) {
    const meta = MODULE_META[moduleKey];
    if (!meta)
        return null;
    const schema = tenantSchema(tenantId);
    const provider = PROVIDERS[moduleKey];
    const partial = provider ? await provider(schema) : {};
    return {
        moduleKey,
        moduleName: meta.name,
        agentId: meta.agentId,
        metrics: partial.metrics ?? {},
        recentActivity: partial.recentActivity ?? [],
        openItems: partial.openItems ?? [],
        alerts: partial.alerts ?? [],
        lastUpdated: new Date().toISOString(),
    };
}
/**
 * Gather aggregated context across all ten modules.
 * Suitable for dashboard-level copilot grounding without excessive DB load.
 */
export async function getFullContext(tenantId) {
    const schema = tenantSchema(tenantId);
    const moduleResults = await Promise.all(Object.keys(PROVIDERS).map(async (key) => {
        try {
            return await getModuleContext(tenantId, key);
        }
        catch {
            return null;
        }
    }));
    const modules = moduleResults.filter(Boolean);
    const crossModuleAlerts = [];
    // Cross-module critical-alert escalation
    const allCritical = modules.flatMap(m => m.alerts).filter(a => a.severity === 'critical');
    if (allCritical.length >= 3) {
        crossModuleAlerts.push({
            severity: 'critical',
            message: `${allCritical.length} critical alerts across multiple modules — coordinated response recommended`,
        });
    }
    // Overall health score (if available)
    const healthRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT overall_score FROM "${schema}".governance_health_scores ORDER BY created_at DESC LIMIT 1`), { operation: 'query governance_health_scores' });
    return {
        tenantId,
        generatedAt: new Date().toISOString(),
        modules,
        crossModuleAlerts,
        healthScore: Number(healthRes.rows[0]?.overall_score) || 0,
    };
}
// ── Proactive Suggestions ────────────────────────────────────────────────────
/**
 * Analyze context across all modules and produce prioritized proactive suggestions.
 * The copilot surfaces these to help users take the next best action.
 */
export async function getProactiveSuggestions(tenantId) {
    const ctx = await getFullContext(tenantId);
    const suggestions = [];
    let id = 0;
    for (const mod of ctx.modules) {
        const m = mod.metrics;
        const meta = MODULE_META[mod.moduleKey];
        if (!meta)
            continue;
        // A01 – Incomplete onboarding blocks full GRC capability
        if (mod.moduleKey === 'onboarding' && (m.completionPct ?? 100) < 100) {
            suggestions.push({ id: String(++id), moduleKey: mod.moduleKey, agentId: meta.agentId, type: 'action', title: 'Complete workspace onboarding', description: `Onboarding is ${m.completionPct}% done. Finishing setup unlocks all GRC modules.`, priority: 'high', route: '/onboarding' });
        }
        // A04 – Low implementation rate or ineffective controls
        if (mod.moduleKey === 'controls') {
            if ((m.implementationRate ?? 100) < 50) {
                suggestions.push({ id: String(++id), moduleKey: mod.moduleKey, agentId: meta.agentId, type: 'warning', title: 'Low control implementation rate', description: `Only ${m.implementationRate}% of controls implemented. Prioritize implementation.`, priority: 'high', route: '/controls' });
            }
            if ((m.ineffectiveControls ?? 0) > 0) {
                suggestions.push({ id: String(++id), moduleKey: mod.moduleKey, agentId: meta.agentId, type: 'action', title: 'Remediate ineffective controls', description: `${m.ineffectiveControls} control(s) ineffective — consider redesign or additional testing.`, priority: 'high', suggestedAction: 'Launch control remediation', route: '/controls' });
            }
        }
        // A05 – Overdue evidence requests
        if (mod.moduleKey === 'evidence' && (m.overdueRequests ?? 0) > 0) {
            suggestions.push({ id: String(++id), moduleKey: mod.moduleKey, agentId: meta.agentId, type: 'action', title: 'Collect overdue evidence', description: `${m.overdueRequests} evidence request(s) past due — may affect audit readiness.`, priority: 'high', suggestedAction: 'Trigger bulk evidence collection', route: '/evidence/requests' });
        }
        // A06 – Critical compliance gaps
        if (mod.moduleKey === 'compliance' && (m.criticalGaps ?? 0) > 0) {
            suggestions.push({ id: String(++id), moduleKey: mod.moduleKey, agentId: meta.agentId, type: 'action', title: 'Address critical compliance gaps', description: `${m.criticalGaps} critical gap(s) need immediate remediation.`, priority: 'critical', suggestedAction: 'Generate remediation roadmap', route: '/compliance/gaps' });
        }
        // A07 – Critical risks and breached KRIs
        if (mod.moduleKey === 'risk') {
            if ((m.criticalRisks ?? 0) > 0) {
                suggestions.push({ id: String(++id), moduleKey: mod.moduleKey, agentId: meta.agentId, type: 'action', title: 'Review critical risks', description: `${m.criticalRisks} risk(s) in critical zone — treatment plans needed.`, priority: 'critical', route: '/risk/register' });
            }
            if ((m.breachedKRIs ?? 0) > 0) {
                suggestions.push({ id: String(++id), moduleKey: mod.moduleKey, agentId: meta.agentId, type: 'warning', title: 'KRI threshold breaches', description: `${m.breachedKRIs} key risk indicator(s) exceeded thresholds.`, priority: 'high', route: '/risk/kris' });
            }
        }
        // A08 – Expired policies
        if (mod.moduleKey === 'policies' && (m.expiredPolicies ?? 0) > 0) {
            suggestions.push({ id: String(++id), moduleKey: mod.moduleKey, agentId: meta.agentId, type: 'warning', title: 'Renew expired policies', description: `${m.expiredPolicies} policy/policies expired — renewal required.`, priority: 'high', route: '/policies' });
        }
        // A09 – High-risk vendors
        if (mod.moduleKey === 'vendors' && (m.highRiskVendors ?? 0) > 0) {
            suggestions.push({ id: String(++id), moduleKey: mod.moduleKey, agentId: meta.agentId, type: 'warning', title: 'Reassess high-risk vendors', description: `${m.highRiskVendors} vendor(s) in high/critical risk tier.`, priority: 'high', route: '/vendors' });
        }
        // A10 – Critical audit findings
        if (mod.moduleKey === 'audit' && (m.criticalFindings ?? 0) > 0) {
            suggestions.push({ id: String(++id), moduleKey: mod.moduleKey, agentId: meta.agentId, type: 'action', title: 'Resolve critical audit findings', description: `${m.criticalFindings} critical finding(s) need corrective action plans.`, priority: 'critical', suggestedAction: 'Create CAPA for each finding', route: '/audit/findings' });
        }
        // A03 – Missing cross-framework mappings
        if (mod.moduleKey === 'frameworks' && (m.controlMappings ?? 0) === 0 && (m.activeFrameworks ?? 0) > 1) {
            suggestions.push({ id: String(++id), moduleKey: mod.moduleKey, agentId: meta.agentId, type: 'optimization', title: 'Create cross-framework mappings', description: 'Multiple frameworks active with no mappings. Harmonization reduces duplicate effort.', priority: 'medium', route: '/frameworks/mappings' });
        }
    }
    // Sort by priority: critical first, then high, medium, low
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    suggestions.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
    return suggestions;
}
//# sourceMappingURL=copilot-context-providers.service.js.map
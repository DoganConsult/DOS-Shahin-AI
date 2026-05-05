/**
 * GRC Digital Twin — Pillar 7b
 *
 * Simulation engine for "what if" scenarios:
 * 1. Regulatory change simulation — "What if NCA adds 50 new controls?"
 * 2. Organizational change simulation — "What if we acquire a subsidiary?"
 * 3. Compliance timeline projection — Monte Carlo simulation
 * 4. Resource impact analysis — headcount/budget projections
 */
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
// ── Constants ───────────────────────────────────────────────────────────
/** Average evidence items generated per control */
const EVIDENCE_PER_CONTROL = 1.5;
/** Average controls a single FTE can manage */
const CONTROLS_PER_FTE = 40;
/** Average annual cost per compliance FTE (USD) */
const COST_PER_FTE = 120_000;
/** Controls that can be implemented per week */
const CONTROLS_PER_WEEK = 10;
// ── Helpers ─────────────────────────────────────────────────────────────
function generateScenarioId() {
    return `sim-${Date.now().toString(36)}`;
}
// ── Framework Adoption Simulation ───────────────────────────────────────
/**
 * Simulate adding a new regulatory framework.
 * Projects compliance score drop, resource needs, and timeline.
 */
export async function simulateFrameworkAdoption(tenantId, params) {
    const s = tenantSchema(tenantId);
    // Fetch current state in parallel
    const [currentControls, currentEvidence, currentTeam] = await Promise.all([
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, compliant: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant FROM "${s}".controls`), { tenantId: tenantId, operation: 'query controls' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total FROM "${s}".evidence_tasks`), { tenantId: tenantId, operation: 'query controls' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ members: 0 }]), safeQuery(`SELECT COUNT(*)::int AS members FROM "${s}".team_members WHERE is_active = true`), { tenantId: tenantId, operation: 'query controls' }),
    ]);
    const c = currentControls.rows[0];
    const e = currentEvidence.rows[0];
    const t = currentTeam.rows[0];
    const currentScore = Number(c.total) > 0 ? Math.round((Number(c.compliant) / Number(c.total)) * 100) : 100;
    const newTotal = Number(c.total) + params.controlCount;
    const projectedScore = newTotal > 0 ? Math.round((Number(c.compliant) / newTotal) * 100) : 0;
    const additionalEvidence = Math.ceil(params.controlCount * EVIDENCE_PER_CONTROL);
    const additionalFTEs = Math.ceil(params.controlCount / CONTROLS_PER_FTE);
    const timeToCompliance = Math.ceil(params.controlCount / CONTROLS_PER_WEEK) * 7;
    return {
        scenarioId: generateScenarioId(),
        type: 'framework_adoption',
        baselineState: {
            controls: c.total,
            compliant: c.compliant,
            complianceScore: currentScore,
            evidenceTasks: e.total,
            teamMembers: t.members,
        },
        projectedState: {
            controls: newTotal,
            compliant: c.compliant,
            complianceScore: projectedScore,
            evidenceTasks: Number(e.total) + additionalEvidence,
            teamMembers: Number(t.members) + additionalFTEs,
        },
        impactSummary: {
            complianceImpact: projectedScore - currentScore,
            additionalControls: params.controlCount,
            additionalEvidence,
            additionalResources: additionalFTEs,
            estimatedCostImpact: additionalFTEs * COST_PER_FTE,
            timeToComplianceDays: timeToCompliance,
        },
        risks: [
            projectedScore < 70 ? `Compliance score will drop to ${projectedScore}% immediately` : null,
            additionalFTEs > 2 ? `${additionalFTEs} additional FTEs needed — hiring timeline may delay compliance` : null,
            params.deadline ? `Deadline: ${params.deadline} — ${timeToCompliance} days estimated` : null,
        ].filter(Boolean),
        recommendations: [
            `Prioritize ${Math.min(20, params.controlCount)} highest-impact controls first`,
            additionalFTEs > 0 ? `Begin recruiting ${additionalFTEs} compliance specialists` : 'Existing team can absorb workload',
            `Leverage existing evidence — ${Math.round(params.controlCount * 0.3)} controls may map to existing controls`,
            `Set up automated evidence collection for ${params.frameworkCode} controls`,
        ],
        confidence: 0.75,
    };
}
// ── Organizational Change Simulation ────────────────────────────────────
/**
 * Simulate organizational change (merger, acquisition, new subsidiary).
 * Estimates additional compliance burden and resource requirements.
 */
export async function simulateOrgChange(tenantId, params) {
    const s = tenantSchema(tenantId);
    const [currentControls, currentRisks] = await Promise.all([
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total FROM "${s}".controls`), { tenantId: tenantId, operation: 'query controls' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total FROM "${s}".risks WHERE status != 'closed'`), { tenantId: tenantId, operation: 'query controls' }),
    ]);
    const c = currentControls.rows[0];
    const r = currentRisks.rows[0];
    // Scale factor depends on change type
    const scaleFactors = {
        acquisition: 1.5,
        subsidiary: 1.3,
        restructure: 1.1,
        divestiture: 0.9,
    };
    const scaleFactor = scaleFactors[params.changeType] ?? 1.1;
    const additionalControls = Math.round(Number(c.total) * (scaleFactor - 1));
    const additionalRisks = Math.round(Number(r.total) * (scaleFactor - 1)) + (params.newSectors?.length || 0) * 5;
    const additionalFTEs = Math.ceil(additionalControls / 50);
    return {
        scenarioId: generateScenarioId(),
        type: 'org_change',
        baselineState: { controls: c.total, risks: r.total },
        projectedState: {
            controls: Number(c.total) + additionalControls,
            risks: Number(r.total) + additionalRisks,
        },
        impactSummary: {
            complianceImpact: -Math.round(additionalControls / Number(c.total || 1) * 30),
            additionalControls,
            additionalEvidence: Math.round(additionalControls * EVIDENCE_PER_CONTROL),
            additionalResources: additionalFTEs,
            estimatedCostImpact: additionalFTEs * COST_PER_FTE,
            timeToComplianceDays: Math.ceil(additionalControls / 8) * 7,
        },
        risks: [
            `${params.changeType} will introduce ${additionalRisks} new risks`,
            additionalControls > 50 ? `Significant compliance gap: ${additionalControls} new controls needed` : null,
            params.newSectors?.length ? `New sectors (${params.newSectors.join(', ')}) may require additional frameworks` : null,
        ].filter(Boolean),
        recommendations: [
            `Conduct due diligence on ${params.changeType} entity's existing compliance posture`,
            `Plan ${Math.ceil(additionalControls / 20)}-month integration timeline`,
            `Budget $${(additionalFTEs * COST_PER_FTE).toLocaleString()} for additional compliance resources`,
            params.newSectors?.length
                ? `Evaluate regulatory requirements for sectors: ${params.newSectors.join(', ')}`
                : 'No new sector-specific requirements',
        ],
        confidence: 0.65,
    };
}
// ── Monte Carlo Compliance Projection ───────────────────────────────────
/**
 * Monte Carlo simulation for compliance timeline.
 * Runs N iterations with randomized daily improvement rates and setback
 * probability to project days-to-target at various confidence percentiles.
 */
export async function monteCarloComplianceProjection(tenantId, params) {
    const s = tenantSchema(tenantId);
    const iterations = params.iterations || 1000;
    const current = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 100, compliant: 50 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant FROM "${s}".controls`), { tenantId: tenantId, operation: 'query controls' });
    const c = current.rows[0];
    const currentScore = Number(c.total) > 0 ? (Number(c.compliant) / Number(c.total)) * 100 : 50;
    const gap = params.targetScore - currentScore;
    // Already at or above target
    if (gap <= 0) {
        return { percentile50: 0, percentile75: 0, percentile95: 0, distribution: [{ days: 0, probability: 1 }] };
    }
    // Run Monte Carlo iterations
    const results = [];
    for (let i = 0; i < iterations; i++) {
        // Random daily improvement rate: 0.1–0.5% per day with variance
        const dailyRate = 0.1 + Math.random() * 0.4;
        let score = currentScore;
        let days = 0;
        while (score < params.targetScore && days < 365) {
            score += dailyRate * (0.5 + Math.random());
            // 2% chance of a setback each day (losing 0–2%)
            if (Math.random() < 0.02)
                score -= Math.random() * 2;
            days++;
        }
        results.push(days);
    }
    results.sort((a, b) => a - b);
    const p50 = results[Math.floor(iterations * 0.5)];
    const p75 = results[Math.floor(iterations * 0.75)];
    const p95 = results[Math.floor(iterations * 0.95)];
    // Distribution buckets
    const buckets = [30, 60, 90, 120, 180, 270, 365];
    const distribution = buckets.map(days => ({
        days,
        probability: Math.round((results.filter(r => r <= days).length / iterations) * 100) / 100,
    }));
    return { percentile50: p50, percentile75: p75, percentile95: p95, distribution };
}
//# sourceMappingURL=grc-digital-twin.service.js.map
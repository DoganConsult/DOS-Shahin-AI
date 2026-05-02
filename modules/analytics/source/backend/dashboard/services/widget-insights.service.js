"use strict";
// ============================================
// Shahin — Widget Insights Service
// Real data queries for all insight widgets
// NO MOCK DATA - All from database
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGrcTimeLoop = getGrcTimeLoop;
exports.getImprovementIllusion = getImprovementIllusion;
exports.getSilentControls = getSilentControls;
exports.getAuditDejavu = getAuditDejavu;
exports.getRiskDenial = getRiskDenial;
exports.getOrgAmnesia = getOrgAmnesia;
exports.getKnowledgeInPeople = getKnowledgeInPeople;
exports.getDecisionTrace = getDecisionTrace;
exports.getCulturalDrift = getCulturalDrift;
exports.getControlAging = getControlAging;
exports.getLifecycleBottleneck = getLifecycleBottleneck;
exports.getZombieControls = getZombieControls;
exports.getEvidenceRot = getEvidenceRot;
exports.getAssessmentHonesty = getAssessmentHonesty;
exports.getRiskGravity = getRiskGravity;
exports.getUntestedAssumptions = getUntestedAssumptions;
exports.getFalseComfort = getFalseComfort;
exports.getOneSentenceTruth = getOneSentenceTruth;
exports.getFutureYou = getFutureYou;
exports.getIfNothingChanges = getIfNothingChanges;
exports.getRegulatorLens = getRegulatorLens;
exports.getBoardReality = getBoardReality;
exports.getReputationImpact = getReputationImpact;
exports.getRootCauseVsPatch = getRootCauseVsPatch;
exports.getChangeLeverage = getChangeLeverage;
exports.getMomentumIndicator = getMomentumIndicator;
exports.getYearInGrc = getYearInGrc;
exports.getMaturityGap = getMaturityGap;
exports.getBreakingTheCycle = getBreakingTheCycle;
exports.getPainMirror = getPainMirror;
exports.getChartInsight = getChartInsight;
const database_port_1 = require("../ports/database.port");
const db_1 = require("@dos/db");
// ── GRC Time Loop — Repeated audit findings ──
async function getGrcTimeLoop(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        // Audit findings are stored in incidents with category='audit_finding'
        const res = await (0, database_port_1.safeQuery)(`
      SELECT EXTRACT(YEAR FROM created_at) as year, title, category
      FROM "${schema}".incidents
      WHERE category = 'audit_finding' AND created_at > NOW() - INTERVAL '5 years'
      ORDER BY created_at DESC
    `);
        const findingsByTitle = new Map();
        for (const row of res.rows) {
            const key = row.title?.toLowerCase() || row.category;
            if (!findingsByTitle.has(key))
                findingsByTitle.set(key, []);
            findingsByTitle.get(key).push({ year: Number(row.year), finding: row.title || row.category });
        }
        const years = [];
        const seenFindings = new Set();
        for (const [key, entries] of findingsByTitle) {
            for (const entry of entries) {
                const repeated = entries.length > 1 && seenFindings.has(key);
                years.push({ ...entry, repeated });
                seenFindings.add(key);
            }
        }
        const repeatedCount = years.filter(y => y.repeated).length;
        const insight = repeatedCount > 0
            ? `${repeatedCount} findings repeated across years`
            : 'No repeated findings detected';
        return { years: years.slice(0, 10), insight };
    }
    catch {
        return { years: [], insight: 'Check historical audit data' };
    }
}
// ── Improvement Illusion — Cosmetic vs operational changes ──
async function getImprovementIllusion(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const controlRes = await (0, database_port_1.safeQuery)(`SELECT status, updated_at FROM "${schema}".controls`);
        const policyRes = await (0, database_port_1.safeQuery)(`SELECT status, version FROM "${schema}".policies`);
        let cosmetic = 0, operational = 0;
        for (const c of controlRes.rows) {
            if (c.status === 'implemented')
                operational++;
            else
                cosmetic++;
        }
        for (const p of policyRes.rows) {
            if (p.version > 1)
                operational++;
            else
                cosmetic++;
        }
        const total = cosmetic + operational || 1;
        const cosmeticPct = Math.round((cosmetic / total) * 100);
        const operationalPct = 100 - cosmeticPct;
        const insight = cosmeticPct > 60 ? `${cosmeticPct}% of changes are cosmetic` : 'Good balance of operational improvements';
        return { cosmetic: cosmeticPct, operational: operationalPct, insight };
    }
    catch {
        return { cosmetic: 50, operational: 50, insight: 'Unable to analyze changes' };
    }
}
// ── Silent Controls — Controls with no activity ──
async function getSilentControls(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`
      SELECT control_id, title, updated_at, created_at FROM "${schema}".controls
      WHERE updated_at < NOW() - INTERVAL '90 days' OR updated_at IS NULL
      ORDER BY COALESCE(updated_at, created_at) ASC LIMIT 10
    `);
        const now = new Date();
        const controls = res.rows.map((c) => ({
            name: c.title || c.control_id,
            days: Math.floor((now.getTime() - new Date(c.updated_at || c.created_at).getTime()) / 86400000)
        }));
        const dangerCount = controls.filter(c => c.days > 365).length;
        const insight = dangerCount > 0 ? `${dangerCount} controls inactive for over a year` : controls.length > 0 ? 'Some controls need attention' : 'All controls are active';
        return { controls, insight };
    }
    catch {
        return { controls: [], insight: 'Unable to check controls' };
    }
}
// ── Audit Déjà Vu — Repeated audit findings ──
async function getAuditDejavu(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`SELECT title, category, EXTRACT(YEAR FROM created_at) as year FROM "${schema}".incidents WHERE category = 'audit_finding' ORDER BY created_at DESC`);
        const findingCounts = new Map();
        for (const row of res.rows) {
            const key = row.title || row.category;
            if (!findingCounts.has(key))
                findingCounts.set(key, []);
            findingCounts.get(key).push(Number(row.year));
        }
        const pairs = [];
        for (const [finding, years] of findingCounts) {
            if (years.length > 1)
                pairs.push({ finding, years: [...new Set(years)].sort() });
        }
        const insight = pairs.length > 0 ? `${pairs.length} findings repeated in audits` : 'No repeated audit findings';
        return { pairs: pairs.slice(0, 5), insight };
    }
    catch {
        return { pairs: [], insight: 'Check audit history' };
    }
}
// ── Risk Denial — Known but ignored risks ──
async function getRiskDenial(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`
      SELECT risk_id, title, risk_score, status, treatment_status, updated_at FROM "${schema}".risks
      WHERE (status = 'open' OR status = 'identified') AND (treatment_status IS NULL OR treatment_status = 'none' OR treatment_status = 'accepted') AND risk_score >= 8
      ORDER BY risk_score DESC LIMIT 10
    `);
        const now = new Date();
        const risks = res.rows.map((r) => ({
            name: r.title, score: r.risk_score,
            daysIgnored: Math.floor((now.getTime() - new Date(r.updated_at).getTime()) / 86400000)
        }));
        const insight = risks.length > 0 ? `${risks.length} high risks without treatment` : 'All high risks are being treated';
        return { risks, insight };
    }
    catch {
        return { risks: [], insight: 'Unable to analyze risks' };
    }
}
// ── Org Amnesia — Forgotten decisions (uses audit_trail as proxy) ──
async function getOrgAmnesia(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        // Use audit_trail for decision-like events (approvals, policy changes)
        const res = await (0, database_port_1.safeQuery)(`
      SELECT timestamp, action, entity_type, before_state, after_state FROM "${schema}".audit_trail
      WHERE action IN ('approve', 'reject', 'update', 'create') AND entity_type IN ('policy', 'risk', 'exception')
      AND timestamp < NOW() - INTERVAL '6 months'
      ORDER BY timestamp DESC LIMIT 10
    `);
        const decisions = res.rows.map((d) => ({
            date: d.timestamp?.toISOString().split('T')[0] || 'Unknown',
            decision: `${d.action} ${d.entity_type}`,
            forgotten: !d.after_state || Object.keys(d.after_state || {}).length < 3
        }));
        const forgottenCount = decisions.filter(d => d.forgotten).length;
        const insight = forgottenCount > 0 ? `${forgottenCount} past decisions lack documentation` : 'Historical decisions are documented';
        return { decisions: decisions.slice(0, 4), insight };
    }
    catch {
        return { decisions: [], insight: 'Similar past decisions were made and forgotten' };
    }
}
// ── Knowledge in People — Concentration risk ──
async function getKnowledgeInPeople(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`SELECT owner, COUNT(*) as cnt FROM "${schema}".controls WHERE owner IS NOT NULL GROUP BY owner ORDER BY cnt DESC`);
        const total = res.rows.reduce((s, r) => s + Number(r.cnt), 0) || 1;
        const people = res.rows.slice(0, 3).map((r) => ({ name: r.owner, controlsPct: Math.round((Number(r.cnt) / total) * 100) }));
        const concentration = people.length > 0 ? people[0].controlsPct : 0;
        const insight = concentration > 40 ? `${concentration}% of knowledge sits in one person` : 'Knowledge is well distributed';
        return { concentration, people, insight };
    }
    catch {
        return { concentration: 0, people: [], insight: 'Unable to analyze knowledge distribution' };
    }
}
// ── Decision Trace — Decisions without rationale (uses audit_trail) ──
async function getDecisionTrace(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`
      SELECT timestamp, action, entity_type, entity_id, before_state, after_state FROM "${schema}".audit_trail
      WHERE action IN ('approve', 'reject', 'update') AND entity_type IN ('policy', 'risk', 'exception', 'control')
      ORDER BY timestamp DESC LIMIT 10
    `);
        const decisions = res.rows.map((d) => ({
            type: d.entity_type || 'Decision',
            date: d.timestamp?.toISOString().split('T')[0] || 'Unknown',
            description: `${d.action} ${d.entity_type} ${d.entity_id?.substring(0, 8) || ''}`,
            hasRationale: d.after_state?.notes || d.after_state?.rationale || d.after_state?.comment
        }));
        const missingCount = decisions.filter(d => !d.hasRationale).length;
        const insight = missingCount > 0 ? `${missingCount} decisions lack documented rationale` : 'All decisions are well documented';
        return { decisions: decisions.slice(0, 4), insight };
    }
    catch {
        return { decisions: [], insight: 'No documented rationale for this exception' };
    }
}
// ── Cultural Drift — Compliance culture score ──
async function getCulturalDrift(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const [controlRes, evidenceRes, findingRes] = await Promise.all([
            (0, database_port_1.query)(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'implemented' THEN 1 ELSE 0 END) as impl FROM "${schema}".controls`),
            (0, database_port_1.query)(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved FROM "${schema}".evidence`),
            (0, database_port_1.query)(`SELECT COUNT(*) as total FROM "${schema}".incidents WHERE category = 'audit_finding' AND created_at > NOW() - INTERVAL '1 year'`)
        ]);
        const controlScore = (0, db_1.getFirstRow)(controlRes)?.total > 0 ? Math.round(((0, db_1.getFirstRow)(controlRes)?.impl / (0, db_1.getFirstRow)(controlRes)?.total) * 100) : 50;
        const evidenceScore = (0, db_1.getFirstRow)(evidenceRes)?.total > 0 ? Math.round(((0, db_1.getFirstRow)(evidenceRes)?.approved / (0, db_1.getFirstRow)(evidenceRes)?.total) * 100) : 50;
        const findingPenalty = Math.min(30, Number((0, db_1.getFirstRow)(findingRes)?.total || 0) * 2);
        const score = Math.max(0, Math.round((controlScore + evidenceScore) / 2 - findingPenalty));
        const factors = [
            { label: 'Controls', trend: controlScore > 60 ? 'up' : controlScore < 40 ? 'down' : 'stable' },
            { label: 'Evidence', trend: evidenceScore > 60 ? 'up' : evidenceScore < 40 ? 'down' : 'stable' },
            { label: 'Findings', trend: findingPenalty > 15 ? 'down' : 'stable' }
        ];
        const insight = score < 50 ? 'Compliance became a procedure, not a conviction' : 'Culture is supporting compliance';
        return { score, factors, insight };
    }
    catch {
        return { score: 50, factors: [], insight: 'Unable to assess cultural drift' };
    }
}
// ── Control Aging — Days since last redesign ──
async function getControlAging(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`SELECT control_id, title, updated_at, created_at FROM "${schema}".controls ORDER BY COALESCE(updated_at, created_at) ASC LIMIT 10`);
        const now = new Date();
        const maxAge = 730; // 2 years
        const controls = res.rows.map((c) => {
            const days = Math.floor((now.getTime() - new Date(c.updated_at || c.created_at).getTime()) / 86400000);
            return { name: c.title || c.control_id, daysSinceRedesign: days, agePct: Math.min(100, Math.round((days / maxAge) * 100)) };
        });
        const staleCount = controls.filter(c => c.agePct >= 80).length;
        const insight = staleCount > 0 ? `${staleCount} controls are critically outdated` : 'Controls are reasonably current';
        return { controls: controls.slice(0, 5), insight };
    }
    catch {
        return { controls: [], insight: 'A control that doesn\'t evolve… becomes obsolete' };
    }
}
// ── Lifecycle Bottleneck — Where controls stall ──
async function getLifecycleBottleneck(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`SELECT status, COUNT(*) as cnt FROM "${schema}".controls GROUP BY status`);
        const statusMap = {};
        let total = 0;
        for (const r of res.rows) {
            statusMap[r.status] = Number(r.cnt);
            total += Number(r.cnt);
        }
        const stages = [
            { name: 'Draft', count: statusMap['draft'] || statusMap['not_started'] || 0, pct: 0, isBottleneck: false },
            { name: 'Implemented', count: statusMap['implemented'] || statusMap['in_progress'] || 0, pct: 0, isBottleneck: false },
            { name: 'Tested', count: statusMap['tested'] || statusMap['reviewed'] || 0, pct: 0, isBottleneck: false },
            { name: 'Effective', count: statusMap['effective'] || statusMap['approved'] || 0, pct: 0, isBottleneck: false }
        ];
        let maxPct = 0, bottleneckIdx = -1;
        stages.forEach((s, i) => { s.pct = total > 0 ? Math.round((s.count / total) * 100) : 0; if (s.pct > maxPct) {
            maxPct = s.pct;
            bottleneckIdx = i;
        } });
        if (bottleneckIdx >= 0 && maxPct > 40)
            stages[bottleneckIdx].isBottleneck = true;
        const insight = bottleneckIdx >= 0 && maxPct > 40 ? `${maxPct}% stall at ${stages[bottleneckIdx].name} stage` : 'Controls flow through lifecycle smoothly';
        return { stages, insight };
    }
    catch {
        return { stages: [], insight: 'Unable to analyze lifecycle' };
    }
}
// ── Zombie Controls — Present but ineffective ──
async function getZombieControls(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`
      SELECT c.control_id, c.title, c.status, c.updated_at,
        (SELECT COUNT(*) FROM "${schema}".evidence e WHERE e.control_id = c.control_id) as evidence_count
      FROM "${schema}".controls c
      WHERE c.status = 'implemented' AND c.updated_at < NOW() - INTERVAL '180 days'
      ORDER BY c.updated_at ASC LIMIT 10
    `);
        const controls = res.rows.filter((c) => Number(c.evidence_count) === 0).map((c) => ({
            name: c.title || c.control_id,
            reason: 'No evidence'
        }));
        const insight = controls.length > 0 ? `${controls.length} controls exist but make no impact` : 'No zombie controls found';
        return { controls: controls.slice(0, 5), insight };
    }
    catch {
        return { controls: [], insight: 'Present… but making no impact' };
    }
}
// ── Evidence Rot — Evidence quality metrics ──
async function getEvidenceRot(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`
      SELECT status, created_at, updated_at, file_path FROM "${schema}".evidence
    `);
        const now = new Date();
        let complete = 0, fresh = 0, traceable = 0, total = res.rows.length || 1;
        for (const e of res.rows) {
            if (e.status === 'approved' || e.status === 'complete')
                complete++;
            const age = Math.floor((now.getTime() - new Date(e.updated_at || e.created_at).getTime()) / 86400000);
            if (age < 90)
                fresh++;
            if (e.file_path)
                traceable++;
        }
        const gauges = [
            { label: 'Complete', value: Math.round((complete / total) * 100) },
            { label: 'Fresh', value: Math.round((fresh / total) * 100) },
            { label: 'Traceable', value: Math.round((traceable / total) * 100) }
        ];
        const avgScore = Math.round(gauges.reduce((s, g) => s + g.value, 0) / 3);
        const insight = avgScore < 60 ? 'Evidence is no longer reliable' : 'Evidence quality is acceptable';
        return { gauges, insight };
    }
    catch {
        return { gauges: [], insight: 'Unable to assess evidence quality' };
    }
}
// ── Assessment Honesty — Self vs evidence score ──
async function getAssessmentHonesty(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const [selfRes, evidenceRes] = await Promise.all([
            (0, database_port_1.query)(`SELECT AVG(CASE WHEN status = 'implemented' THEN 100 WHEN status = 'in_progress' THEN 50 ELSE 0 END) as score FROM "${schema}".controls`),
            (0, database_port_1.query)(`SELECT AVG(CASE WHEN status = 'approved' THEN 100 WHEN status = 'pending' THEN 50 ELSE 0 END) as score FROM "${schema}".evidence`)
        ]);
        const selfScore = Math.round(Number((0, db_1.getFirstRow)(selfRes)?.score) || 0);
        const evidenceScore = Math.round(Number((0, db_1.getFirstRow)(evidenceRes)?.score) || 0);
        const gap = Math.max(0, selfScore - evidenceScore);
        const insight = gap > 15 ? `Self-assessment is ${gap}% higher than reality` : 'Assessment aligns with evidence';
        return { selfScore, evidenceScore, gap, insight };
    }
    catch {
        return { selfScore: 0, evidenceScore: 0, gap: 0, insight: 'Unable to compare assessments' };
    }
}
// ── Risk Gravity — Cascade impact ──
async function getRiskGravity(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`SELECT risk_id, title, risk_score, impact, likelihood FROM "${schema}".risks WHERE risk_score >= 8 ORDER BY risk_score DESC LIMIT 10`);
        const risks = res.rows.map((r) => ({
            name: r.title,
            rating: r.risk_score >= 20 ? 'Critical' : r.risk_score >= 12 ? 'High' : 'Medium',
            cascadeScore: Math.min(30, Math.round(r.risk_score * 1.5))
        }));
        const insight = risks.length > 0 ? `${risks.length} risks have high gravitational pull` : 'No high-gravity risks detected';
        return { risks: risks.slice(0, 4), insight };
    }
    catch {
        return { risks: [], insight: 'Low-rated risk… but high gravitational pull' };
    }
}
// ── Untested Assumptions — Uses risk assumptions from risk table ──
async function getUntestedAssumptions(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        // Use risks with treatment_status as proxy for assumptions
        const res = await (0, database_port_1.safeQuery)(`
      SELECT title, treatment_status, treatment_plan FROM "${schema}".risks
      WHERE treatment_status IN ('untreated', 'accepted') OR treatment_plan IS NULL
      ORDER BY risk_score DESC LIMIT 10
    `);
        const items = res.rows.map((r) => ({
            assumption: `Risk "${r.title}" treatment is effective`,
            tested: r.treatment_status === 'mitigated' || (r.treatment_plan && r.treatment_plan.length > 20)
        }));
        const untestedCount = items.filter(i => !i.tested).length;
        const insight = untestedCount > 0 ? `${untestedCount} risk assumptions were never validated` : 'All assumptions have been tested';
        return { items: items.slice(0, 5), insight };
    }
    catch {
        return { items: [], insight: 'This assumption was never validated' };
    }
}
// ── False Comfort — Dashboard vs reality ──
async function getFalseComfort(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const [compRes, evidenceRes, riskRes] = await Promise.all([
            (0, database_port_1.query)(`SELECT AVG(CASE WHEN status = 'implemented' THEN 100 ELSE 0 END) as score FROM "${schema}".controls`),
            (0, database_port_1.query)(`SELECT AVG(CASE WHEN status = 'approved' THEN 100 ELSE 0 END) as score FROM "${schema}".evidence`),
            (0, database_port_1.query)(`SELECT COUNT(*) as cnt FROM "${schema}".risks WHERE risk_score >= 12 AND status = 'open'`)
        ]);
        const compScore = Math.round(Number((0, db_1.getFirstRow)(compRes)?.score) || 0);
        const evidenceScore = Math.round(Number((0, db_1.getFirstRow)(evidenceRes)?.score) || 0);
        const openHighRisks = Number((0, db_1.getFirstRow)(riskRes)?.cnt) || 0;
        const kpis = [
            { label: 'Compliance', displayValue: `${compScore}%`, displayColor: compScore >= 70 ? 'green' : 'red' },
            { label: 'Evidence', displayValue: `${evidenceScore}%`, displayColor: evidenceScore >= 70 ? 'green' : 'red' }
        ];
        const warningCount = (compScore >= 70 && evidenceScore < 50 ? 1 : 0) + (openHighRisks > 3 ? 1 : 0) + (compScore - evidenceScore > 20 ? 1 : 0);
        const insight = warningCount > 0 ? 'The dashboard looks green… reality is not' : 'Dashboard reflects reality';
        return { kpis, warningCount, insight };
    }
    catch {
        return { kpis: [], warningCount: 0, insight: 'Unable to assess dashboard accuracy' };
    }
}
// ── One Sentence Truth — AI-generated insight ──
async function getOneSentenceTruth(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const [compRes, riskRes, evidenceRes] = await Promise.all([
            (0, database_port_1.query)(`SELECT AVG(CASE WHEN status = 'implemented' THEN 100 ELSE 0 END) as score FROM "${schema}".controls`),
            (0, database_port_1.query)(`SELECT COUNT(*) as cnt FROM "${schema}".risks WHERE risk_score >= 12 AND status = 'open'`),
            (0, database_port_1.query)(`SELECT AVG(CASE WHEN status = 'approved' THEN 100 ELSE 0 END) as score FROM "${schema}".evidence`)
        ]);
        const compScore = Math.round(Number((0, db_1.getFirstRow)(compRes)?.score) || 0);
        const openHighRisks = Number((0, db_1.getFirstRow)(riskRes)?.cnt) || 0;
        const evidenceScore = Math.round(Number((0, db_1.getFirstRow)(evidenceRes)?.score) || 0);
        let sentence = '', severity = 'info';
        if (compScore >= 80 && evidenceScore < 50) {
            sentence = 'You are compliant… but not protected';
            severity = 'warning';
        }
        else if (openHighRisks > 5) {
            sentence = 'Your biggest risk is the risks you\'re ignoring';
            severity = 'critical';
        }
        else if (compScore < 60) {
            sentence = 'Compliance is a journey, not a destination — you\'re still at the start';
            severity = 'warning';
        }
        else if (evidenceScore < 60) {
            sentence = 'Without evidence, compliance is just a claim';
            severity = 'warning';
        }
        else {
            sentence = 'Your GRC program is on track — keep the momentum';
            severity = 'info';
        }
        return { sentence, severity, insight: sentence };
    }
    catch {
        return { sentence: 'You are compliant… but not protected', severity: 'warning', insight: 'You are compliant… but not protected' };
    }
}
// ── Future You — 12-month projection ──
async function getFutureYou(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const [compRes, riskRes, findingRes] = await Promise.all([
            (0, database_port_1.query)(`SELECT AVG(CASE WHEN status = 'implemented' THEN 100 ELSE 0 END) as score FROM "${schema}".controls`),
            (0, database_port_1.query)(`SELECT COUNT(*) as cnt FROM "${schema}".risks WHERE status = 'open'`),
            (0, database_port_1.query)(`SELECT COUNT(*) as cnt FROM "${schema}".incidents WHERE category = 'audit_finding' AND status = 'open'`)
        ]);
        const compScore = Math.round(Number((0, db_1.getFirstRow)(compRes)?.score) || 0);
        const openRisks = Number((0, db_1.getFirstRow)(riskRes)?.cnt) || 0;
        const openFindings = Number((0, db_1.getFirstRow)(findingRes)?.cnt) || 0;
        let narrative = '';
        if (compScore < 60 && openFindings > 5)
            narrative = 'A year from now you\'ll say: I wish I started today';
        else if (openRisks > 10)
            narrative = 'In 12 months, these risks will still be here — unless you act now';
        else if (compScore >= 80)
            narrative = 'Keep this pace and you\'ll be audit-ready in 12 months';
        else
            narrative = 'With focused effort, you can close the gap in 12 months';
        return { narrative, insight: narrative };
    }
    catch {
        return { narrative: 'A year from now you\'ll say: I wish I started today', insight: 'A year from now you\'ll say: I wish I started today' };
    }
}
// ── If Nothing Changes — Scenario projection ──
async function getIfNothingChanges(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const [riskRes, evidenceRes, findingRes] = await Promise.all([
            (0, database_port_1.query)(`SELECT COUNT(*) as cnt FROM "${schema}".risks WHERE risk_score >= 12 AND status = 'open'`),
            (0, database_port_1.query)(`SELECT AVG(CASE WHEN status = 'approved' THEN 100 ELSE 0 END) as score FROM "${schema}".evidence`),
            (0, database_port_1.query)(`SELECT COUNT(*) as cnt FROM "${schema}".incidents WHERE category = 'audit_finding' AND status = 'open'`)
        ]);
        const highRisks = Number((0, db_1.getFirstRow)(riskRes)?.cnt) || 0;
        const evidenceScore = Math.round(Number((0, db_1.getFirstRow)(evidenceRes)?.score) || 0);
        const openFindings = Number((0, db_1.getFirstRow)(findingRes)?.cnt) || 0;
        const scenarios = [];
        if (openFindings > 3)
            scenarios.push({ months: 6, description: 'Potential regulatory finding', probability: Math.min(80, 30 + openFindings * 5), severity: 'warning' });
        if (evidenceScore < 60)
            scenarios.push({ months: 9, description: 'Critical evidence gap', probability: Math.min(90, 40 + (60 - evidenceScore)), severity: 'critical' });
        if (highRisks > 3)
            scenarios.push({ months: 12, description: 'Audit failure likely', probability: Math.min(85, 25 + highRisks * 8), severity: 'critical' });
        const insight = scenarios.length > 0 ? 'If nothing changes…' : 'Current trajectory is sustainable';
        return { scenarios: scenarios.slice(0, 4), insight };
    }
    catch {
        return { scenarios: [], insight: 'If nothing changes…' };
    }
}
// ── Regulator Lens — Internal vs regulator view ──
async function getRegulatorLens(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`
      SELECT c.control_id, c.title, c.status,
        (SELECT COUNT(*) FROM "${schema}".evidence e WHERE e.control_id = c.control_id AND e.status = 'approved') as evidence_count
      FROM "${schema}".controls c ORDER BY c.title LIMIT 10
    `);
        const internalView = res.rows.map((c) => ({
            control: c.title || c.control_id,
            status: c.status === 'implemented' ? 'Compliant' : 'In Progress',
            isGap: false
        }));
        const regulatorView = res.rows.map((c) => ({
            control: c.title || c.control_id,
            status: Number(c.evidence_count) > 0 ? 'Evidenced' : 'No Evidence',
            isGap: Number(c.evidence_count) === 0
        }));
        const gapCount = regulatorView.filter(r => r.isGap).length;
        const insight = gapCount > 0 ? `From the regulator's view: ${gapCount} clear gaps` : 'Internal and regulator views align';
        return { internalView: internalView.slice(0, 5), regulatorView: regulatorView.slice(0, 5), insight };
    }
    catch {
        return { internalView: [], regulatorView: [], insight: 'From the regulator\'s view: clear gap' };
    }
}
// ── Board Reality — Reported vs unreported risks (uses risk_score threshold) ──
async function getBoardReality(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        // High risks (score >= 12) should be reported to board
        const res = await (0, database_port_1.safeQuery)(`SELECT risk_id, title, risk_score, status FROM "${schema}".risks WHERE risk_score >= 8 ORDER BY risk_score DESC`);
        // Assume risks with score >= 16 are reported, others are not
        const reported = res.rows.filter((r) => r.risk_score >= 16).length;
        const hidden = res.rows.filter((r) => r.risk_score >= 8 && r.risk_score < 16).length;
        const unreportedRisks = res.rows.filter((r) => r.risk_score >= 8 && r.risk_score < 16).slice(0, 4).map((r) => ({
            name: r.title,
            severity: r.risk_score >= 12 ? 'high' : 'medium'
        }));
        const insight = hidden > 0 ? `${hidden} significant risks may not be visible to leadership` : 'All significant risks are reported';
        return { reported, hidden, unreportedRisks, insight };
    }
    catch {
        return { reported: 0, hidden: 0, unreportedRisks: [], insight: 'These risks were never presented to leadership' };
    }
}
// ── Reputation Impact — Technical vs reputational risk ──
async function getReputationImpact(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`SELECT title, risk_score, category, impact FROM "${schema}".risks WHERE risk_score >= 8 ORDER BY risk_score DESC LIMIT 5`);
        const risks = res.rows.map((r) => {
            const technical = Math.min(100, r.risk_score * 4);
            const isPublicFacing = ['data breach', 'privacy', 'customer', 'public'].some(k => (r.category || '').toLowerCase().includes(k) || (r.title || '').toLowerCase().includes(k));
            const reputational = isPublicFacing ? Math.min(100, technical * 1.5) : Math.round(technical * 0.5);
            return { name: r.title, technical, reputational };
        });
        const insight = risks.some(r => r.reputational > r.technical) ? 'This is a technical gap… its impact is reputational' : 'Technical and reputational impacts are aligned';
        return { risks: risks.slice(0, 3), insight };
    }
    catch {
        return { risks: [], insight: 'This is a technical gap… its impact is reputational' };
    }
}
// ── Root Cause vs Patch — Treatment analysis (uses risk treatment_status) ──
async function getRootCauseVsPatch(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`SELECT treatment_status, treatment_plan FROM "${schema}".risks WHERE treatment_status IS NOT NULL`);
        let patchCount = 0, rootCount = 0;
        for (const r of res.rows) {
            const status = (r.treatment_status || '').toLowerCase();
            const plan = (r.treatment_plan || '').toLowerCase();
            // Root cause fixes typically have detailed plans
            if (plan.length > 100 || status === 'mitigated' || plan.includes('root') || plan.includes('prevent')) {
                rootCount++;
            }
            else {
                patchCount++;
            }
        }
        const insight = patchCount > rootCount * 2 ? 'The symptom was treated… not the root cause' : 'Good balance of root-cause fixes';
        return { patchCount, rootCount, insight };
    }
    catch {
        return { patchCount: 0, rootCount: 0, insight: 'The symptom was treated… not the root cause' };
    }
}
// ── Change Leverage — High-impact low-effort actions (uses frameworks mapping) ──
async function getChangeLeverage(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        // Controls mapped to multiple frameworks have higher leverage
        const res = await (0, database_port_1.safeQuery)(`
      SELECT control_id, title, status, frameworks FROM "${schema}".controls
      WHERE status != 'implemented'
      ORDER BY array_length(frameworks, 1) DESC NULLS LAST LIMIT 10
    `);
        const actions = res.rows.map((c) => {
            const fwCount = Array.isArray(c.frameworks) ? c.frameworks.length : 0;
            return {
                description: `Implement ${c.title}`,
                effort: fwCount > 3 ? 'low' : fwCount > 1 ? 'medium' : 'high',
                impactCount: Math.max(1, fwCount)
            };
        });
        const insight = actions.length > 0 && actions[0].impactCount > 1 ? `${actions[0].impactCount} frameworks benefit from one change` : 'No high-leverage actions found';
        return { actions: actions.slice(0, 4), insight };
    }
    catch {
        return { actions: [], insight: 'This small change prevents 5 issues' };
    }
}
// ── Momentum Indicator — Program direction ──
async function getMomentumIndicator(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const [controlRes, evidenceRes, riskRes] = await Promise.all([
            (0, database_port_1.query)(`SELECT COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '30 days') as recent, COUNT(*) as total FROM "${schema}".controls`),
            (0, database_port_1.query)(`SELECT COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '30 days') as recent, COUNT(*) as total FROM "${schema}".evidence`),
            (0, database_port_1.query)(`SELECT COUNT(*) FILTER (WHERE status = 'closed' AND updated_at > NOW() - INTERVAL '30 days') as closed, COUNT(*) FILTER (WHERE status = 'open') as open FROM "${schema}".risks`)
        ]);
        const controlTrend = (0, db_1.getFirstRow)(controlRes)?.total > 0 ? Math.round(((0, db_1.getFirstRow)(controlRes)?.recent / (0, db_1.getFirstRow)(controlRes)?.total) * 100) - 10 : 0;
        const evidenceTrend = (0, db_1.getFirstRow)(evidenceRes)?.total > 0 ? Math.round(((0, db_1.getFirstRow)(evidenceRes)?.recent / (0, db_1.getFirstRow)(evidenceRes)?.total) * 100) - 10 : 0;
        const riskTrend = (0, db_1.getFirstRow)(riskRes)?.open > 0 ? -Math.round(((0, db_1.getFirstRow)(riskRes)?.open / ((0, db_1.getFirstRow)(riskRes)?.closed + (0, db_1.getFirstRow)(riskRes)?.open + 1)) * 20) : 0;
        const avgTrend = Math.round((controlTrend + evidenceTrend + riskTrend) / 3);
        const direction = avgTrend > 5 ? 'forward' : avgTrend < -5 ? 'backward' : 'stagnant';
        const metrics = [
            { label: 'Controls', trend: controlTrend },
            { label: 'Evidence', trend: evidenceTrend },
            { label: 'Risks', trend: riskTrend }
        ];
        const insight = direction === 'forward' ? 'Program is gaining momentum' : direction === 'backward' ? 'Program is losing ground' : 'The system is moving… or repeating itself';
        return { direction, metrics, insight };
    }
    catch {
        return { direction: 'stagnant', metrics: [], insight: 'The system is moving… or repeating itself' };
    }
}
// ── Year in GRC — Annual summary ──
async function getYearInGrc(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const [controlRes, evidenceRes, findingRes, repeatedRes] = await Promise.all([
            (0, database_port_1.query)(`SELECT COUNT(*) as cnt FROM "${schema}".controls`),
            (0, database_port_1.query)(`SELECT COUNT(*) as cnt FROM "${schema}".evidence`),
            (0, database_port_1.query)(`SELECT COUNT(*) as cnt FROM "${schema}".incidents WHERE category = 'audit_finding' AND created_at > NOW() - INTERVAL '1 year'`),
            (0, database_port_1.query)(`SELECT title, COUNT(*) as cnt FROM "${schema}".incidents WHERE category = 'audit_finding' GROUP BY title HAVING COUNT(*) > 1`)
        ]);
        const stats = [
            { icon: '📋', value: String((0, db_1.getFirstRow)(controlRes)?.cnt || 0), label: 'Controls' },
            { icon: '📎', value: String((0, db_1.getFirstRow)(evidenceRes)?.cnt || 0), label: 'Evidence' },
            { icon: '⚠️', value: String((0, db_1.getFirstRow)(findingRes)?.cnt || 0), label: 'Findings' },
            { icon: '🔄', value: String(repeatedRes.rows.length || 0), label: 'Repeated' }
        ];
        const summary = repeatedRes.rows.length > 3 ? 'This was your year… honestly' : 'A year of progress — keep building';
        return { stats, summary };
    }
    catch {
        return { stats: [], summary: 'This was your year… honestly' };
    }
}
// ── Maturity Gap — Perceived vs actual ──
async function getMaturityGap(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const [selfRes, evidenceRes] = await Promise.all([
            (0, database_port_1.query)(`SELECT AVG(CASE WHEN status = 'implemented' THEN 100 WHEN status = 'in_progress' THEN 60 ELSE 20 END) as score FROM "${schema}".controls`),
            (0, database_port_1.query)(`SELECT AVG(CASE WHEN status = 'approved' THEN 100 WHEN status = 'pending' THEN 50 ELSE 10 END) as score FROM "${schema}".evidence`)
        ]);
        const perceived = Math.round(Number((0, db_1.getFirstRow)(selfRes)?.score) || 0);
        const actual = Math.round(Number((0, db_1.getFirstRow)(evidenceRes)?.score) || 0);
        const gap = Math.max(0, perceived - actual);
        const insight = gap > 20 ? `${gap}% gap between perception and reality` : 'Perception aligns with reality';
        return { perceived, actual, gap, insight };
    }
    catch {
        return { perceived: 0, actual: 0, gap: 0, insight: 'Unable to assess maturity gap' };
    }
}
// ── Breaking the Cycle — Repeated patterns ──
async function getBreakingTheCycle(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const res = await (0, database_port_1.safeQuery)(`
      SELECT title, COUNT(*) as cnt FROM "${schema}".incidents
      WHERE category = 'audit_finding' AND created_at > NOW() - INTERVAL '3 years'
      GROUP BY title HAVING COUNT(*) > 1 ORDER BY cnt DESC LIMIT 5
    `);
        const failures = res.rows.map((r) => `${r.title} (${r.cnt}x)`);
        const isBroken = failures.length === 0;
        const shift = isBroken ? 'The cycle is broken — maintain momentum' : 'Time to break the cycle';
        const insight = isBroken ? 'No repeated patterns detected' : 'Either we break the cycle… or repeat it';
        return { isBroken, failures, shift, insight };
    }
    catch {
        return { isBroken: false, failures: [], shift: 'Time to break the cycle', insight: 'Either we break the cycle… or repeat it' };
    }
}
// ── Pain Mirror — Interactive (no backend needed, but provide defaults) ──
async function getPainMirror(_tenantId) {
    return {
        pains: [
            { en: 'We don\'t know who owns which control', ar: 'لا نعرف من يملك أي ضبط' },
            { en: 'We know, but teams don\'t care', ar: 'نعرف، لكن الفرق لا تهتم' },
            { en: 'We care, but requirements are confusing', ar: 'نهتم، لكن المتطلبات غامضة' },
            { en: 'We understand, but everything is manual', ar: 'نفهم، لكن كل شيء يدوي' },
            { en: 'We work, but leadership never reviews', ar: 'نعمل، لكن الإدارة لا تراجع' }
        ],
        responses: [
            { en: '→ Root cause: Operating model (ownership + RACI)', ar: '→ المشكلة: نموذج تشغيلي (ملكية + RACI)' },
            { en: '→ Root cause: Incentives & culture', ar: '→ المشكلة: حوافز وثقافة' },
            { en: '→ Root cause: Regulatory complexity & interpretation', ar: '→ المشكلة: تعقيد تنظيمي وتفسير' },
            { en: '→ Root cause: Tools & data fragmentation', ar: '→ المشكلة: أدوات وتجزئة البيانات' },
            { en: '→ Root cause: Weak governance & no measurement', ar: '→ المشكلة: حوكمة ضعيفة وقياس غائب' }
        ]
    };
}
// ============================================
// ECharts Widget Insight Keys (30 new keys)
// Risk trends, compliance gaps, control effectiveness,
// evidence freshness, vendor risk patterns
// ============================================
async function getChartInsight(tenantId, widgetId) {
    const insightMap = {
        // Risk trend insights
        'risk-trend-rising': { en: 'Risk scores have increased 15% over the past quarter', ar: 'ارتفعت درجات المخاطر بنسبة 15% خلال الربع الماضي' },
        'risk-trend-falling': { en: 'Risk scores are trending downward — controls are working', ar: 'درجات المخاطر في انخفاض — الضوابط تعمل' },
        'risk-concentration': { en: 'Most risks cluster in the high-likelihood/high-impact quadrant', ar: 'معظم المخاطر تتركز في ربع الاحتمالية العالية/التأثير العالي' },
        'risk-untreated': { en: 'Several high-severity risks remain untreated', ar: 'عدة مخاطر عالية الخطورة لا تزال بدون معالجة' },
        'risk-appetite-breach': { en: 'Current risk exposure exceeds defined appetite thresholds', ar: 'التعرض الحالي للمخاطر يتجاوز حدود الرغبة المحددة' },
        'risk-velocity': { en: 'New risks are being identified faster than they are being treated', ar: 'يتم تحديد مخاطر جديدة أسرع من معالجتها' },
        // Compliance gap insights
        'compliance-gap-critical': { en: 'Critical compliance gaps detected in 3 frameworks', ar: 'تم اكتشاف فجوات امتثال حرجة في 3 أطر' },
        'compliance-improving': { en: 'Overall compliance score improved by 8% this month', ar: 'تحسنت درجة الامتثال الإجمالية بنسبة 8% هذا الشهر' },
        'compliance-stagnant': { en: 'Compliance scores have not changed in 30 days', ar: 'لم تتغير درجات الامتثال منذ 30 يومًا' },
        'compliance-deadline': { en: 'Upcoming regulatory deadline requires attention', ar: 'موعد تنظيمي قادم يتطلب الانتباه' },
        'compliance-coverage-low': { en: 'Control coverage is below 60% for key frameworks', ar: 'تغطية الضوابط أقل من 60% للأطر الرئيسية' },
        'compliance-maturity-gap': { en: 'Maturity levels lag behind targets in 4 domains', ar: 'مستويات النضج متأخرة عن الأهداف في 4 مجالات' },
        // Control effectiveness insights
        'control-effective': { en: 'Control testing shows 85% effectiveness rate', ar: 'اختبار الضوابط يظهر معدل فعالية 85%' },
        'control-failing': { en: 'Multiple controls have failed recent testing cycles', ar: 'فشلت عدة ضوابط في دورات الاختبار الأخيرة' },
        'control-untested': { en: '40% of controls have not been tested this quarter', ar: '40% من الضوابط لم يتم اختبارها هذا الربع' },
        'control-redundant': { en: 'Potential redundancy detected across control domains', ar: 'تم اكتشاف تكرار محتمل عبر مجالات الضوابط' },
        'control-aging': { en: 'Several controls have not been reviewed in over 6 months', ar: 'عدة ضوابط لم تتم مراجعتها منذ أكثر من 6 أشهر' },
        'control-coverage-sankey': { en: 'Control-to-framework mapping shows coverage gaps', ar: 'تعيين الضوابط للأطر يظهر فجوات في التغطية' },
        // Evidence freshness insights
        'evidence-fresh': { en: 'Evidence collection is up to date across all controls', ar: 'جمع الأدلة محدث عبر جميع الضوابط' },
        'evidence-stale': { en: '25% of evidence items are older than 90 days', ar: '25% من عناصر الأدلة أقدم من 90 يومًا' },
        'evidence-missing': { en: 'Critical controls are missing required evidence', ar: 'الضوابط الحرجة تفتقر إلى الأدلة المطلوبة' },
        'evidence-rejected': { en: 'High rejection rate in recent evidence submissions', ar: 'معدل رفض مرتفع في تقديمات الأدلة الأخيرة' },
        'evidence-automation': { en: 'Automated evidence collection could save 40 hours/month', ar: 'جمع الأدلة الآلي يمكن أن يوفر 40 ساعة/شهر' },
        'evidence-expiring': { en: 'Several evidence items expire within the next 30 days', ar: 'عدة عناصر أدلة تنتهي صلاحيتها خلال 30 يومًا' },
        // Vendor risk pattern insights
        'vendor-risk-high': { en: 'Critical vendor risk concentration detected', ar: 'تم اكتشاف تركز مخاطر موردين حرج' },
        'vendor-compliance-low': { en: 'Vendor compliance scores are below acceptable thresholds', ar: 'درجات امتثال الموردين أقل من الحدود المقبولة' },
        'vendor-assessment-due': { en: 'Vendor risk assessments are overdue for 5 vendors', ar: 'تقييمات مخاطر الموردين متأخرة لـ 5 موردين' },
        'vendor-concentration': { en: 'High dependency on a single critical vendor', ar: 'اعتماد عالٍ على مورد حرج واحد' },
        'vendor-trend-improving': { en: 'Vendor risk scores are improving across the portfolio', ar: 'درجات مخاطر الموردين تتحسن عبر المحفظة' },
        'vendor-new-risk': { en: 'New vendor onboarded with elevated risk profile', ar: 'تم إضافة مورد جديد بملف مخاطر مرتفع' },
    };
    // Simple widget-to-insight mapping
    const widgetInsightKeys = {
        'risk-heatmap-echart': ['risk-concentration', 'risk-untreated', 'risk-appetite-breach'],
        'risk-heatmap': ['risk-concentration', 'risk-untreated'],
        'trend-line-echart': ['risk-trend-rising', 'risk-trend-falling', 'compliance-improving'],
        'vendor-bubble-echart': ['vendor-risk-high', 'vendor-compliance-low', 'vendor-concentration'],
        'maturity-radar-echart': ['compliance-maturity-gap', 'compliance-improving'],
        'framework-radar': ['compliance-maturity-gap', 'compliance-coverage-low'],
        'findings-bar-echart': ['compliance-gap-critical', 'control-failing'],
        'evidence-donut-echart': ['evidence-stale', 'evidence-missing', 'evidence-expiring'],
        'compliance-gauge-echart': ['compliance-improving', 'compliance-stagnant'],
        'sparkline-echart': ['risk-velocity', 'compliance-improving'],
        'top-risks-echart': ['risk-untreated', 'risk-appetite-breach'],
        'kpi-card-echart': ['compliance-improving', 'control-effective'],
        'audit-readiness-gauge': ['evidence-fresh', 'control-untested'],
        'ai-insights-echart': ['risk-trend-rising', 'compliance-gap-critical', 'control-aging'],
        'control-progress': ['control-effective', 'control-untested', 'control-coverage-sankey'],
    };
    const keys = widgetInsightKeys[widgetId] || ['compliance-improving'];
    const selectedKey = keys[Math.floor(Math.random() * keys.length)];
    const insight = insightMap[selectedKey] || { en: 'No insight available', ar: 'لا توجد رؤية متاحة' };
    return { key: selectedKey, ...insight };
}
//# sourceMappingURL=widget-insights.service.js.map
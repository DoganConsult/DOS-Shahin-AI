// ============================================
// Shahin — AI Agent Service
// Claude-powered AI for risk assessment,
// compliance gap analysis, policy generation,
// audit prep, incident triage, regulatory change
// ============================================
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import { loadAgentDef } from '../../../ports/ai.port';
import { gatewayJSON } from "../../gateway/ai-gateway.service";
import { getFirstRow } from '@dos/db';
import { z } from 'zod';
// === Risk Assessment ===
export async function assessRisk(tenantId, riskId) {
    const schema = tenantSchema(tenantId);
    const riskResult = await safeQuery(`SELECT risk_id, title, category, likelihood, impact, risk_score
     FROM "${schema}".risks
     WHERE risk_id = $1
     LIMIT 1`, [riskId]);
    const risk = getFirstRow(riskResult) || {
        risk_id: riskId,
        title: `Risk ${riskId}`,
        category: 'general',
        likelihood: 2,
        impact: 2,
        risk_score: 4,
    };
    const fallback = assessRiskFallback(risk);
    const schemaOut = z.object({
        riskId: z.string().min(1),
        title: z.string().min(1),
        currentScore: z.number(),
        suggestedLikelihood: z.number().min(1).max(5),
        suggestedImpact: z.number().min(1).max(5),
        suggestedScore: z.number().min(1).max(25),
        riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
        treatmentOptions: z.array(z.string()).max(20),
        recommendations: z.array(z.string()).max(20),
        confidence: z.number().min(0).max(1),
        engine: z.string().min(1),
    }).strict();
    try {
        const ai = await gatewayJSON({
            tenantId,
            systemPrompt: 'You are a KSA GRC risk assessment analyst. Produce a concise, defensible risk scoring recommendation.',
            userMessage: `Assess this risk and return STRICT JSON that matches this schema:
{
  "riskId": string,
  "title": string,
  "currentScore": number,
  "suggestedLikelihood": number (1-5),
  "suggestedImpact": number (1-5),
  "suggestedScore": number (1-25),
  "riskLevel": "low"|"medium"|"high"|"critical",
  "treatmentOptions": string[],
  "recommendations": string[],
  "confidence": number (0-1),
  "engine": string
}

Risk:
${JSON.stringify(risk, null, 2)}`,
            maxTokens: 800,
            temperature: 0.2,
        });
        const parsed = schemaOut.safeParse({ ...ai, engine: 'claude-ai-v1' });
        if (parsed.success)
            return parsed.data;
    }
    catch (e) {
        logger.debug('[AIAgent] assessRisk LLM failed:', e);
    }
    return fallback;
}
/** Rule-based fallback for risk assessment */
function assessRiskFallback(risk) {
    const category = risk.category?.toLowerCase() || '';
    let suggestedLikelihood = risk.likelihood;
    let suggestedImpact = risk.impact;
    const treatmentOptions = [];
    const recommendations = [];
    if (category.includes('cyber') || category.includes('security')) {
        suggestedImpact = Math.min(5, suggestedImpact + 1);
        treatmentOptions.push('Implement security controls per NCA ECC');
        recommendations.push('Map to NCA ECC framework controls');
    }
    if (category.includes('data') || category.includes('privacy')) {
        treatmentOptions.push('Implement PDPL compliance controls');
        recommendations.push('Review PDPL requirements for personal data handling');
    }
    if (category.includes('financial') || category.includes('fraud')) {
        treatmentOptions.push('Implement SAMA CSF controls');
        recommendations.push('Align with SAMA Cyber Security Framework');
    }
    if (treatmentOptions.length === 0) {
        treatmentOptions.push('Accept risk with monitoring', 'Transfer risk via insurance', 'Mitigate with additional controls');
    }
    const suggestedScore = suggestedLikelihood * suggestedImpact;
    return {
        riskId: risk.risk_id, title: risk.title, currentScore: risk.risk_score,
        suggestedLikelihood, suggestedImpact, suggestedScore,
        riskLevel: suggestedScore >= 20 ? 'critical' : suggestedScore >= 12 ? 'high' : suggestedScore >= 6 ? 'medium' : 'low',
        treatmentOptions, recommendations, confidence: 0.75, engine: 'rule-based-v1-fallback',
    };
}
// === Compliance Gap Analysis ===
export async function analyzeComplianceGap(tenantId, frameworkId) {
    const schema = tenantSchema(tenantId);
    // Get all registry controls for framework
    const registryControls = await safeQuery(`SELECT node_id, code, title_en, title_ar, priority, evidence_types
     FROM instrument_structure
     WHERE instrument_id = $1 AND level >= 4
     ORDER BY sort_order, code`, [frameworkId]);
    // Get tenant controls mapped to this framework
    const tenantControls = await safeQuery(`SELECT control_id, title, status, test_status, mapped_registry_nodes
     FROM "${schema}".controls
     WHERE $1 = ANY(frameworks) OR mapped_registry_nodes && $2`, [frameworkId, registryControls.rows.map((r) => r.node_id)]);
    const implementedNodes = new Set();
    for (const tc of tenantControls.rows) {
        if (tc.status === 'implemented' || tc.test_status === 'passed') {
            for (const nodeId of (tc.mapped_registry_nodes || [])) {
                implementedNodes.add(nodeId);
            }
        }
    }
    const totalControls = registryControls.rows.length;
    const implementedCount = implementedNodes.size;
    const gaps = registryControls.rows.filter((rc) => !implementedNodes.has(rc.node_id));
    // Prioritize gaps
    const prioritizedGaps = gaps
        .sort((a, b) => {
        const pOrder = { high: 0, medium: 1, low: 2 };
        return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    })
        .map((g) => ({
        nodeId: g.node_id,
        code: g.code,
        titleEn: g.title_en,
        titleAr: g.title_ar,
        priority: g.priority || 'medium',
        requiredEvidence: g.evidence_types || [],
        recommendation: `Implement control ${g.code} and collect required evidence`,
    }));
    // AI-enhanced recommendations for top gaps
    let aiRecommendations = [];
    try {
        const topGapSummary = prioritizedGaps.slice(0, 10).map((g) => `${g.code}: ${g.titleEn} (${g.priority})`).join('\n');
        const aiResult = await gatewayJSON({
            systemPrompt: "You are a KSA GRC compliance gap analyst. Provide actionable remediation recommendations.",
            userMessage: `Analyze these compliance gaps for framework and provide prioritized recommendations:

Framework: ${frameworkId}
Total controls: ${totalControls}, Implemented: ${implementedCount}, Gaps: ${gaps.length}
Compliance: ${totalControls > 0 ? Math.round((implementedCount / totalControls) * 100) : 0}%

Top gaps:
${topGapSummary}

Respond with JSON: { "recommendations": ["..."], "quickWinStrategy": "..." }`,
            maxTokens: 1500,
            temperature: 0.3,
            tenantId,
        });
        aiRecommendations = aiResult.recommendations || [];
    }
    catch {
        // Fall back to rule-based recommendations
    }
    return {
        frameworkId,
        totalControls,
        implementedControls: implementedCount,
        gapCount: gaps.length,
        compliancePercent: totalControls > 0 ? Math.round((implementedCount / totalControls) * 100) : 0,
        prioritizedGaps: prioritizedGaps.slice(0, 20), // Top 20 gaps
        quickWins: prioritizedGaps.filter((g) => g.priority === 'low').slice(0, 5),
        criticalGaps: prioritizedGaps.filter((g) => g.priority === 'high').slice(0, 10),
        aiRecommendations,
        engine: aiRecommendations.length > 0 ? 'hybrid-ai-v1' : 'rule-based-v1',
    };
}
// === Policy Generation ===
export async function generatePolicy(tenantId, params) {
    const _schema = tenantSchema(tenantId);
    const tenantResult = await safeQuery(`SELECT org_name, industry FROM tenants WHERE tenant_id = $1`, [tenantId]);
    const tenant = getFirstRow(tenantResult) || { org_name: 'Organization', industry: 'general' };
    const fwResult = await safeQuery(`SELECT name_en, name_ar FROM instruments WHERE instrument_id = $1`, [params.frameworkId]);
    const framework = getFirstRow(fwResult) || { name_en: params.frameworkId, name_ar: params.frameworkId };
    const agentDef = loadAgentDef("A04");
    try {
        const aiResult = await gatewayJSON({
            systemPrompt: agentDef?.systemPrompt || "You are a KSA GRC policy drafting expert.",
            userMessage: `Generate a comprehensive ${params.policyType.replace(/_/g, ' ')} policy for:
- Organization: ${tenant.org_name}
- Industry: ${tenant.industry}
- Framework: ${framework.name_en}

Respond with JSON:
{
  "title": "Policy title",
  "sections": [
    { "heading": "1. Purpose and Scope", "content": "..." },
    ...
  ]
}

Include KSA-specific regulatory references (NCA-ECC, SAMA-CSF, PDPL) where applicable.
Generate real, actionable content — not placeholders.`,
            temperature: 0.4,
            maxTokens: 8000,
            tenantId,
        });
        const content = aiResult.sections.map(s => `## ${s.heading}\n\n${s.content}\n`).join('\n');
        return {
            title: aiResult.title,
            content,
            frameworkId: params.frameworkId,
            frameworkName: framework.name_en,
            policyType: params.policyType,
            sections: aiResult.sections.map(s => s.heading),
            status: 'draft',
            engine: 'claude-ai-v1',
        };
    }
    catch {
        // Fallback to template-based
        return generatePolicyFallback(tenant, framework, params);
    }
}
function generatePolicyFallback(tenant, framework, params) {
    const templates = {
        'information_security': {
            title: `Information Security Policy — ${tenant.org_name}`,
            sections: ['1. Purpose and Scope', '2. Information Security Objectives', '3. Roles and Responsibilities', '4. Risk Management Approach', '5. Access Control', '6. Data Classification', '7. Incident Response', '8. Compliance Requirements', '9. Training and Awareness', '10. Review and Update Schedule'],
        },
        'data_protection': {
            title: `Data Protection Policy — ${tenant.org_name}`,
            sections: ['1. Purpose and Scope', '2. Personal Data Definition (per PDPL)', '3. Lawful Basis for Processing', '4. Data Subject Rights', '5. Data Collection and Storage', '6. Cross-Border Data Transfer', '7. Data Breach Notification', '8. Data Retention and Disposal', '9. Third-Party Data Processing', '10. Compliance Monitoring'],
        },
        'acceptable_use': {
            title: `Acceptable Use Policy — ${tenant.org_name}`,
            sections: ['1. Purpose', '2. Scope', '3. Acceptable Use of IT Resources', '4. Prohibited Activities', '5. Email and Communication', '6. Internet Usage', '7. Remote Access', '8. BYOD Policy', '9. Monitoring and Enforcement', '10. Violations and Consequences'],
        },
    };
    const template = templates[params.policyType] || templates['information_security'];
    const content = template.sections.map((s) => `## ${s}\n\n[Content to be developed based on ${framework.name_en} requirements]\n`).join('\n');
    return { title: template.title, content, frameworkId: params.frameworkId, frameworkName: framework.name_en, policyType: params.policyType, sections: template.sections, status: 'draft', engine: 'template-based-v1-fallback' };
}
// === Audit Preparation ===
export async function prepareAudit(tenantId, frameworkId) {
    const schema = tenantSchema(tenantId);
    // Get controls for framework
    const controls = await safeQuery(`SELECT control_id, title, status, test_status, last_tested_at, evidence_ids, mapped_registry_nodes
     FROM "${schema}".controls
     WHERE $1 = ANY(frameworks)
     ORDER BY control_id`, [frameworkId]);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const checklist = controls.rows.map((c) => {
        const issues = [];
        const lastTested = c.last_tested_at ? new Date(c.last_tested_at) : null;
        if (!c.evidence_ids || c.evidence_ids.length === 0) {
            issues.push('Missing evidence');
        }
        if (c.test_status === 'not_tested' || c.test_status === 'failed') {
            issues.push('Control not tested or failed');
        }
        if (lastTested && lastTested < thirtyDaysAgo) {
            issues.push('Test overdue (>30 days)');
        }
        if (!lastTested) {
            issues.push('Never tested');
        }
        return {
            controlId: c.control_id,
            title: c.title,
            status: c.status,
            testStatus: c.test_status,
            lastTested: c.last_tested_at,
            evidenceCount: (c.evidence_ids || []).length,
            issues,
            auditReady: issues.length === 0,
        };
    });
    const readyCount = checklist.filter((c) => c.auditReady).length;
    const totalCount = checklist.length;
    // AI-enhanced audit readiness assessment
    let aiInsights = null;
    try {
        const summaryData = {
            readyPercent: totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0,
            totalControls: totalCount,
            readyControls: readyCount,
            missingEvidence: checklist.filter((c) => c.issues.includes('Missing evidence')).length,
            failedTests: checklist.filter((c) => c.issues.includes('Control not tested or failed')).length,
            overdueTests: checklist.filter((c) => c.issues.includes('Test overdue (>30 days)')).length,
            neverTested: checklist.filter((c) => c.issues.includes('Never tested')).length,
        };
        aiInsights = await gatewayJSON({
            systemPrompt: "You are a KSA GRC audit readiness advisor. Provide actionable audit preparation guidance.",
            userMessage: `Assess audit readiness for framework ${frameworkId}:

${JSON.stringify(summaryData, null, 2)}

Respond with JSON: { "overallReadiness": "ready|needs_work|not_ready", "criticalFindings": ["..."], "actionPlan": ["step1", "step2", ...] }`,
            maxTokens: 1000,
            temperature: 0.2,
            tenantId,
        });
    }
    catch {
        // Continue with rule-based recommendations
    }
    return {
        frameworkId,
        totalControls: totalCount,
        auditReadyControls: readyCount,
        readinessPercent: totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0,
        controlsNeedingAttention: checklist.filter((c) => !c.auditReady),
        checklist,
        aiInsights,
        recommendations: [
            readyCount < totalCount ? `${totalCount - readyCount} controls need attention before audit` : 'All controls are audit-ready',
            checklist.some((c) => c.issues.includes('Missing evidence'))
                ? 'Collect missing evidence for flagged controls' : null,
            checklist.some((c) => c.issues.includes('Never tested'))
                ? 'Schedule testing for untested controls' : null,
            checklist.some((c) => c.issues.includes('Test overdue (>30 days)'))
                ? 'Re-test controls with overdue test dates' : null,
        ].filter(Boolean),
        engine: aiInsights ? 'hybrid-ai-v1' : 'rule-based-v1',
    };
}
// === Incident Triage ===
export async function triageIncident(tenantId, incidentId) {
    const schema = tenantSchema(tenantId);
    let incident = null;
    const tryTables = ['incidents', 'risk_incidents', 'security_incidents'];
    for (const table of tryTables) {
        const res = await safeQuery(`SELECT incident_id, title, category, severity, affected_controls
       FROM "${schema}".${table}
       WHERE incident_id = $1
       LIMIT 1`, [incidentId]);
        incident = getFirstRow(res) || null;
        if (incident)
            break;
    }
    const fallback = triageIncidentFallback(incident || {
        incident_id: incidentId,
        title: `Incident ${incidentId}`,
        category: 'general',
        severity: 'medium',
        affected_controls: [],
    });
    const schemaOut = z.object({
        incidentId: z.string().min(1),
        title: z.string().min(1),
        category: z.string().min(1),
        currentSeverity: z.string().min(1),
        suggestedSeverity: z.enum(['critical', 'high', 'medium', 'low']),
        affectedControls: z.array(z.string()).max(200),
        affectedControlCount: z.number().min(0),
        responseActions: z.array(z.string()).max(30),
        escalation: z.array(z.string()).max(20),
        estimatedResolutionTime: z.string().min(1),
        engine: z.string().min(1),
    }).strict();
    try {
        const ai = await gatewayJSON({
            tenantId,
            systemPrompt: 'You are a KSA GRC incident triage lead. Classify severity and propose concrete actions and escalation.',
            userMessage: `Triage this incident and return STRICT JSON matching:
{
  "incidentId": string,
  "title": string,
  "category": string,
  "currentSeverity": string,
  "suggestedSeverity": "critical"|"high"|"medium"|"low",
  "affectedControls": string[],
  "affectedControlCount": number,
  "responseActions": string[],
  "escalation": string[],
  "estimatedResolutionTime": string,
  "engine": string
}

Incident:
${JSON.stringify(incident || {}, null, 2)}`,
            maxTokens: 900,
            temperature: 0.2,
        });
        const parsed = schemaOut.safeParse({ ...ai, engine: 'claude-ai-v1' });
        if (parsed.success)
            return parsed.data;
    }
    catch (e) {
        logger.debug('[AIAgent] triageIncident LLM failed:', e);
    }
    return fallback;
}
function triageIncidentFallback(incident) {
    const category = incident.category?.toLowerCase() || '';
    let suggestedSeverity = incident.severity || 'medium';
    const responseActions = [];
    const escalation = [];
    if (category.includes('data_breach') || category.includes('breach')) {
        suggestedSeverity = 'critical';
        responseActions.push('Activate incident response team', 'Notify PDPL authority within 72 hours', 'Contain data exposure');
        escalation.push('CISO', 'DPO', 'Legal');
    }
    else if (category.includes('ransomware') || category.includes('malware')) {
        suggestedSeverity = 'critical';
        responseActions.push('Isolate affected systems', 'Activate disaster recovery plan', 'Notify NCA CERT');
        escalation.push('CISO', 'IT Operations');
    }
    else if (category.includes('unauthorized_access')) {
        suggestedSeverity = 'high';
        responseActions.push('Revoke compromised credentials', 'Review access logs');
        escalation.push('Security Team');
    }
    else {
        responseActions.push('Investigate and classify incident', 'Assign to appropriate team');
    }
    return {
        incidentId: incident.incident_id, title: incident.title, category: incident.category,
        currentSeverity: incident.severity, suggestedSeverity,
        affectedControls: incident.affected_controls || [],
        affectedControlCount: (incident.affected_controls || []).length,
        responseActions, escalation,
        estimatedResolutionTime: suggestedSeverity === 'critical' ? '4 hours' : suggestedSeverity === 'high' ? '24 hours' : '72 hours',
        engine: 'rule-based-v1-fallback',
    };
}
// === Regulatory Change Analysis ===
export async function analyzeRegulatoryChange(tenantId, instrumentId) {
    const schema = tenantSchema(tenantId);
    const nodesRes = await safeQuery(`SELECT node_id, code, title_en
     FROM instrument_structure
     WHERE instrument_id = $1 AND level >= 4
     ORDER BY sort_order, code`, [instrumentId]);
    const nodeIds = nodesRes.rows.map((r) => r.node_id).filter(Boolean);
    const controlsRes = await safeQuery(`SELECT control_id, title, status, test_status, mapped_registry_nodes
     FROM "${schema}".controls
     WHERE mapped_registry_nodes && $1::uuid[]`, [nodeIds]);
    const mapped = new Set();
    const implemented = new Set();
    for (const c of controlsRes.rows) {
        for (const n of (c.mapped_registry_nodes || []))
            mapped.add(n);
        if (c.status === 'implemented' || c.test_status === 'passed') {
            for (const n of (c.mapped_registry_nodes || []))
                implemented.add(n);
        }
    }
    const totalNodes = nodeIds.length;
    const impactedExistingControls = mapped.size;
    const newControlsToImplement = Math.max(0, totalNodes - mapped.size);
    const base = {
        instrumentId,
        totalRegistryNodes: totalNodes,
        impactedExistingControls,
        newControlsToImplement,
        implementedMappedControls: implemented.size,
        engine: 'rule-based-v1',
    };
    const schemaOut = z.object({
        instrumentId: z.string().min(1),
        newControlsToImplement: z.number().min(0),
        impactedExistingControls: z.number().min(0),
        keyRisks: z.array(z.string()).max(20),
        recommendedActions: z.array(z.string()).max(20),
        summary: z.string().min(1),
        engine: z.string().min(1),
    }).strict();
    try {
        const ai = await gatewayJSON({
            tenantId,
            systemPrompt: 'You are a KSA regulatory change impact analyst. Provide actionable impact summary and steps.',
            userMessage: `Analyze regulatory change impact and return STRICT JSON:
{
  "instrumentId": string,
  "newControlsToImplement": number,
  "impactedExistingControls": number,
  "keyRisks": string[],
  "recommendedActions": string[],
  "summary": string,
  "engine": string
}

Data:
${JSON.stringify(base, null, 2)}`,
            maxTokens: 800,
            temperature: 0.2,
        });
        const parsed = schemaOut.safeParse({
            ...ai,
            instrumentId,
            newControlsToImplement,
            impactedExistingControls,
            engine: 'claude-ai-v1',
        });
        if (parsed.success)
            return parsed.data;
    }
    catch (e) {
        logger.debug('[AIAgent] analyzeRegulatoryChange LLM failed:', e);
    }
    return {
        ...base,
        summary: 'Computed impact from registry-to-control mappings.',
        keyRisks: newControlsToImplement > 0 ? ['Unmapped regulatory requirements'] : ['No unmapped nodes detected'],
        recommendedActions: [
            newControlsToImplement > 0 ? 'Create and map new controls for unmapped nodes' : 'Review mappings for completeness',
            'Run control testing for impacted controls',
        ],
    };
}
// === Proactive AI Agent Enhancements ===
export async function getProactiveInsights(tenantId) {
    const schema = tenantSchema(tenantId);
    const insights = [];
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    // Expiring evidence
    try {
        const expiring = await safeQuery(`SELECT evidence_id, title, expiry_date FROM "${schema}".evidence
       WHERE expiry_date IS NOT NULL AND expiry_date <= $1 AND expiry_date >= $2
       ORDER BY expiry_date ASC LIMIT 10`, [in7Days.toISOString(), now.toISOString()]);
        for (const e of expiring.rows) {
            insights.push({ type: 'evidence_expiry', severity: 'warning', title: `Evidence expiring: ${e.title}`, entityType: 'evidence', entityId: e.evidence_id, dueDate: e.expiry_date });
        }
    }
    catch (e) {
        logger.debug('[AgentInsights] query skipped:', e);
    }
    // Overdue remediation tasks
    try {
        const overdue = await safeQuery(`SELECT task_id, title, due_date FROM "${schema}".remediation_tasks
       WHERE status NOT IN ('completed', 'done') AND due_date < $1
       ORDER BY due_date ASC LIMIT 10`, [now.toISOString()]);
        for (const t of overdue.rows) {
            insights.push({ type: 'overdue_task', severity: 'critical', title: `Overdue task: ${t.title}`, entityType: 'remediation_task', entityId: t.task_id, dueDate: t.due_date });
        }
    }
    catch (e) {
        logger.debug('[AgentInsights] query skipped:', e);
    }
    // High-risk items
    try {
        const highRisks = await safeQuery(`SELECT risk_id, title, risk_score FROM "${schema}".risks
       WHERE risk_score >= 20 AND status != 'mitigated'
       ORDER BY risk_score DESC LIMIT 5`);
        for (const r of highRisks.rows) {
            insights.push({ type: 'high_risk', severity: 'critical', title: `Critical risk: ${r.title} (score: ${r.risk_score})`, entityType: 'risk', entityId: r.risk_id });
        }
    }
    catch (e) {
        logger.debug('[AgentInsights] query skipped:', e);
    }
    // Upcoming assessment deadlines
    try {
        const upcoming = await safeQuery(`SELECT assessment_id, title, updated_at FROM "${schema}".assessments
       WHERE status = 'in_progress' ORDER BY updated_at ASC LIMIT 5`);
        for (const a of upcoming.rows) {
            insights.push({ type: 'assessment_pending', severity: 'info', title: `Assessment in progress: ${a.title}`, entityType: 'assessment', entityId: a.assessment_id });
        }
    }
    catch (e) {
        logger.debug('[AgentInsights] query skipped:', e);
    }
    // Connector health issues
    try {
        const unhealthyConnectors = await safeQuery(`SELECT connector_id, source_system_type, failure_count, last_success_at
       FROM "${schema}".connector_configs
       WHERE failure_count > 2 OR (last_success_at IS NOT NULL AND last_success_at < NOW() - INTERVAL '24 hours')`);
        for (const c of unhealthyConnectors.rows) {
            const severity = c.failure_count > 5 ? 'critical' : 'warning';
            insights.push({
                type: 'connector_health',
                severity,
                title: `Connector unhealthy: ${c.source_system_type} (${c.failure_count} failures)`,
                entityType: 'connector',
                entityId: c.connector_id,
            });
        }
    }
    catch (e) {
        logger.debug('[AgentInsights] query skipped:', e);
    }
    // Compliance score drift (if KPI snapshots show declining trend)
    try {
        const snapshots = await safeQuery(`SELECT compliance_score FROM "${schema}".kpi_snapshots
       ORDER BY snapshot_date DESC LIMIT 7`);
        if (snapshots.rows.length >= 3) {
            const scores = snapshots.rows.map((r) => parseFloat(r.compliance_score)).filter((v) => !isNaN(v));
            if (scores.length >= 3) {
                const recent = scores.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
                const older = scores.slice(-3).reduce((s, v) => s + v, 0) / Math.min(3, scores.length);
                if (recent < older - 5) {
                    insights.push({
                        type: 'compliance_drift',
                        severity: recent < older - 15 ? 'critical' : 'warning',
                        title: `Compliance score declining: ${Math.round(recent)}% (was ${Math.round(older)}%)`,
                        entityType: 'kpi',
                        entityId: 'compliance_score',
                    });
                }
            }
        }
    }
    catch (e) {
        logger.debug('[AgentInsights] query skipped:', e);
    }
    // Pending workflow approvals past SLA
    try {
        const overdueApprovals = await safeQuery(`SELECT approval_id, approver_id, step_id, sla_deadline
       FROM "${schema}".approvals
       WHERE status = 'pending' AND sla_deadline IS NOT NULL AND sla_deadline < NOW()
       ORDER BY sla_deadline ASC LIMIT 5`);
        for (const a of overdueApprovals.rows) {
            insights.push({
                type: 'overdue_approval',
                severity: 'warning',
                title: `Overdue approval: step ${a.step_id} (SLA: ${a.sla_deadline})`,
                entityType: 'approval',
                entityId: a.approval_id,
            });
        }
    }
    catch (e) {
        logger.debug('[AgentInsights] query skipped:', e);
    }
    // Sort by severity: critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    insights.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
    return insights;
}
export async function autoClassifyRisk(riskData, tenantId) {
    try {
        return await gatewayJSON({
            systemPrompt: "You are a KSA GRC risk classification expert. Classify risks using categories: cybersecurity, data_privacy, financial, compliance, third_party, operational, reputational, strategic.",
            userMessage: `Classify this risk:
- Title: ${riskData.title || "N/A"}
- Description: ${riskData.description || "N/A"}
- Category hint: ${riskData.category || "none"}

Respond with JSON: { "suggestedCategory": "...", "suggestedLikelihood": <1-5>, "suggestedImpact": <1-5> }`,
            maxTokens: 300,
            temperature: 0.1,
            tenantId,
        });
    }
    catch {
        return autoClassifyRiskFallback(riskData);
    }
}
function autoClassifyRiskFallback(riskData) {
    const text = `${riskData.title || ''} ${riskData.description || ''} ${riskData.category || ''}`.toLowerCase();
    let category = riskData.category || 'operational';
    let likelihood = 3;
    let impact = 3;
    if (text.includes('cyber') || text.includes('security') || text.includes('hack') || text.includes('breach')) {
        category = 'cybersecurity';
        impact = 4;
    }
    else if (text.includes('data') || text.includes('privacy') || text.includes('personal')) {
        category = 'data_privacy';
        impact = 4;
    }
    else if (text.includes('financial') || text.includes('fraud') || text.includes('money')) {
        category = 'financial';
        impact = 4;
        likelihood = 2;
    }
    else if (text.includes('compliance') || text.includes('regulatory') || text.includes('legal')) {
        category = 'compliance';
        impact = 4;
    }
    else if (text.includes('vendor') || text.includes('third') || text.includes('supplier')) {
        category = 'third_party';
        likelihood = 3;
    }
    if (text.includes('critical') || text.includes('severe') || text.includes('major')) {
        impact = 5;
    }
    if (text.includes('likely') || text.includes('frequent') || text.includes('common')) {
        likelihood = 4;
    }
    return { suggestedCategory: category, suggestedLikelihood: likelihood, suggestedImpact: impact };
}
export async function autoClassifyIncident(incidentData, tenantId) {
    try {
        return await gatewayJSON({
            systemPrompt: "You are a KSA GRC incident classification expert. Consider PDPL breach notification (72h), NCA CERT reporting, and SAMA incident reporting requirements.",
            userMessage: `Classify this incident:
- Title: ${incidentData.title || "N/A"}
- Description: ${incidentData.description || "N/A"}
- Category hint: ${incidentData.category || "none"}

Respond with JSON: { "suggestedSeverity": "critical|high|medium|low", "suggestedResponseActions": ["..."] }`,
            maxTokens: 500,
            temperature: 0.1,
            tenantId,
        });
    }
    catch {
        return autoClassifyIncidentFallback(incidentData);
    }
}
function autoClassifyIncidentFallback(incidentData) {
    const text = `${incidentData.title || ''} ${incidentData.description || ''} ${incidentData.category || ''}`.toLowerCase();
    let severity = 'medium';
    const actions = [];
    if (text.includes('breach') || text.includes('ransomware') || text.includes('data loss')) {
        severity = 'critical';
        actions.push('Activate incident response team', 'Notify CERT', 'Isolate affected systems', 'Preserve forensic evidence');
    }
    else if (text.includes('unauthorized') || text.includes('malware') || text.includes('phishing')) {
        severity = 'high';
        actions.push('Block threat vector', 'Reset affected credentials', 'Scan for lateral movement');
    }
    else if (text.includes('policy violation') || text.includes('misconfiguration')) {
        severity = 'medium';
        actions.push('Document violation', 'Review access controls', 'Update configuration');
    }
    else {
        severity = 'low';
        actions.push('Log incident', 'Monitor for recurrence');
    }
    actions.push('Update risk register', 'Document lessons learned');
    return { suggestedSeverity: severity, suggestedResponseActions: actions };
}
export async function recommendNextStep(workflowState, history, tenantId) {
    try {
        const result = await gatewayJSON({
            systemPrompt: "You are a KSA GRC workflow advisor. Recommend next steps based on workflow state.",
            userMessage: `Current workflow state:
- Current step: ${workflowState.currentStep}
- Completed steps: ${JSON.stringify(workflowState.completedSteps)}
- Recent history: ${JSON.stringify(history.slice(-5))}

Respond with JSON: { "recommendations": ["step1", "step2", ...] }
Provide 2-4 actionable recommendations.`,
            maxTokens: 500,
            temperature: 0.2,
            tenantId,
        });
        return result.recommendations;
    }
    catch {
        // Fallback
        const recs = [];
        if (workflowState.currentStep.includes('review') || workflowState.currentStep.includes('approval')) {
            recs.push('Ensure all required evidence is attached before approval', 'Check SLA deadline for this approval step');
        }
        if (workflowState.currentStep.includes('implement')) {
            recs.push('Verify implementation against control requirements', 'Collect evidence of implementation');
        }
        if (workflowState.completedSteps.length === 0) {
            recs.push('Begin with stakeholder identification');
        }
        return recs.length > 0 ? recs : ['Proceed to next step in workflow'];
    }
}
export function generateComplianceGapAlert(frameworkUpdate) {
    const total = frameworkUpdate.newControls + frameworkUpdate.updatedControls;
    const alertLevel = total > 10 ? 'critical' : total > 5 ? 'high' : total > 0 ? 'medium' : 'info';
    return {
        alertLevel,
        message: `Framework ${frameworkUpdate.frameworkId}: ${frameworkUpdate.newControls} new controls, ${frameworkUpdate.updatedControls} updated controls`,
        actions: [
            frameworkUpdate.newControls > 0 ? 'Map new controls to existing processes' : '',
            frameworkUpdate.updatedControls > 0 ? 'Review updated control requirements' : '',
            'Schedule compliance review meeting',
            'Update remediation plan',
        ].filter(Boolean),
    };
}
//# sourceMappingURL=ai-agent.service.js.map
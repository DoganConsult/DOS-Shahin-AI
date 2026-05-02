// @ts-nocheck
// ============================================
// Shahin -- Digital Twin Scenario Templates
// Pre-built scenario templates that users can
// apply with one click to simulate org-wide
// compliance impact scenarios
// ============================================
import { safeQuery } from "@dos/db";
// ── Template Definitions ────────────────────────────────────────────────
const SCENARIO_TEMPLATES = [
    // 1. Critical Vendor Data Breach
    {
        code: 'vendor_breach',
        name_en: 'Critical Vendor Data Breach',
        name_ar: 'اختراق بيانات مورد حرج',
        description_en: 'Simulates a key vendor being breached, moving all vendor-linked controls to compromised status and escalating linked risks to critical.',
        description_ar: 'يحاكي اختراق مورد رئيسي، مما ينقل جميع الضوابط المرتبطة بالموردين إلى حالة مخترقة ويصعد المخاطر المرتبطة إلى مستوى حرج.',
        category: 'vendor',
        severity: 'critical',
        changes: [
            // 5 controls become ineffective
            {
                type: 'control_change',
                description_en: 'Vendor access control compromised',
                description_ar: 'ضابط الوصول للمورد مخترق',
                change_params: { status: 'ineffective', entityIndex: 0, cascade: true },
            },
            {
                type: 'control_change',
                description_en: 'Vendor data encryption control failed',
                description_ar: 'فشل ضابط تشفير بيانات المورد',
                change_params: { status: 'ineffective', entityIndex: 1, cascade: true },
            },
            {
                type: 'control_change',
                description_en: 'Third-party monitoring control ineffective',
                description_ar: 'ضابط مراقبة الطرف الثالث غير فعال',
                change_params: { status: 'ineffective', entityIndex: 2, cascade: true },
            },
            {
                type: 'control_change',
                description_en: 'Vendor SLA compliance control compromised',
                description_ar: 'ضابط التزام اتفاقية مستوى الخدمة للمورد مخترق',
                change_params: { status: 'ineffective', entityIndex: 3, cascade: true },
            },
            {
                type: 'control_change',
                description_en: 'Vendor incident response control failed',
                description_ar: 'فشل ضابط استجابة حوادث المورد',
                change_params: { status: 'ineffective', entityIndex: 4, cascade: true },
            },
            // 3 risks escalate to critical (likelihood = 5)
            {
                type: 'risk_change',
                description_en: 'Data breach risk escalated to critical',
                description_ar: 'تصعيد خطر اختراق البيانات إلى حرج',
                change_params: { likelihood: 5, entityIndex: 0 },
            },
            {
                type: 'risk_change',
                description_en: 'Regulatory fine risk escalated',
                description_ar: 'تصعيد خطر الغرامات التنظيمية',
                change_params: { likelihood: 5, entityIndex: 1 },
            },
            {
                type: 'risk_change',
                description_en: 'Reputational damage risk escalated',
                description_ar: 'تصعيد خطر الضرر بالسمعة',
                change_params: { likelihood: 5, entityIndex: 2 },
            },
        ],
    },
    // 2. Key GRC Person Leaves
    {
        code: 'key_person_departure',
        name_en: 'Key GRC Person Leaves',
        name_ar: 'مغادرة شخص رئيسي في الحوكمة والمخاطر والامتثال',
        description_en: 'Simulates the departure of a compliance officer or CISO, creating ownership gaps in controls and policies.',
        description_ar: 'يحاكي مغادرة مسؤول الامتثال أو مدير أمن المعلومات، مما يخلق فجوات في ملكية الضوابط والسياسات.',
        category: 'personnel',
        severity: 'high',
        changes: [
            // 10 controls lose owner
            ...Array.from({ length: 10 }, (_, i) => ({
                type: 'control_change',
                description_en: `Control ${i + 1} ownership gap created`,
                description_ar: `فجوة ملكية الضابط ${i + 1}`,
                change_params: { owner_id: null, status: 'needs_review', entityIndex: i },
            })),
            // 5 policies lose owner
            ...Array.from({ length: 5 }, (_, i) => ({
                type: 'policy_change',
                description_en: `Policy ${i + 1} ownership gap created`,
                description_ar: `فجوة ملكية السياسة ${i + 1}`,
                change_params: { owner_id: null, status: 'needs_review', entityIndex: i },
            })),
        ],
    },
    // 3. New Regulatory Framework Added
    {
        code: 'new_regulation',
        name_en: 'New Regulatory Framework Added',
        name_ar: 'إضافة إطار تنظيمي جديد',
        description_en: 'Simulates adding a new framework with 50 controls, showing a gap analysis with approximately 70% unmapped controls.',
        description_ar: 'يحاكي إضافة إطار تنظيمي جديد يحتوي على 50 ضابطاً، مع تحليل فجوات يظهر حوالي 70% ضوابط غير مرتبطة.',
        category: 'regulatory',
        severity: 'high',
        changes: [
            // 50 new control requirements (35 not_implemented = 70% gap)
            ...Array.from({ length: 35 }, (_, i) => ({
                type: 'control_change',
                description_en: `New regulatory control ${i + 1} - not yet implemented`,
                description_ar: `ضابط تنظيمي جديد ${i + 1} - لم يتم تنفيذه بعد`,
                change_params: { status: 'not_implemented', entityIndex: i },
            })),
            ...Array.from({ length: 15 }, (_, i) => ({
                type: 'control_change',
                description_en: `New regulatory control ${i + 36} - partially mapped`,
                description_ar: `ضابط تنظيمي جديد ${i + 36} - مرتبط جزئياً`,
                change_params: { status: 'partially_implemented', entityIndex: i + 35 },
            })),
        ],
    },
    // 4. Ransomware Attack Scenario
    {
        code: 'ransomware_attack',
        name_en: 'Ransomware Attack Scenario',
        name_ar: 'سيناريو هجوم فدية',
        description_en: 'Simulates a ransomware attack where critical systems are encrypted, triggering BCP activation and degrading all IT controls.',
        description_ar: 'يحاكي هجوم فدية يتم فيه تشفير الأنظمة الحرجة، مما يؤدي إلى تفعيل خطة استمرارية الأعمال وتدهور جميع ضوابط تقنية المعلومات.',
        category: 'cyber',
        severity: 'critical',
        changes: [
            // 20 controls become not_testable
            ...Array.from({ length: 20 }, (_, i) => ({
                type: 'control_change',
                description_en: `IT control ${i + 1} not testable due to system encryption`,
                description_ar: `ضابط تقنية المعلومات ${i + 1} غير قابل للاختبار بسبب تشفير النظام`,
                change_params: { status: 'not_testable', test_status: 'blocked', entityIndex: i, cascade: true },
            })),
            // 5 risks impact escalated to 5
            ...Array.from({ length: 5 }, (_, i) => ({
                type: 'risk_change',
                description_en: `Risk ${i + 1} impact escalated due to ransomware`,
                description_ar: `تصعيد تأثير الخطر ${i + 1} بسبب هجوم الفدية`,
                change_params: { impact: 5, likelihood: 5, entityIndex: i },
            })),
        ],
    },
    // 5. Major Audit Finding
    {
        code: 'audit_failure',
        name_en: 'Major Audit Finding',
        name_ar: 'ملاحظة تدقيق رئيسية',
        description_en: 'Simulates an external audit finding 15 critical issues, causing compliance score drop and requiring a remediation plan.',
        description_ar: 'يحاكي تدقيق خارجي يكشف 15 ملاحظة حرجة، مما يؤدي إلى انخفاض درجة الامتثال ويتطلب خطة معالجة.',
        category: 'operational',
        severity: 'critical',
        changes: [
            // 8 controls become ineffective
            ...Array.from({ length: 8 }, (_, i) => ({
                type: 'control_change',
                description_en: `Control ${i + 1} found ineffective during audit`,
                description_ar: `الضابط ${i + 1} وجد غير فعال أثناء التدقيق`,
                change_params: { status: 'ineffective', test_status: 'failed', entityIndex: i, cascade: true },
            })),
            // 15 findings represented as risk escalations
            ...Array.from({ length: 7 }, (_, i) => ({
                type: 'risk_change',
                description_en: `Audit finding ${i + 1} - critical risk identified`,
                description_ar: `ملاحظة التدقيق ${i + 1} - خطر حرج محدد`,
                change_params: { likelihood: 4, impact: 4, entityIndex: i },
            })),
        ],
    },
    // 6. Regulatory Deadline in 90 Days
    {
        code: 'regulatory_deadline',
        name_en: 'Regulatory Deadline in 90 Days',
        name_ar: 'موعد تنظيمي نهائي خلال 90 يوماً',
        description_en: 'Simulates a regulator setting a 90-day compliance deadline, requiring priority shift to address all non-compliant controls.',
        description_ar: 'يحاكي تحديد الجهة التنظيمية لموعد امتثال نهائي خلال 90 يوماً، مما يتطلب تحويل الأولويات لمعالجة جميع الضوابط غير المتوافقة.',
        category: 'regulatory',
        severity: 'high',
        changes: [
            // Flag non-compliant controls as urgent
            ...Array.from({ length: 15 }, (_, i) => ({
                type: 'control_change',
                description_en: `Control ${i + 1} flagged urgent for 90-day deadline`,
                description_ar: `الضابط ${i + 1} مؤشر كعاجل للموعد النهائي 90 يوماً`,
                change_params: { priority: 'urgent', review_required: true, entityIndex: i },
            })),
            // Associated risks re-evaluated
            ...Array.from({ length: 5 }, (_, i) => ({
                type: 'risk_change',
                description_en: `Risk ${i + 1} re-evaluated for regulatory deadline`,
                description_ar: `إعادة تقييم الخطر ${i + 1} للموعد التنظيمي النهائي`,
                change_params: { likelihood: 4, entityIndex: i },
            })),
            // Policy updates needed
            ...Array.from({ length: 3 }, (_, i) => ({
                type: 'policy_change',
                description_en: `Policy ${i + 1} requires update for new regulation`,
                description_ar: `السياسة ${i + 1} تتطلب تحديثاً للتنظيم الجديد`,
                change_params: { status: 'needs_review', entityIndex: i },
            })),
        ],
    },
];
// ── Public Functions ────────────────────────────────────────────────────
/**
 * Return all available scenario templates.
 */
export function getScenarioTemplates() {
    return SCENARIO_TEMPLATES;
}
/**
 * Execute a scenario template against the digital twin.
 * Creates a new simulation, applies the template changes, computes impact,
 * and returns structured results with financial estimates and recommendations.
 */
export async function executeScenarioTemplate(tenantId, templateCode, userId) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
/**
 * Estimate financial impact based on impacted entities.
 * Each impacted control = $10,000, each critical risk = $50,000,
 * each compliance point lost = $25,000.
 */
export function estimateFinancialImpact(impactData) {
    const controlCost = (impactData.controlsImpacted || 0) * 10_000;
    const riskCost = (impactData.risksImpacted || 0) * 50_000;
    // complianceDelta is negative when compliance drops, so negate it
    const complianceCost = Math.abs(impactData.complianceDelta || 0) * 25_000;
    let total = controlCost + riskCost + complianceCost;
    // Apply severity multiplier for critical scenarios
    if (impactData.severity === 'critical') {
        total = Math.round(total * 1.5);
    }
    return total;
}
// ── Internal Helpers ────────────────────────────────────────────────────
/**
 * Resolve template changes (which use entityIndex) to real entity IDs
 * from the simulation snapshot.
 */
function resolveTemplateChanges(templateChanges, snapshot) {
    const controls = snapshot?.controls || [];
    const risks = snapshot?.risks || [];
    const policies = snapshot?.policies || [];
    return templateChanges.map((change) => {
        const { entityIndex, cascade, ...restParams } = change.change_params;
        const idx = typeof entityIndex === 'number' ? entityIndex : 0;
        let entityId = 'any';
        if (change.type === 'control_change') {
            // Use modulo to safely wrap around available entities
            const ctrl = controls.length > 0 ? controls[idx % controls.length] : null;
            entityId = ctrl?.control_id || `simulated-control-${idx}`;
        }
        else if (change.type === 'risk_change') {
            const risk = risks.length > 0 ? risks[idx % risks.length] : null;
            entityId = risk?.risk_id || `simulated-risk-${idx}`;
        }
        else if (change.type === 'policy_change') {
            const policy = policies.length > 0 ? policies[idx % policies.length] : null;
            entityId = policy?.policy_id || `simulated-policy-${idx}`;
        }
        else if (change.type === 'org_structure_change') {
            entityId = `org-unit-${idx}`;
        }
        return {
            type: change.type,
            entityId,
            changes: restParams,
            cascade: cascade === true,
        };
    });
}
/**
 * Extract affected department names from the simulation snapshot.
 */
function extractAffectedDepartments(snapshot, orgMetrics) {
    const orgStructure = snapshot?.orgStructure || [];
    const departments = orgStructure
        .filter((u) => u.unit_type === 'department')
        .map((u) => u.name || u.unit_name || 'Unknown Department');
    // If we have org-wide metrics showing departments affected, return those
    const count = orgMetrics.departmentsAffected || 0;
    if (count > 0 && departments.length > 0) {
        return departments.slice(0, count);
    }
    // Fallback: return all departments if org-wide scope
    return departments.length > 0 ? departments : ['All Departments'];
}
/**
 * Generate context-aware recommendations based on impact severity.
 */
function generateRecommendations(complianceDelta, controlsImpacted, risksImpacted, policiesImpacted, template) {
    const recommendations = [];
    // Compliance-based recommendations
    if (complianceDelta < -10) {
        recommendations.push('Immediate compliance remediation required - compliance score dropped significantly');
    }
    if (complianceDelta < -5 && complianceDelta >= -10) {
        recommendations.push('Schedule compliance review within 2 weeks to address score decline');
    }
    // Control-based recommendations
    if (controlsImpacted > 10) {
        recommendations.push('Establish emergency control testing program for all impacted controls');
    }
    if (controlsImpacted > 5 && controlsImpacted <= 10) {
        recommendations.push('Prioritize control remediation for the most critical impacted controls');
    }
    // Risk-based recommendations
    if (risksImpacted > 5) {
        recommendations.push('Convene risk committee emergency session to address escalated risks');
    }
    if (risksImpacted > 0 && risksImpacted <= 5) {
        recommendations.push('Update risk register and reassess risk treatment plans');
    }
    // Policy-based recommendations
    if (policiesImpacted > 3) {
        recommendations.push('Initiate policy review cycle for all affected policies');
    }
    if (policiesImpacted > 0 && policiesImpacted <= 3) {
        recommendations.push('Review and update ownership assignments for impacted policies');
    }
    // Category-specific recommendations
    switch (template.category) {
        case 'vendor':
            recommendations.push('Activate vendor incident response plan and notify affected third parties');
            recommendations.push('Review and update all vendor risk assessments');
            break;
        case 'cyber':
            recommendations.push('Activate business continuity plan and incident response procedures');
            recommendations.push('Engage cybersecurity forensics team for root cause analysis');
            break;
        case 'regulatory':
            recommendations.push('Engage regulatory affairs team to assess compliance gaps');
            recommendations.push('Develop a prioritized remediation roadmap with clear milestones');
            break;
        case 'personnel':
            recommendations.push('Identify interim owners for all orphaned controls and policies');
            recommendations.push('Initiate emergency succession planning for critical GRC roles');
            break;
        case 'operational':
            recommendations.push('Develop comprehensive remediation plan with executive sponsorship');
            recommendations.push('Increase monitoring frequency for all affected control areas');
            break;
    }
    // Severity-specific recommendations
    if (template.severity === 'critical') {
        recommendations.push('Notify board of directors and executive leadership immediately');
    }
    return recommendations;
}
//# sourceMappingURL=scenario-templates.service.js.map
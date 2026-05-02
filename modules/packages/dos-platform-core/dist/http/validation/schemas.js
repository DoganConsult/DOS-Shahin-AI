"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allSchemas = exports.filterSchemas = exports.remediationFilterQuery = exports.incidentFilterQuery = exports.assetFilterQuery = exports.vendorFilterQuery = exports.auditFilterQuery = exports.complianceFilterQuery = exports.riskFilterQuery = exports.onboardingSchemas = exports.qiyasSchemas = exports.analyticsSchemas = exports.userSchemas = exports.tenantSchemas = exports.notificationSchemas = exports.workflowSchemas = exports.incidentSchemas = exports.remediationSchemas = exports.doraSchemas = exports.privacySchemas = exports.trainingSchemas = exports.bcpSchemas = exports.evidenceSchemas = exports.governanceSchemas = exports.assetSchemas = exports.vendorSchemas = exports.auditSchemas = exports.complianceSchemas = exports.riskSchemas = exports.commonSchemas = void 0;
const zod_1 = require("zod");
const XSS_PATTERN = /<script[\s>]|javascript:|on\w+\s*=|<\s*\/?\s*(?:script|iframe|object|embed|form|input|button|textarea|select|link|style|meta|base)\b/i;
function safeStr(max = 1000) {
    return zod_1.z.string().min(1).max(max).refine(v => !XSS_PATTERN.test(v), { message: 'Potentially unsafe HTML/script content detected' });
}
function optSafeStr(max = 2000) {
    return zod_1.z.string().max(max).refine(v => !XSS_PATTERN.test(v), { message: 'Potentially unsafe HTML/script content detected' }).optional();
}
function piiStr(category, max = 500) {
    return safeStr(max).describe(`pii:${category}`);
}
function optPiiStr(category, max = 500) {
    return optSafeStr(max).describe(`pii:${category}`);
}
function piiEmail() {
    return zod_1.z.string().email().describe('pii:email');
}
function optPiiEmail() {
    return zod_1.z.string().email().describe('pii:email').optional();
}
const uuid = zod_1.z.string().uuid().or(zod_1.z.string().min(1).max(128));
const optionalUuid = uuid.optional();
const isoDate = zod_1.z.string().datetime().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/));
const optionalDate = isoDate.optional();
const nonEmpty = safeStr(1000);
const optionalStr = optSafeStr(2000);
const optionalNum = zod_1.z.number().optional();
const status = zod_1.z.enum(['active', 'inactive', 'draft', 'archived', 'pending', 'closed', 'open', 'mitigated', 'resolved', 'deleted']).optional();
const dateRange = zod_1.z.object({
    from: isoDate.optional(),
    to: isoDate.optional(),
}).refine(d => {
    if (d.from && d.to)
        return new Date(d.from) <= new Date(d.to);
    return true;
}, { message: 'from date must be before to date' });
const paginationQuery = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1).optional(),
    pageSize: zod_1.z.coerce.number().int().min(1).max(200).default(20).optional(),
    search: zod_1.z.string().max(500).optional(),
    sortBy: zod_1.z.string().max(100).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    status: zod_1.z.string().optional(),
    module: zod_1.z.string().optional(),
    createdAfter: zod_1.z.string().optional(),
    createdBefore: zod_1.z.string().optional(),
    updatedAfter: zod_1.z.string().optional(),
    updatedBefore: zod_1.z.string().optional(),
    owner: zod_1.z.string().max(200).optional(),
    category: zod_1.z.string().max(100).optional(),
    tags: zod_1.z.string().max(500).optional(),
});
const bulkAction = zod_1.z.object({
    ids: zod_1.z.array(uuid).min(1).max(100),
    action: zod_1.z.enum(['delete', 'archive', 'activate', 'deactivate', 'export', 'assign']),
    assignTo: optionalStr,
});
const idParams = zod_1.z.object({
    id: uuid,
});
const exportQuery = zod_1.z.object({
    format: zod_1.z.enum(['csv', 'xlsx', 'pdf', 'json']).default('csv'),
    columns: zod_1.z.string().max(1000).optional(),
    dateRange: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
});
exports.commonSchemas = { uuid, isoDate, nonEmpty, status, paginationQuery, idParams, dateRange, bulkAction, exportQuery, safeStr, optSafeStr, piiStr, optPiiStr, piiEmail, optPiiEmail };
exports.riskSchemas = {
    create: zod_1.z.object({
        title: nonEmpty,
        description: optionalStr,
        likelihood: zod_1.z.number().int().min(1).max(5).optional(),
        impact: zod_1.z.number().int().min(1).max(5).optional(),
        category: zod_1.z.string().max(100).optional(),
        status: zod_1.z.enum(['open', 'mitigated', 'closed', 'draft', 'pending']).default('open'),
        owner: optionalStr,
        treatment_plan: optionalStr,
        risk_type: zod_1.z.string().max(50).optional(),
        inherent_score: optionalNum,
        residual_score: optionalNum,
    }),
    update: zod_1.z.object({
        title: optionalStr,
        description: optionalStr,
        likelihood: zod_1.z.number().int().min(1).max(5).optional(),
        impact: zod_1.z.number().int().min(1).max(5).optional(),
        category: zod_1.z.string().max(100).optional(),
        status: zod_1.z.enum(['open', 'mitigated', 'closed', 'draft', 'pending']).optional(),
        owner: optionalStr,
        treatment_plan: optionalStr,
        disposition_reason: optionalStr,
    }),
};
exports.complianceSchemas = {
    createFramework: zod_1.z.object({
        name: nonEmpty,
        code: zod_1.z.string().min(1).max(50),
        version: zod_1.z.string().max(20).optional(),
        description: optionalStr,
        status: zod_1.z.enum(['active', 'draft', 'deprecated']).default('draft'),
        category: zod_1.z.string().max(100).optional(),
    }),
    createControl: zod_1.z.object({
        title: nonEmpty,
        control_id: zod_1.z.string().max(50).optional(),
        description: optionalStr,
        framework_id: optionalUuid,
        owner: optionalStr,
        control_type: zod_1.z.enum(['preventive', 'detective', 'corrective', 'directive']).optional(),
        status: zod_1.z.enum(['active', 'draft', 'ineffective', 'effective']).default('draft'),
        frequency: zod_1.z.enum(['continuous', 'daily', 'weekly', 'monthly', 'quarterly', 'annual']).optional(),
    }),
    updateControl: zod_1.z.object({
        title: optionalStr,
        description: optionalStr,
        owner: optionalStr,
        control_type: zod_1.z.enum(['preventive', 'detective', 'corrective', 'directive']).optional(),
        status: zod_1.z.enum(['active', 'draft', 'ineffective', 'effective']).optional(),
        linked_evidence: optionalStr,
        last_test_date: optionalDate,
    }),
};
exports.auditSchemas = {
    create: zod_1.z.object({
        title: nonEmpty,
        action: zod_1.z.string().min(1).max(200).optional(),
        actorId: optionalStr,
        owner: optionalStr,
        description: optionalStr,
        details: zod_1.z.record(zod_1.z.unknown()).optional(),
        entity_type: zod_1.z.string().max(100).optional(),
        entity_id: optionalStr,
        module: zod_1.z.string().max(50).optional(),
        audit_type: zod_1.z.enum(['internal', 'external', 'compliance', 'operational']).optional(),
        status: zod_1.z.enum(['planned', 'in_progress', 'completed', 'draft']).default('draft'),
    }),
};
exports.vendorSchemas = {
    create: zod_1.z.object({
        name: nonEmpty,
        category: zod_1.z.string().max(100).optional(),
        tier: zod_1.z.enum(['critical', 'high', 'medium', 'low']).optional(),
        status: zod_1.z.enum(['active', 'inactive', 'pending', 'terminated']).default('active'),
        contact_email: optPiiEmail(),
        contact_name: optPiiStr('name'),
        owner: optionalStr,
        risk_score: optionalNum,
        contract_start: optionalDate,
        contract_end: optionalDate,
    }),
    update: zod_1.z.object({
        name: optionalStr,
        category: zod_1.z.string().max(100).optional(),
        tier: zod_1.z.enum(['critical', 'high', 'medium', 'low']).optional(),
        status: zod_1.z.enum(['active', 'inactive', 'pending', 'terminated']).optional(),
        contact_email: optPiiEmail(),
        owner: optionalStr,
        risk_score: optionalNum,
    }),
};
exports.assetSchemas = {
    create: zod_1.z.object({
        name: nonEmpty,
        asset_type: zod_1.z.enum(['hardware', 'software', 'data', 'network', 'personnel', 'facility', 'service']).optional(),
        classification: zod_1.z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
        criticality: zod_1.z.enum(['critical', 'high', 'medium', 'low']).optional(),
        status: zod_1.z.enum(['active', 'inactive', 'decommissioned', 'draft']).default('active'),
        owner: optionalStr,
        location: optionalStr,
        description: optionalStr,
    }),
    update: zod_1.z.object({
        name: optionalStr,
        asset_type: zod_1.z.enum(['hardware', 'software', 'data', 'network', 'personnel', 'facility', 'service']).optional(),
        classification: zod_1.z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
        criticality: zod_1.z.enum(['critical', 'high', 'medium', 'low']).optional(),
        status: zod_1.z.enum(['active', 'inactive', 'decommissioned', 'draft']).optional(),
        owner: optionalStr,
    }),
};
exports.governanceSchemas = {
    createPolicy: zod_1.z.object({
        title: nonEmpty,
        owner: optionalStr,
        description: optionalStr,
        category: zod_1.z.string().max(100).optional(),
        review_frequency: zod_1.z.enum(['monthly', 'quarterly', 'semi-annual', 'annual']).optional(),
        status: zod_1.z.enum(['draft', 'active', 'expired', 'archived']).default('draft'),
        approved_by: optionalStr,
        review_date: optionalDate,
    }),
    updatePolicy: zod_1.z.object({
        title: optionalStr,
        owner: optionalStr,
        description: optionalStr,
        review_frequency: zod_1.z.enum(['monthly', 'quarterly', 'semi-annual', 'annual']).optional(),
        status: zod_1.z.enum(['draft', 'active', 'expired', 'archived']).optional(),
        approved_by: optionalStr,
        review_date: optionalDate,
    }),
};
exports.evidenceSchemas = {
    create: zod_1.z.object({
        title: nonEmpty,
        source: zod_1.z.string().max(200).optional(),
        owner: optionalStr,
        description: optionalStr,
        evidence_type: zod_1.z.enum(['document', 'screenshot', 'log', 'report', 'certificate', 'attestation']).optional(),
        status: zod_1.z.enum(['draft', 'pending', 'approved', 'rejected', 'expired']).default('draft'),
        control_id: optionalUuid,
        valid_from: optionalDate,
        valid_until: optionalDate,
    }),
};
exports.bcpSchemas = {
    create: zod_1.z.object({
        name: nonEmpty,
        owner: optionalStr,
        description: optionalStr,
        plan_type: zod_1.z.enum(['bcp', 'drp', 'incident_response', 'crisis_management']).optional(),
        status: zod_1.z.enum(['draft', 'active', 'expired', 'testing']).default('draft'),
        rto_hours: optionalNum,
        rpo_hours: optionalNum,
        last_tested: optionalDate,
    }),
};
exports.trainingSchemas = {
    create: zod_1.z.object({
        title: nonEmpty,
        owner: optionalStr,
        description: optionalStr,
        training_type: zod_1.z.enum(['awareness', 'technical', 'compliance', 'role_based']).optional(),
        status: zod_1.z.enum(['draft', 'active', 'completed', 'archived']).default('draft'),
        due_date: optionalDate,
        duration_minutes: optionalNum,
    }),
};
exports.privacySchemas = {
    create: zod_1.z.object({
        title: nonEmpty,
        assessment_type: zod_1.z.enum(['dpia', 'pia', 'tia', 'lia']).optional(),
        status: zod_1.z.enum(['draft', 'in_progress', 'completed', 'approved']).default('draft'),
        owner: optionalStr,
        description: optionalStr,
        data_categories: zod_1.z.array(zod_1.z.string()).optional(),
    }),
};
exports.doraSchemas = {
    create: zod_1.z.object({
        title: nonEmpty,
        assessment_type: zod_1.z.enum(['ict_risk', 'incident_reporting', 'resilience_testing', 'third_party']).optional(),
        status: zod_1.z.enum(['draft', 'in_progress', 'completed', 'approved']).default('draft'),
        owner: optionalStr,
        description: optionalStr,
    }),
};
exports.remediationSchemas = {
    create: zod_1.z.object({
        title: nonEmpty,
        owner: optionalStr,
        description: optionalStr,
        priority: zod_1.z.enum(['critical', 'high', 'medium', 'low']).optional(),
        status: zod_1.z.enum(['open', 'in_progress', 'completed', 'overdue', 'cancelled']).default('open'),
        due_date: optionalDate,
        source_type: zod_1.z.string().max(50).optional(),
        source_id: optionalUuid,
    }),
};
exports.incidentSchemas = {
    create: zod_1.z.object({
        title: nonEmpty,
        severity: zod_1.z.enum(['critical', 'high', 'medium', 'low']),
        description: optionalStr,
        status: zod_1.z.enum(['open', 'investigating', 'contained', 'resolved', 'closed']).default('open'),
        reporter: optPiiStr('name'),
        category: zod_1.z.string().max(100).optional(),
        root_cause: optionalStr,
        resolution: optionalStr,
    }),
    update: zod_1.z.object({
        title: optionalStr,
        severity: zod_1.z.enum(['critical', 'high', 'medium', 'low']).optional(),
        status: zod_1.z.enum(['open', 'investigating', 'contained', 'resolved', 'closed']).optional(),
        root_cause: optionalStr,
        resolution: optionalStr,
    }),
};
exports.workflowSchemas = {
    create: zod_1.z.object({
        name: nonEmpty,
        owner: optionalStr,
        description: optionalStr,
        workflow_type: zod_1.z.enum(['approval', 'review', 'notification', 'automation', 'custom']).optional(),
        status: zod_1.z.enum(['draft', 'active', 'paused', 'archived']).default('draft'),
        trigger: zod_1.z.string().max(200).optional(),
        steps: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).optional(),
    }),
};
exports.notificationSchemas = {
    create: zod_1.z.object({
        type: zod_1.z.enum(['email', 'in_app', 'sms', 'webhook']),
        subject: nonEmpty,
        body: zod_1.z.string().min(1).max(10000),
        recipient_id: optionalUuid,
        recipient_email: optPiiEmail(),
        priority: zod_1.z.enum(['high', 'normal', 'low']).default('normal'),
        metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    }),
};
exports.tenantSchemas = {
    create: zod_1.z.object({
        tenant_code: zod_1.z.string().min(2).max(50),
        tenant_name_en: nonEmpty,
        tenant_name_ar: optionalStr,
        org_name: nonEmpty,
        industry: zod_1.z.string().max(100).optional(),
        org_size: zod_1.z.string().max(50).optional(),
        country: zod_1.z.string().max(100).optional(),
        timezone: zod_1.z.string().max(50).optional(),
    }),
    update: zod_1.z.object({
        tenant_name_en: optionalStr,
        tenant_name_ar: optionalStr,
        org_name: optionalStr,
        industry: zod_1.z.string().max(100).optional(),
        org_size: zod_1.z.string().max(50).optional(),
        status: zod_1.z.enum(['active', 'suspended', 'deactivated']).optional(),
    }),
};
exports.userSchemas = {
    create: zod_1.z.object({
        email: piiEmail(),
        name: piiStr('name'),
        full_name: optPiiStr('name'),
        password: zod_1.z.string().min(8).max(128).optional(),
        role_code: zod_1.z.string().max(50).optional(),
        status: zod_1.z.enum(['active', 'inactive', 'pending']).default('pending'),
    }),
    update: zod_1.z.object({
        name: optPiiStr('name'),
        full_name: optPiiStr('name'),
        email: optPiiEmail(),
        status: zod_1.z.enum(['active', 'inactive', 'pending']).optional(),
        role_code: zod_1.z.string().max(50).optional(),
    }),
};
exports.analyticsSchemas = {
    createDashboard: zod_1.z.object({
        name: nonEmpty,
        description: optionalStr,
        layout: zod_1.z.record(zod_1.z.unknown()).optional(),
        visibility: zod_1.z.enum(['private', 'shared', 'public']).default('private'),
        widgets: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).optional(),
    }),
    createWidget: zod_1.z.object({
        name: nonEmpty,
        widget_type: zod_1.z.enum(['chart', 'table', 'kpi', 'map', 'gauge', 'list']).optional(),
        data_source: zod_1.z.string().max(200).optional(),
        config: zod_1.z.record(zod_1.z.unknown()).optional(),
    }),
};
exports.qiyasSchemas = {
    create: zod_1.z.object({
        title: nonEmpty,
        maturity_model: zod_1.z.string().max(100).optional(),
        status: zod_1.z.enum(['draft', 'in_progress', 'completed']).default('draft'),
        target_level: zod_1.z.number().int().min(1).max(5).optional(),
        current_level: zod_1.z.number().int().min(0).max(5).optional(),
        owner: optionalStr,
    }),
};
exports.onboardingSchemas = {
    start: zod_1.z.object({
        tenant_code: zod_1.z.string().min(2).max(50),
        org_name: nonEmpty,
        admin_email: zod_1.z.string().email(),
        admin_name: nonEmpty,
        industry: zod_1.z.string().max(100).optional(),
        org_size: zod_1.z.string().max(50).optional(),
        selected_modules: zod_1.z.array(zod_1.z.string()).optional(),
        product_code: zod_1.z.string().max(50).default('agrc'),
    }),
};
exports.riskFilterQuery = paginationQuery.extend({
    likelihood_min: zod_1.z.coerce.number().int().min(1).max(5).optional(),
    likelihood_max: zod_1.z.coerce.number().int().min(1).max(5).optional(),
    impact_min: zod_1.z.coerce.number().int().min(1).max(5).optional(),
    impact_max: zod_1.z.coerce.number().int().min(1).max(5).optional(),
    risk_type: zod_1.z.string().max(50).optional(),
});
exports.complianceFilterQuery = paginationQuery.extend({
    framework_id: optionalUuid,
    control_type: zod_1.z.enum(['preventive', 'detective', 'corrective', 'directive']).optional(),
    effectiveness: zod_1.z.enum(['effective', 'ineffective', 'not_tested']).optional(),
});
exports.auditFilterQuery = paginationQuery.extend({
    audit_type: zod_1.z.enum(['internal', 'external', 'compliance', 'operational']).optional(),
    entity_type: zod_1.z.string().max(100).optional(),
    entity_id: optionalUuid,
    actor_id: zod_1.z.string().max(200).optional(),
});
exports.vendorFilterQuery = paginationQuery.extend({
    tier: zod_1.z.enum(['critical', 'high', 'medium', 'low']).optional(),
    contract_active: zod_1.z.coerce.boolean().optional(),
});
exports.assetFilterQuery = paginationQuery.extend({
    asset_type: zod_1.z.enum(['hardware', 'software', 'data', 'network', 'personnel', 'facility', 'service']).optional(),
    classification: zod_1.z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
    criticality: zod_1.z.enum(['critical', 'high', 'medium', 'low']).optional(),
});
exports.incidentFilterQuery = paginationQuery.extend({
    severity: zod_1.z.enum(['critical', 'high', 'medium', 'low']).optional(),
    reported_after: zod_1.z.string().optional(),
    reported_before: zod_1.z.string().optional(),
});
exports.remediationFilterQuery = paginationQuery.extend({
    priority: zod_1.z.enum(['critical', 'high', 'medium', 'low']).optional(),
    overdue_only: zod_1.z.coerce.boolean().optional(),
    source_type: zod_1.z.string().max(50).optional(),
});
exports.filterSchemas = {
    risk: exports.riskFilterQuery,
    compliance: exports.complianceFilterQuery,
    audit: exports.auditFilterQuery,
    vendor: exports.vendorFilterQuery,
    asset: exports.assetFilterQuery,
    incident: exports.incidentFilterQuery,
    remediation: exports.remediationFilterQuery,
};
exports.allSchemas = {
    common: exports.commonSchemas,
    risk: exports.riskSchemas,
    compliance: exports.complianceSchemas,
    audit: exports.auditSchemas,
    vendor: exports.vendorSchemas,
    asset: exports.assetSchemas,
    governance: exports.governanceSchemas,
    evidence: exports.evidenceSchemas,
    bcp: exports.bcpSchemas,
    training: exports.trainingSchemas,
    privacy: exports.privacySchemas,
    dora: exports.doraSchemas,
    remediation: exports.remediationSchemas,
    incident: exports.incidentSchemas,
    workflow: exports.workflowSchemas,
    notification: exports.notificationSchemas,
    tenant: exports.tenantSchemas,
    user: exports.userSchemas,
    analytics: exports.analyticsSchemas,
    qiyas: exports.qiyasSchemas,
    onboarding: exports.onboardingSchemas,
    filters: exports.filterSchemas,
};
//# sourceMappingURL=schemas.js.map
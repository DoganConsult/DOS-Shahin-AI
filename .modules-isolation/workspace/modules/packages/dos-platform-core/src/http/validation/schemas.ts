import { z } from 'zod';

const XSS_PATTERN = /<script[\s>]|javascript:|on\w+\s*=|<\s*\/?\s*(?:script|iframe|object|embed|form|input|button|textarea|select|link|style|meta|base)\b/i;

function safeStr(max = 1000) {
  return z.string().min(1).max(max).refine(v => !XSS_PATTERN.test(v), { message: 'Potentially unsafe HTML/script content detected' });
}

function optSafeStr(max = 2000) {
  return z.string().max(max).refine(v => !XSS_PATTERN.test(v), { message: 'Potentially unsafe HTML/script content detected' }).optional();
}

// ── PII-tagged string constructors ──────────────────────────────
// Uses Zod's native .describe() for zero-overhead metadata annotation.
// Compliance tooling can inspect schema.description for "pii:<category>" tags.
type PiiCategory = 'email' | 'name' | 'phone' | 'address' | 'national_id' | 'ip' | 'dob' | 'ssn' | 'bank_account';

function piiStr(category: PiiCategory, max = 500) {
  return safeStr(max).describe(`pii:${category}`);
}

function optPiiStr(category: PiiCategory, max = 500) {
  return optSafeStr(max).describe(`pii:${category}`);
}

function piiEmail() {
  return z.string().email().describe('pii:email');
}

function optPiiEmail() {
  return z.string().email().describe('pii:email').optional();
}

const uuid = z.string().uuid().or(z.string().min(1).max(128));
const optionalUuid = uuid.optional();
const isoDate = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));
const optionalDate = isoDate.optional();
const nonEmpty = safeStr(1000);
const optionalStr = optSafeStr(2000);
const optionalNum = z.number().optional();
const status = z.enum(['active', 'inactive', 'draft', 'archived', 'pending', 'closed', 'open', 'mitigated', 'resolved', 'deleted']).optional();

const dateRange = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
}).refine(d => {
  if (d.from && d.to) return new Date(d.from) <= new Date(d.to);
  return true;
}, { message: 'from date must be before to date' });

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).default(20).optional(),
  search: z.string().max(500).optional(),
  sortBy: z.string().max(100).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  status: z.string().optional(),
  module: z.string().optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  updatedAfter: z.string().optional(),
  updatedBefore: z.string().optional(),
  owner: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  tags: z.string().max(500).optional(),
});

const bulkAction = z.object({
  ids: z.array(uuid).min(1).max(100),
  action: z.enum(['delete', 'archive', 'activate', 'deactivate', 'export', 'assign']),
  assignTo: optionalStr,
});

const idParams = z.object({
  id: uuid,
});

const exportQuery = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf', 'json']).default('csv'),
  columns: z.string().max(1000).optional(),
  dateRange: z.string().optional(),
  status: z.string().optional(),
});

export const commonSchemas = { uuid, isoDate, nonEmpty, status, paginationQuery, idParams, dateRange, bulkAction, exportQuery, safeStr, optSafeStr, piiStr, optPiiStr, piiEmail, optPiiEmail };

export const riskSchemas = {
  create: z.object({
    title: nonEmpty,
    description: optionalStr,
    likelihood: z.number().int().min(1).max(5).optional(),
    impact: z.number().int().min(1).max(5).optional(),
    category: z.string().max(100).optional(),
    status: z.enum(['open', 'mitigated', 'closed', 'draft', 'pending']).default('open'),
    owner: optionalStr,
    treatment_plan: optionalStr,
    risk_type: z.string().max(50).optional(),
    inherent_score: optionalNum,
    residual_score: optionalNum,
  }),
  update: z.object({
    title: optionalStr,
    description: optionalStr,
    likelihood: z.number().int().min(1).max(5).optional(),
    impact: z.number().int().min(1).max(5).optional(),
    category: z.string().max(100).optional(),
    status: z.enum(['open', 'mitigated', 'closed', 'draft', 'pending']).optional(),
    owner: optionalStr,
    treatment_plan: optionalStr,
    disposition_reason: optionalStr,
  }),
};

export const complianceSchemas = {
  createFramework: z.object({
    name: nonEmpty,
    code: z.string().min(1).max(50),
    version: z.string().max(20).optional(),
    description: optionalStr,
    status: z.enum(['active', 'draft', 'deprecated']).default('draft'),
    category: z.string().max(100).optional(),
  }),
  createControl: z.object({
    title: nonEmpty,
    control_id: z.string().max(50).optional(),
    description: optionalStr,
    framework_id: optionalUuid,
    owner: optionalStr,
    control_type: z.enum(['preventive', 'detective', 'corrective', 'directive']).optional(),
    status: z.enum(['active', 'draft', 'ineffective', 'effective']).default('draft'),
    frequency: z.enum(['continuous', 'daily', 'weekly', 'monthly', 'quarterly', 'annual']).optional(),
  }),
  updateControl: z.object({
    title: optionalStr,
    description: optionalStr,
    owner: optionalStr,
    control_type: z.enum(['preventive', 'detective', 'corrective', 'directive']).optional(),
    status: z.enum(['active', 'draft', 'ineffective', 'effective']).optional(),
    linked_evidence: optionalStr,
    last_test_date: optionalDate,
  }),
};

export const auditSchemas = {
  create: z.object({
    title: nonEmpty,
    action: z.string().min(1).max(200).optional(),
    actorId: optionalStr,
    owner: optionalStr,
    description: optionalStr,
    details: z.record(z.unknown()).optional(),
    entity_type: z.string().max(100).optional(),
    entity_id: optionalStr,
    module: z.string().max(50).optional(),
    audit_type: z.enum(['internal', 'external', 'compliance', 'operational']).optional(),
    status: z.enum(['planned', 'in_progress', 'completed', 'draft']).default('draft'),
  }),
};

export const vendorSchemas = {
  create: z.object({
    name: nonEmpty,
    category: z.string().max(100).optional(),
    tier: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    status: z.enum(['active', 'inactive', 'pending', 'terminated']).default('active'),
    contact_email: optPiiEmail(),
    contact_name: optPiiStr('name'),
    owner: optionalStr,
    risk_score: optionalNum,
    contract_start: optionalDate,
    contract_end: optionalDate,
  }),
  update: z.object({
    name: optionalStr,
    category: z.string().max(100).optional(),
    tier: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    status: z.enum(['active', 'inactive', 'pending', 'terminated']).optional(),
    contact_email: optPiiEmail(),
    owner: optionalStr,
    risk_score: optionalNum,
  }),
};

export const assetSchemas = {
  create: z.object({
    name: nonEmpty,
    asset_type: z.enum(['hardware', 'software', 'data', 'network', 'personnel', 'facility', 'service']).optional(),
    classification: z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
    criticality: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    status: z.enum(['active', 'inactive', 'decommissioned', 'draft']).default('active'),
    owner: optionalStr,
    location: optionalStr,
    description: optionalStr,
  }),
  update: z.object({
    name: optionalStr,
    asset_type: z.enum(['hardware', 'software', 'data', 'network', 'personnel', 'facility', 'service']).optional(),
    classification: z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
    criticality: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    status: z.enum(['active', 'inactive', 'decommissioned', 'draft']).optional(),
    owner: optionalStr,
  }),
};

export const governanceSchemas = {
  createPolicy: z.object({
    title: nonEmpty,
    owner: optionalStr,
    description: optionalStr,
    category: z.string().max(100).optional(),
    review_frequency: z.enum(['monthly', 'quarterly', 'semi-annual', 'annual']).optional(),
    status: z.enum(['draft', 'active', 'expired', 'archived']).default('draft'),
    approved_by: optionalStr,
    review_date: optionalDate,
  }),
  updatePolicy: z.object({
    title: optionalStr,
    owner: optionalStr,
    description: optionalStr,
    review_frequency: z.enum(['monthly', 'quarterly', 'semi-annual', 'annual']).optional(),
    status: z.enum(['draft', 'active', 'expired', 'archived']).optional(),
    approved_by: optionalStr,
    review_date: optionalDate,
  }),
};

export const evidenceSchemas = {
  create: z.object({
    title: nonEmpty,
    source: z.string().max(200).optional(),
    owner: optionalStr,
    description: optionalStr,
    evidence_type: z.enum(['document', 'screenshot', 'log', 'report', 'certificate', 'attestation']).optional(),
    status: z.enum(['draft', 'pending', 'approved', 'rejected', 'expired']).default('draft'),
    control_id: optionalUuid,
    valid_from: optionalDate,
    valid_until: optionalDate,
  }),
};

export const bcpSchemas = {
  create: z.object({
    name: nonEmpty,
    owner: optionalStr,
    description: optionalStr,
    plan_type: z.enum(['bcp', 'drp', 'incident_response', 'crisis_management']).optional(),
    status: z.enum(['draft', 'active', 'expired', 'testing']).default('draft'),
    rto_hours: optionalNum,
    rpo_hours: optionalNum,
    last_tested: optionalDate,
  }),
};

export const trainingSchemas = {
  create: z.object({
    title: nonEmpty,
    owner: optionalStr,
    description: optionalStr,
    training_type: z.enum(['awareness', 'technical', 'compliance', 'role_based']).optional(),
    status: z.enum(['draft', 'active', 'completed', 'archived']).default('draft'),
    due_date: optionalDate,
    duration_minutes: optionalNum,
  }),
};

export const privacySchemas = {
  create: z.object({
    title: nonEmpty,
    assessment_type: z.enum(['dpia', 'pia', 'tia', 'lia']).optional(),
    status: z.enum(['draft', 'in_progress', 'completed', 'approved']).default('draft'),
    owner: optionalStr,
    description: optionalStr,
    data_categories: z.array(z.string()).optional(),
  }),
};

export const doraSchemas = {
  create: z.object({
    title: nonEmpty,
    assessment_type: z.enum(['ict_risk', 'incident_reporting', 'resilience_testing', 'third_party']).optional(),
    status: z.enum(['draft', 'in_progress', 'completed', 'approved']).default('draft'),
    owner: optionalStr,
    description: optionalStr,
  }),
};

export const remediationSchemas = {
  create: z.object({
    title: nonEmpty,
    owner: optionalStr,
    description: optionalStr,
    priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    status: z.enum(['open', 'in_progress', 'completed', 'overdue', 'cancelled']).default('open'),
    due_date: optionalDate,
    source_type: z.string().max(50).optional(),
    source_id: optionalUuid,
  }),
};

export const incidentSchemas = {
  create: z.object({
    title: nonEmpty,
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: optionalStr,
    status: z.enum(['open', 'investigating', 'contained', 'resolved', 'closed']).default('open'),
    reporter: optPiiStr('name'),
    category: z.string().max(100).optional(),
    root_cause: optionalStr,
    resolution: optionalStr,
  }),
  update: z.object({
    title: optionalStr,
    severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    status: z.enum(['open', 'investigating', 'contained', 'resolved', 'closed']).optional(),
    root_cause: optionalStr,
    resolution: optionalStr,
  }),
};

export const workflowSchemas = {
  create: z.object({
    name: nonEmpty,
    owner: optionalStr,
    description: optionalStr,
    workflow_type: z.enum(['approval', 'review', 'notification', 'automation', 'custom']).optional(),
    status: z.enum(['draft', 'active', 'paused', 'archived']).default('draft'),
    trigger: z.string().max(200).optional(),
    steps: z.array(z.record(z.unknown())).optional(),
  }),
};

export const notificationSchemas = {
  create: z.object({
    type: z.enum(['email', 'in_app', 'sms', 'webhook']),
    subject: nonEmpty,
    body: z.string().min(1).max(10000),
    recipient_id: optionalUuid,
    recipient_email: optPiiEmail(),
    priority: z.enum(['high', 'normal', 'low']).default('normal'),
    metadata: z.record(z.unknown()).optional(),
  }),
};

export const tenantSchemas = {
  create: z.object({
    tenant_code: z.string().min(2).max(50),
    tenant_name_en: nonEmpty,
    tenant_name_ar: optionalStr,
    org_name: nonEmpty,
    industry: z.string().max(100).optional(),
    org_size: z.string().max(50).optional(),
    country: z.string().max(100).optional(),
    timezone: z.string().max(50).optional(),
  }),
  update: z.object({
    tenant_name_en: optionalStr,
    tenant_name_ar: optionalStr,
    org_name: optionalStr,
    industry: z.string().max(100).optional(),
    org_size: z.string().max(50).optional(),
    status: z.enum(['active', 'suspended', 'deactivated']).optional(),
  }),
};

export const userSchemas = {
  create: z.object({
    email: piiEmail(),
    name: piiStr('name'),
    full_name: optPiiStr('name'),
    password: z.string().min(8).max(128).optional(),
    role_code: z.string().max(50).optional(),
    status: z.enum(['active', 'inactive', 'pending']).default('pending'),
  }),
  update: z.object({
    name: optPiiStr('name'),
    full_name: optPiiStr('name'),
    email: optPiiEmail(),
    status: z.enum(['active', 'inactive', 'pending']).optional(),
    role_code: z.string().max(50).optional(),
  }),
};

export const analyticsSchemas = {
  createDashboard: z.object({
    name: nonEmpty,
    description: optionalStr,
    layout: z.record(z.unknown()).optional(),
    visibility: z.enum(['private', 'shared', 'public']).default('private'),
    widgets: z.array(z.record(z.unknown())).optional(),
  }),
  createWidget: z.object({
    name: nonEmpty,
    widget_type: z.enum(['chart', 'table', 'kpi', 'map', 'gauge', 'list']).optional(),
    data_source: z.string().max(200).optional(),
    config: z.record(z.unknown()).optional(),
  }),
};

export const qiyasSchemas = {
  create: z.object({
    title: nonEmpty,
    maturity_model: z.string().max(100).optional(),
    status: z.enum(['draft', 'in_progress', 'completed']).default('draft'),
    target_level: z.number().int().min(1).max(5).optional(),
    current_level: z.number().int().min(0).max(5).optional(),
    owner: optionalStr,
  }),
};

export const onboardingSchemas = {
  start: z.object({
    tenant_code: z.string().min(2).max(50),
    org_name: nonEmpty,
    admin_email: z.string().email(),
    admin_name: nonEmpty,
    industry: z.string().max(100).optional(),
    org_size: z.string().max(50).optional(),
    selected_modules: z.array(z.string()).optional(),
    product_code: z.string().max(50).default('agrc'),
  }),
};

export const riskFilterQuery = paginationQuery.extend({
  likelihood_min: z.coerce.number().int().min(1).max(5).optional(),
  likelihood_max: z.coerce.number().int().min(1).max(5).optional(),
  impact_min: z.coerce.number().int().min(1).max(5).optional(),
  impact_max: z.coerce.number().int().min(1).max(5).optional(),
  risk_type: z.string().max(50).optional(),
});

export const complianceFilterQuery = paginationQuery.extend({
  framework_id: optionalUuid,
  control_type: z.enum(['preventive', 'detective', 'corrective', 'directive']).optional(),
  effectiveness: z.enum(['effective', 'ineffective', 'not_tested']).optional(),
});

export const auditFilterQuery = paginationQuery.extend({
  audit_type: z.enum(['internal', 'external', 'compliance', 'operational']).optional(),
  entity_type: z.string().max(100).optional(),
  entity_id: optionalUuid,
  actor_id: z.string().max(200).optional(),
});

export const vendorFilterQuery = paginationQuery.extend({
  tier: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  contract_active: z.coerce.boolean().optional(),
});

export const assetFilterQuery = paginationQuery.extend({
  asset_type: z.enum(['hardware', 'software', 'data', 'network', 'personnel', 'facility', 'service']).optional(),
  classification: z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
  criticality: z.enum(['critical', 'high', 'medium', 'low']).optional(),
});

export const incidentFilterQuery = paginationQuery.extend({
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  reported_after: z.string().optional(),
  reported_before: z.string().optional(),
});

export const remediationFilterQuery = paginationQuery.extend({
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  overdue_only: z.coerce.boolean().optional(),
  source_type: z.string().max(50).optional(),
});

export const filterSchemas = {
  risk: riskFilterQuery,
  compliance: complianceFilterQuery,
  audit: auditFilterQuery,
  vendor: vendorFilterQuery,
  asset: assetFilterQuery,
  incident: incidentFilterQuery,
  remediation: remediationFilterQuery,
};

export const allSchemas = {
  common: commonSchemas,
  risk: riskSchemas,
  compliance: complianceSchemas,
  audit: auditSchemas,
  vendor: vendorSchemas,
  asset: assetSchemas,
  governance: governanceSchemas,
  evidence: evidenceSchemas,
  bcp: bcpSchemas,
  training: trainingSchemas,
  privacy: privacySchemas,
  dora: doraSchemas,
  remediation: remediationSchemas,
  incident: incidentSchemas,
  workflow: workflowSchemas,
  notification: notificationSchemas,
  tenant: tenantSchemas,
  user: userSchemas,
  analytics: analyticsSchemas,
  qiyas: qiyasSchemas,
  onboarding: onboardingSchemas,
  filters: filterSchemas,
};

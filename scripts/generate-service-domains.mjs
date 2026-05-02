#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const SERVICES_DIR = path.resolve('services');

const SERVICE_SPECS = [
  {
    name: 'risk-incident-service',
    entities: [
      { name: 'risk', table: 'dos.risks', columns: 'risk_id, tenant_id, title, description, category, likelihood, impact, risk_score, status, owner_id, mitigation_plan, residual_risk, review_date, created_at, updated_at', idCol: 'risk_id', requiredFields: ['title', 'category'], domain: 'risk' },
      { name: 'incident', table: 'dos.incidents', columns: 'incident_id, tenant_id, title, description, severity, status, reporter_id, assignee_id, category, impact_assessment, root_cause, resolution, detected_at, resolved_at, created_at, updated_at', idCol: 'incident_id', requiredFields: ['title', 'severity'], domain: 'incident' },
    ],
    events: { consumes: ['compliance.control.failed', 'asset.vulnerability.detected', 'vendor.risk.elevated'], produces: ['risk.created', 'risk.updated', 'risk.mitigated', 'incident.created', 'incident.resolved', 'incident.escalated'] },
  },
  {
    name: 'compliance-controls-service',
    entities: [
      { name: 'compliance', table: 'dos.compliance_requirements', columns: 'requirement_id, tenant_id, framework_id, framework_name, control_ref, title, description, status, evidence_status, owner_id, due_date, last_assessed_at, created_at, updated_at', idCol: 'requirement_id', requiredFields: ['framework_name', 'title'], domain: 'compliance' },
      { name: 'control', table: 'dos.controls', columns: 'control_id, tenant_id, control_ref, title, description, category, type, status, effectiveness, owner_id, implementation_status, test_frequency, last_tested_at, created_at, updated_at', idCol: 'control_id', requiredFields: ['control_ref', 'title'], domain: 'control' },
    ],
    events: { consumes: ['audit.finding.created', 'risk.created', 'evidence.submitted'], produces: ['compliance.assessed', 'compliance.gap.identified', 'control.tested', 'control.effectiveness.changed'] },
  },
  {
    name: 'evidence-audit-reporting-service',
    entities: [
      { name: 'evidence', table: 'dos.evidence', columns: 'evidence_id, tenant_id, title, description, type, status, control_id, requirement_id, collector_id, file_path, file_size, hash, validity_start, validity_end, created_at, updated_at', idCol: 'evidence_id', requiredFields: ['title', 'type'], domain: 'evidence' },
      { name: 'finding', table: 'dos.audit_findings', columns: 'finding_id, tenant_id, audit_id, title, description, severity, status, category, control_ref, recommendation, assignee_id, due_date, created_at, updated_at', idCol: 'finding_id', requiredFields: ['title', 'severity'], domain: 'finding' },
    ],
    events: { consumes: ['compliance.assessed', 'control.tested', 'risk.mitigated'], produces: ['evidence.submitted', 'evidence.approved', 'evidence.rejected', 'audit.finding.created', 'audit.finding.resolved'] },
  },
  {
    name: 'governance-policy-service',
    entities: [
      { name: 'policy', table: 'dos.policies', columns: 'policy_id, tenant_id, title, description, version, status, category, owner_id, approver_id, effective_date, review_date, content, created_at, updated_at', idCol: 'policy_id', requiredFields: ['title', 'category'], domain: 'policy' },
    ],
    events: { consumes: ['compliance.gap.identified', 'audit.finding.created'], produces: ['policy.created', 'policy.published', 'policy.reviewed', 'policy.retired'] },
  },
  {
    name: 'asset-service',
    entities: [
      { name: 'asset', table: 'dos.assets', columns: 'asset_id, tenant_id, name, description, type, category, status, criticality, owner_id, department_id, location, ip_address, os_type, vendor, classification, created_at, updated_at', idCol: 'asset_id', requiredFields: ['name', 'type'], domain: 'asset' },
    ],
    events: { consumes: ['risk.created', 'incident.created', 'vendor.assessment.completed'], produces: ['asset.created', 'asset.updated', 'asset.decommissioned', 'asset.vulnerability.detected'] },
  },
  {
    name: 'bcp-service',
    entities: [
      { name: 'bcp-plan', table: 'dos.bcp_plans', columns: 'plan_id, tenant_id, title, description, type, status, owner_id, priority, rto_hours, rpo_hours, last_tested_at, next_review_date, created_at, updated_at', idCol: 'plan_id', requiredFields: ['title', 'type'], domain: 'bcp', varName: 'bcpPlan' },
    ],
    events: { consumes: ['incident.created', 'incident.escalated', 'risk.mitigated'], produces: ['bcp.plan.created', 'bcp.plan.activated', 'bcp.exercise.completed', 'bcp.plan.reviewed'] },
  },
  {
    name: 'dora-service',
    entities: [
      { name: 'dora-assessment', table: 'dos.dora_assessments', columns: 'assessment_id, tenant_id, title, description, pillar, status, score, assessor_id, ict_provider_id, assessment_date, next_review_date, created_at, updated_at', idCol: 'assessment_id', requiredFields: ['title', 'pillar'], domain: 'dora', varName: 'doraAssessment' },
    ],
    events: { consumes: ['incident.created', 'vendor.risk.elevated', 'compliance.assessed'], produces: ['dora.assessment.created', 'dora.assessment.completed', 'dora.ict.risk.identified'] },
  },
  {
    name: 'vendor-service',
    entities: [
      { name: 'vendor', table: 'dos.vendors', columns: 'vendor_id, tenant_id, name, description, category, status, risk_tier, contact_name, contact_email, contract_start, contract_end, sla_score, last_assessment_date, created_at, updated_at', idCol: 'vendor_id', requiredFields: ['name', 'category'], domain: 'vendor' },
    ],
    events: { consumes: ['compliance.assessed', 'incident.created', 'asset.vulnerability.detected'], produces: ['vendor.created', 'vendor.assessment.completed', 'vendor.risk.elevated', 'vendor.contract.expiring'] },
  },
  {
    name: 'privacy-service',
    entities: [
      { name: 'privacy-assessment', table: 'dos.privacy_assessments', columns: 'assessment_id, tenant_id, title, description, type, status, data_category, processing_purpose, legal_basis, risk_level, dpo_review, assessor_id, created_at, updated_at', idCol: 'assessment_id', requiredFields: ['title', 'type'], domain: 'privacy', varName: 'privacyAssessment' },
    ],
    events: { consumes: ['compliance.assessed', 'incident.created', 'asset.created'], produces: ['privacy.assessment.created', 'privacy.dpia.completed', 'privacy.breach.detected', 'privacy.consent.updated'] },
  },
  {
    name: 'training-service',
    entities: [
      { name: 'training-program', table: 'dos.training_programs', columns: 'program_id, tenant_id, title, description, category, type, status, duration_minutes, passing_score, max_attempts, mandatory, target_audience, owner_id, created_at, updated_at', idCol: 'program_id', requiredFields: ['title', 'category'], domain: 'training', varName: 'trainingProgram' },
    ],
    events: { consumes: ['user.created', 'compliance.gap.identified', 'policy.published'], produces: ['training.assigned', 'training.completed', 'training.overdue', 'training.certificate.issued'] },
  },
  {
    name: 'qiyas-journey-service',
    entities: [
      { name: 'maturity-assessment', table: 'dos.maturity_assessments', columns: 'assessment_id, tenant_id, title, description, framework, domain_area, status, current_level, target_level, assessor_id, assessment_date, next_review_date, created_at, updated_at', idCol: 'assessment_id', requiredFields: ['title', 'framework'], domain: 'qiyas', varName: 'maturityAssessment' },
    ],
    events: { consumes: ['compliance.assessed', 'control.tested', 'risk.mitigated'], produces: ['qiyas.assessment.created', 'qiyas.level.changed', 'qiyas.roadmap.updated'] },
  },
  {
    name: 'records-service',
    entities: [
      { name: 'record', table: 'dos.records', columns: 'record_id, tenant_id, title, description, type, category, status, classification, retention_period_days, owner_id, file_path, file_size, version, created_at, updated_at', idCol: 'record_id', requiredFields: ['title', 'type'], domain: 'record' },
    ],
    events: { consumes: ['evidence.submitted', 'policy.published', 'audit.finding.created'], produces: ['record.created', 'record.archived', 'record.retention.expiring'] },
  },
  {
    name: 'remediation-action-service',
    entities: [
      { name: 'remediation', table: 'dos.remediations', columns: 'remediation_id, tenant_id, title, description, type, status, priority, source_type, source_id, assignee_id, due_date, completed_at, verification_status, created_at, updated_at', idCol: 'remediation_id', requiredFields: ['title', 'priority'], domain: 'remediation' },
      { name: 'action-item', table: 'dos.action_items', columns: 'action_id, tenant_id, title, description, status, priority, assignee_id, source_type, source_id, due_date, completed_at, created_at, updated_at', idCol: 'action_id', requiredFields: ['title', 'priority'], domain: 'action', varName: 'actionItem' },
    ],
    events: { consumes: ['audit.finding.created', 'risk.created', 'compliance.gap.identified', 'incident.created'], produces: ['remediation.created', 'remediation.completed', 'action.created', 'action.completed', 'action.overdue'] },
  },
  {
    name: 'analytics-service',
    entities: [
      { name: 'dashboard', table: 'dos.dashboards', columns: 'dashboard_id, tenant_id, title, description, type, layout, owner_id, is_default, shared, widgets, created_at, updated_at', idCol: 'dashboard_id', requiredFields: ['title', 'type'], domain: 'analytics' },
    ],
    events: { consumes: ['risk.updated', 'compliance.assessed', 'incident.created'], produces: ['analytics.dashboard.created', 'analytics.kpi.threshold.breached'] },
  },
  {
    name: 'analytics-reporting-service',
    entities: [
      { name: 'report-schedule', table: 'dos.report_schedules', columns: 'schedule_id, tenant_id, report_type, title, description, frequency, recipients, filters, format, status, last_run_at, next_run_at, owner_id, created_at, updated_at', idCol: 'schedule_id', requiredFields: ['report_type', 'title', 'frequency'], domain: 'reporting', varName: 'reportSchedule' },
    ],
    events: { consumes: ['compliance.assessed', 'risk.updated', 'audit.finding.created', 'incident.resolved'], produces: ['reporting.report.generated', 'reporting.report.distributed', 'reporting.schedule.triggered'] },
  },
  {
    name: 'dashboard-widgets-service',
    entities: [
      { name: 'widget', table: 'dos.widgets', columns: 'widget_id, tenant_id, title, type, category, data_source, query_config, display_config, refresh_interval_sec, owner_id, shared, created_at, updated_at', idCol: 'widget_id', requiredFields: ['title', 'type', 'data_source'], domain: 'widget' },
    ],
    events: { consumes: ['analytics.dashboard.created', 'risk.updated', 'compliance.assessed'], produces: ['widget.created', 'widget.updated', 'widget.data.refreshed'] },
  },
  {
    name: 'executive-intelligence-service',
    entities: [
      { name: 'briefing', table: 'dos.executive_briefings', columns: 'briefing_id, tenant_id, title, summary, type, status, period_start, period_end, risk_posture, compliance_score, key_metrics, recommendations, author_id, created_at, updated_at', idCol: 'briefing_id', requiredFields: ['title', 'type'], domain: 'executive' },
    ],
    events: { consumes: ['risk.updated', 'compliance.assessed', 'incident.created', 'analytics.kpi.threshold.breached'], produces: ['executive.briefing.created', 'executive.briefing.distributed', 'executive.alert.triggered'] },
  },
  {
    name: 'integrations-service',
    entities: [
      { name: 'integration', table: 'dos.integrations', columns: 'integration_id, tenant_id, name, description, type, provider, status, config, credentials_ref, sync_frequency, last_sync_at, error_count, owner_id, created_at, updated_at', idCol: 'integration_id', requiredFields: ['name', 'type', 'provider'], domain: 'integration' },
    ],
    events: { consumes: ['tenant.created', 'asset.created', 'vendor.created'], produces: ['integration.connected', 'integration.sync.completed', 'integration.sync.failed', 'integration.disconnected'] },
  },
  {
    name: 'notification-inbox-service',
    entities: [
      { name: 'inbox-item', table: 'dos.notification_inbox', columns: 'item_id, tenant_id, user_id, title, body, type, category, priority, status, source_module, entity_type, entity_id, action_url, read_at, dismissed_at, created_at', idCol: 'item_id', requiredFields: ['title', 'type', 'user_id'], domain: 'inbox', varName: 'inboxItem' },
    ],
    events: { consumes: ['notification.sent', 'workflow.task.assigned', 'incident.created', 'action.overdue'], produces: ['inbox.item.read', 'inbox.item.dismissed', 'inbox.item.actioned'] },
  },
  {
    name: 'portals-service',
    entities: [
      { name: 'portal', table: 'dos.portals', columns: 'portal_id, tenant_id, name, description, type, status, config, theme, access_policy, allowed_domains, owner_id, created_at, updated_at', idCol: 'portal_id', requiredFields: ['name', 'type'], domain: 'portal' },
    ],
    events: { consumes: ['vendor.created', 'vendor.assessment.completed', 'compliance.assessed'], produces: ['portal.created', 'portal.access.granted', 'portal.submission.received'] },
  },
  {
    name: 'onboarding-service',
    entities: [
      { name: 'onboarding-journey', table: 'dos.onboarding_journeys', columns: 'journey_id, tenant_id, user_id, type, status, current_step, total_steps, completed_steps, config, started_at, completed_at, created_at, updated_at', idCol: 'journey_id', requiredFields: ['type', 'user_id'], domain: 'onboarding', varName: 'onboardingJourney' },
    ],
    events: { consumes: ['tenant.created', 'user.created', 'training.completed'], produces: ['onboarding.started', 'onboarding.step.completed', 'onboarding.completed'] },
  },
  {
    name: 'platform-product-service',
    entities: [
      { name: 'product-license', table: 'dos.product_licenses', columns: 'license_id, tenant_id, product_code, plan, status, seat_count, features, valid_from, valid_until, created_at, updated_at', idCol: 'license_id', requiredFields: ['product_code', 'plan'], domain: 'product', varName: 'productLicense' },
    ],
    events: { consumes: ['tenant.created', 'tenant.updated'], produces: ['product.license.activated', 'product.license.upgraded', 'product.license.expiring'] },
  },
  {
    name: 'agrc-os-service',
    entities: [
      { name: 'agrc-task', table: 'dos.agrc_tasks', columns: 'task_id, tenant_id, title, description, type, status, priority, module, agent_id, assignee_id, input_data, output_data, started_at, completed_at, created_at, updated_at', idCol: 'task_id', requiredFields: ['title', 'type'], domain: 'agrc', varName: 'agrcTask' },
    ],
    events: { consumes: ['workflow.task.assigned', 'incident.created', 'compliance.gap.identified'], produces: ['agrc.task.created', 'agrc.task.completed', 'agrc.agent.invoked'] },
  },
  {
    name: 'platform-core-service',
    entities: [
      { name: 'mobile-session', table: 'dos.mobile_sessions', columns: 'session_id, tenant_id, user_id, device_type, device_id, push_token, app_version, os_version, status, last_active_at, created_at, updated_at', idCol: 'session_id', requiredFields: ['user_id', 'device_type'], domain: 'mobile', varName: 'mobileSession' },
    ],
    events: { consumes: ['user.created', 'notification.sent', 'tenant.settings.changed'], produces: ['mobile.session.started', 'mobile.session.ended', 'mobile.push.registered'] },
  },
  {
    name: 'product-shell',
    skip: true,
  },
];

function toVarName(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function toPascalCase(s) {
  return s.split('-').map(p => p[0].toUpperCase() + p.slice(1)).join('');
}

function generateAuthAdapter() {
  return `import type { Request, Response, NextFunction } from 'express';
import { ServiceClient } from '@dos/service-client';

const authClient = new ServiceClient({
  baseUrl: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:4001',
  timeout: 5000,
  retries: 1,
});

export interface AuthUser {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  roles: string[];
  isSuperAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenantId?: string;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' });
    return;
  }

  try {
    const response = await authClient.get<AuthUser>('/api/auth/userinfo', {
      authorization: \`Bearer \${token}\`,
    });
    if (!response.ok || !response.data) {
      res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
      return;
    }
    req.user = response.data;
    req.tenantId = response.data.tenantId || req.headers['x-tenant-id'] as string;
    next();
  } catch {
    res.status(401).json({ error: 'Authentication failed', code: 'AUTH_FAILED' });
  }
}

export function requireTenantId(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.tenantId || req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context required', code: 'MISSING_TENANT' });
    return;
  }
  req.tenantId = tenantId;
  next();
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
      return;
    }
    if (user.isSuperAdmin) { next(); return; }
    const userPerms = new Set<string>([...(user.roles || []), user.role].filter(Boolean));
    const hasPermission = permissions.some(p => userPerms.has(p));
    if (!hasPermission) {
      res.status(403).json({ error: \`Insufficient permissions. Required: \${permissions.join(' | ')}\`, code: 'FORBIDDEN' });
      return;
    }
    next();
  };
}
`;
}

function generateAuditAdapter(serviceCode) {
  return `import { ServiceClient } from '@dos/service-client';

const auditClient = new ServiceClient({
  baseUrl: process.env.AUDIT_SERVICE_URL || 'http://127.0.0.1:4006',
  timeout: 5000,
  retries: 1,
});

export async function recordAudit(
  tenantId: string,
  action: string,
  entityType: string,
  entityId: string,
  actorId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await auditClient.post('/api/audit/entries', {
      tenantId,
      actorId,
      action,
      module: '${serviceCode}',
      entityType,
      entityId,
      source: '${serviceCode}',
      details: details || {},
    }, { 'x-tenant-id': tenantId });
  } catch {}
}
`;
}

function generateNotificationAdapter(serviceCode) {
  return `import { ServiceClient } from '@dos/service-client';

const notificationClient = new ServiceClient({
  baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:4005',
  timeout: 5000,
  retries: 1,
});

export async function sendNotification(
  tenantId: string,
  userId: string,
  title: string,
  body: string,
  type: string = 'info',
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await notificationClient.post('/api/notifications', {
      tenantId,
      userId,
      title,
      body,
      type,
      source: '${serviceCode}',
      metadata: metadata || {},
    }, { 'x-tenant-id': tenantId });
  } catch {}
}
`;
}

function generateDomainService(entity, serviceCode) {
  const pascal = toPascalCase(entity.name);
  const varName = entity.varName || toVarName(entity.name);
  const cols = entity.columns.split(',').map(c => c.trim());
  const idCol = entity.idCol;

  const insertCols = cols.filter(c => c !== idCol && c !== 'created_at' && c !== 'updated_at');
  const insertPlaceholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
  const insertValues = insertCols.map(c => {
    if (c === 'tenant_id') return 'tenantId';
    return `input.${toVarName(c)} ?? null`;
  });

  return `import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface ${pascal}Record {
${cols.map(c => `  ${c}: ${c.endsWith('_at') || c.endsWith('_date') ? 'string | null' : c.includes('count') || c.includes('score') || c.includes('hours') || c.includes('minutes') || c.includes('steps') || c.includes('level') || c.includes('size') || c.includes('interval') || c.includes('attempts') ? 'number' : c === 'mandatory' || c === 'shared' || c === 'is_default' || c === 'dpo_review' ? 'boolean' : c.includes('config') || c.includes('widgets') || c.includes('features') || c.includes('key_metrics') || c.includes('recommendations') || c.includes('filters') || c.includes('recipients') || c.includes('input_data') || c.includes('output_data') || c.includes('layout') || c.includes('display_config') || c.includes('query_config') || c.includes('access_policy') || c.includes('allowed_domains') || c.includes('completed_steps') ? 'unknown' : 'string'};`).join('\n')}
}

export interface Create${pascal}Input {
${insertCols.filter(c => c !== 'tenant_id').map(c => `  ${toVarName(c)}?: ${c.endsWith('_at') || c.endsWith('_date') ? 'string' : c.includes('count') || c.includes('score') || c.includes('hours') || c.includes('minutes') || c.includes('steps') || c.includes('level') || c.includes('size') || c.includes('interval') || c.includes('attempts') ? 'number' : c === 'mandatory' || c === 'shared' || c === 'is_default' || c === 'dpo_review' ? 'boolean' : c.includes('config') || c.includes('widgets') || c.includes('features') || c.includes('key_metrics') || c.includes('recommendations') || c.includes('filters') || c.includes('recipients') || c.includes('input_data') || c.includes('output_data') || c.includes('layout') || c.includes('display_config') || c.includes('query_config') || c.includes('access_policy') || c.includes('allowed_domains') || c.includes('completed_steps') ? 'unknown' : 'string'};`).join('\n')}
}

export interface List${pascal}Options {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = \`${entity.columns}\`;

export async function list(
  tenantId: string,
  options: List${pascal}Options = {},
): Promise<{ data: ${pascal}Record[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (options.status) {
    conditions.push(\`status = $\${idx}\`);
    params.push(options.status);
    idx++;
  }

  if (options.search) {
    conditions.push(\`(title ILIKE $\${idx} OR description ILIKE $\${idx})\`);
    params.push(\`%\${options.search}%\`);
    idx++;
  }

  const where = \`WHERE \${conditions.join(' AND ')}\`;
  const sortCol = options.sortBy && ['created_at', 'updated_at', 'title', 'status'].includes(options.sortBy) ? options.sortBy : 'created_at';
  const sortDir = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

  try {
    const countResult = await safeQuery(
      \`SELECT COUNT(*)::int AS total FROM ${entity.table} \${where}\`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      \`SELECT \${COLUMNS} FROM ${entity.table} \${where} ORDER BY \${sortCol} \${sortDir} LIMIT \${pageSize} OFFSET \${offset}\`,
      params,
    );

    return { data: dataResult.rows as ${pascal}Record[], total, page, pageSize };
  } catch (err) {
    logger.error('[${serviceCode}] Failed to list ${entity.name}s', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<${pascal}Record | null> {
  try {
    const result = await safeQuery(
      \`SELECT \${COLUMNS} FROM ${entity.table} WHERE tenant_id = $1 AND ${idCol} = $2\`,
      [tenantId, id],
    );
    return (result.rows[0] as ${pascal}Record) || null;
  } catch (err) {
    logger.error('[${serviceCode}] Failed to get ${entity.name}', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: Create${pascal}Input): Promise<${pascal}Record> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      \`INSERT INTO ${entity.table} (${idCol}, tenant_id, ${insertCols.filter(c => c !== 'tenant_id').join(', ')}, created_at, updated_at)
       VALUES ($1, $2, ${insertCols.filter(c => c !== 'tenant_id').map((_, i) => `$${i + 3}`).join(', ')}, NOW(), NOW())
       RETURNING \${COLUMNS}\`,
      [id, tenantId, ${insertCols.filter(c => c !== 'tenant_id').map(c => {
        const vn = toVarName(c);
        return `input.${vn} ?? null`;
      }).join(', ')}],
    );
    logger.info('[${serviceCode}] ${pascal} created', { id, tenantId });
    return result.rows[0] as ${pascal}Record;
  } catch (err) {
    logger.error('[${serviceCode}] Failed to create ${entity.name}', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<Create${pascal}Input>): Promise<${pascal}Record | null> {
  const existing = await getById(tenantId, id);
  if (!existing) return null;

  const setClauses: string[] = [];
  const params: unknown[] = [tenantId, id];
  let idx = 3;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClauses.push(\`\${col} = $\${idx}\`);
      params.push(value);
      idx++;
    }
  }

  if (setClauses.length === 0) return existing;

  setClauses.push('updated_at = NOW()');

  try {
    const result = await safeQuery(
      \`UPDATE ${entity.table} SET \${setClauses.join(', ')} WHERE tenant_id = $1 AND ${idCol} = $2 RETURNING \${COLUMNS}\`,
      params,
    );
    logger.info('[${serviceCode}] ${pascal} updated', { id, tenantId });
    return (result.rows[0] as ${pascal}Record) || null;
  } catch (err) {
    logger.error('[${serviceCode}] Failed to update ${entity.name}', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      \`DELETE FROM ${entity.table} WHERE tenant_id = $1 AND ${idCol} = $2\`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[${serviceCode}] ${pascal} deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[${serviceCode}] Failed to delete ${entity.name}', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      \`SELECT COUNT(*)::int AS total FROM ${entity.table} WHERE tenant_id = $1\`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      \`SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM ${entity.table} WHERE tenant_id = $1 GROUP BY status\`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[${serviceCode}] Failed to get ${entity.name} stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

export const ${pascal}Service = { list, getById, create, update, remove, getStats };
`;
}

function generateEntityRoutes(entity, serviceCode) {
  const pascal = toPascalCase(entity.name);
  const varName = entity.varName || toVarName(entity.name);
  const domain = entity.domain;
  const idCol = entity.idCol;

  return `import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as ${varName}Service from '../domain/${entity.name}.service';
import { recordAudit } from '../adapters/audit.adapter';

const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = parseInt(req.query.pageSize as string || '25', 10);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

    const result = await ${varName}Service.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list ${entity.name}s', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await ${varName}Service.getStats(tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get ${entity.name} stats', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await ${varName}Service.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: '${pascal} not found', code: '${entity.name.toUpperCase().replace(/-/g, '_')}_NOT_FOUND' });
      return;
    }
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get ${entity.name}', details: (err as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
${entity.requiredFields.map(f => `    if (!req.body.${toVarName(f)}) {
      res.status(400).json({ error: '${f} is required', code: 'VALIDATION_ERROR' });
      return;
    }`).join('\n')}

    const item = await ${varName}Service.create(tenantId, req.body);
    recordAudit(tenantId, '${domain}.created', '${entity.name}', item.${idCol}, actorId, { title: req.body.title });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create ${entity.name}', details: (err as Error).message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await ${varName}Service.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: '${pascal} not found', code: '${entity.name.toUpperCase().replace(/-/g, '_')}_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, '${domain}.updated', '${entity.name}', req.params.id, actorId, { changes: Object.keys(req.body) });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ${entity.name}', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await ${varName}Service.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: '${pascal} not found', code: '${entity.name.toUpperCase().replace(/-/g, '_')}_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, '${domain}.deleted', '${entity.name}', req.params.id, actorId);
    res.json({ success: true, message: '${pascal} deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete ${entity.name}', details: (err as Error).message });
  }
});

export default router;
`;
}

function generatePublisher(serviceCode, events) {
  const produceFns = events.produces.map(e => {
    const fnName = 'publish' + e.split('.').map(p => p[0].toUpperCase() + p.slice(1)).join('');
    return `
export async function ${fnName}(
  tenantId: string,
  entityId: string,
  data?: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  await getBus().publish('${e}', { entityId, ...data }, { tenantId, userId });
}`;
  }).join('\n');

  return `import { RedisStreamEventBus } from '@dos/event-backbone';

let _bus: RedisStreamEventBus | null = null;

export function setServiceBus(bus: RedisStreamEventBus): void {
  _bus = bus;
}

function getBus(): RedisStreamEventBus {
  if (!_bus) throw new Error('[${serviceCode}] Event bus not initialized');
  return _bus;
}

export async function publishDomainEvent(
  eventType: string,
  payload: Record<string, unknown>,
  tenantId: string,
  userId?: string,
): Promise<void> {
  await getBus().publish(eventType, payload, { tenantId, userId });
}
${produceFns}
`;
}

function generateConsumer(serviceCode, events) {
  const handlers = events.consumes.map(e => {
    const handlerName = 'handle' + e.split('.').map(p => p[0].toUpperCase() + p.slice(1)).join('');
    return `
  eventBus.subscribe('${e}', async (envelope) => {
    try {
      logger.info(\`[${serviceCode}] Processing ${e}\`, {
        eventId: envelope.eventId,
        tenantId: envelope.tenantId,
      });
      await recordAudit(
        envelope.tenantId,
        'event.received',
        '${e}',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, payload: envelope.payload },
      );
    } catch (err) {
      logger.error(\`[${serviceCode}] Failed to process ${e}\`, { eventId: envelope.eventId, error: err });
    }
  });`;
  }).join('\n');

  return `import { RedisStreamEventBus } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { recordAudit } from '../adapters/audit.adapter';

export function registerConsumers(eventBus: RedisStreamEventBus): void {${handlers}
}
`;
}

function generateUpdatedRoutesIndex(serviceCode, entities, existingRoutesContent) {
  const entityImports = entities.map(e => {
    const varName = e.varName || toVarName(e.name);
    return `import ${varName}Router from './${e.name}.routes';`;
  }).join('\n');

  const entityMounts = entities.map(e => {
    const varName = e.varName || toVarName(e.name);
    return `routes.use('/${e.domain}', ${varName}Router);`;
  }).join('\n');

  const existingBody = existingRoutesContent || '';
  const requireLines = [];
  const mountLines = [];

  const requireRegex = /^let\s+(\w+):\s*any;[\s\S]*?catch\s*\{[^}]*\}/gm;
  const mountRegex = /^routes\.use\([^)]+\);$/gm;

  for (const m of existingBody.matchAll(requireRegex)) {
    requireLines.push(m[0]);
  }
  for (const m of existingBody.matchAll(mountRegex)) {
    if (!m[0].includes('/info')) {
      mountLines.push(m[0]);
    }
  }

  const moduleCount = entities.length;
  const infoLine = existingBody.match(/modules:\s*\d+/) ? existingBody.match(/modules:\s*(\d+)/)[0] : `modules: ${moduleCount}`;

  return `import { Router } from 'express';
${entityImports}

${requireLines.join('\n')}

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: '${serviceCode}', version: '0.1.0', ${infoLine} });
});

${entityMounts}

${mountLines.join('\n')}
`;
}

function generateServer(serviceCode, entities) {
  const apiPaths = entities.map(e => {
    return `      { path: '/api/${e.domain}', router: routes },`;
  }).join('\n');

  return `import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { setEventBus } from '@dos/module-sdk';
import { routes } from './routes/index';
import { setServiceBus } from './events/publisher';
import { registerConsumers } from './events/consumer';

const SERVICE_CODE = '${serviceCode}';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);

  const eventBus = createEventBackbone({
    redisUrl: config.redis.url,
    serviceCode: SERVICE_CODE,
  });
  setEventBus(eventBus as any);
  setServiceBus(eventBus);

  registerConsumers(eventBus);
  eventBus.startConsuming().catch((err: Error) => {
    console.error(\`[\${SERVICE_CODE}] Consumer error:\`, err);
  });

  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
${apiPaths}
    ],
    healthChecks: {
      database: async () => {
        try {
          const { query } = await import('@dos/db');
          const result = await query('SELECT 1');
          return !!result;
        } catch { return false; }
      },
    },
  });

  await start();
}

main().catch(err => {
  console.error(\`Failed to start \${SERVICE_CODE}:\`, err);
  process.exit(1);
});
`;
}

let filesCreated = 0;
let servicesProcessed = 0;

for (const spec of SERVICE_SPECS) {
  if (spec.skip) continue;

  const svcDir = path.join(SERVICES_DIR, spec.name);
  if (!fs.existsSync(svcDir)) {
    console.log(`SKIP ${spec.name}: directory does not exist`);
    continue;
  }

  const srcDir = path.join(svcDir, 'src');
  const adaptersDir = path.join(srcDir, 'adapters');
  const domainDir = path.join(srcDir, 'domain');
  const routesDir = path.join(srcDir, 'routes');
  const eventsDir = path.join(srcDir, 'events');

  fs.mkdirSync(adaptersDir, { recursive: true });
  fs.mkdirSync(domainDir, { recursive: true });
  fs.mkdirSync(routesDir, { recursive: true });
  fs.mkdirSync(eventsDir, { recursive: true });

  // Auth adapter
  fs.writeFileSync(path.join(adaptersDir, 'auth.adapter.ts'), generateAuthAdapter());
  filesCreated++;

  // Audit adapter
  fs.writeFileSync(path.join(adaptersDir, 'audit.adapter.ts'), generateAuditAdapter(spec.name));
  filesCreated++;

  // Notification adapter
  fs.writeFileSync(path.join(adaptersDir, 'notification.adapter.ts'), generateNotificationAdapter(spec.name));
  filesCreated++;

  // Domain services
  for (const entity of spec.entities) {
    fs.writeFileSync(path.join(domainDir, `${entity.name}.service.ts`), generateDomainService(entity, spec.name));
    filesCreated++;
  }

  // Entity routes
  for (const entity of spec.entities) {
    fs.writeFileSync(path.join(routesDir, `${entity.name}.routes.ts`), generateEntityRoutes(entity, spec.name));
    filesCreated++;
  }

  // Update routes/index.ts
  const existingRoutesPath = path.join(routesDir, 'index.ts');
  const existingRoutes = fs.existsSync(existingRoutesPath) ? fs.readFileSync(existingRoutesPath, 'utf-8') : '';
  fs.writeFileSync(existingRoutesPath, generateUpdatedRoutesIndex(spec.name, spec.entities, existingRoutes));
  filesCreated++;

  // Publisher
  fs.writeFileSync(path.join(eventsDir, 'publisher.ts'), generatePublisher(spec.name, spec.events));
  filesCreated++;

  // Consumer
  fs.writeFileSync(path.join(eventsDir, 'consumer.ts'), generateConsumer(spec.name, spec.events));
  filesCreated++;

  // Server
  fs.writeFileSync(path.join(srcDir, 'server.ts'), generateServer(spec.name, spec.entities));
  filesCreated++;

  servicesProcessed++;
  console.log(`DONE ${spec.name} — ${spec.entities.length} entity/entities`);
}

console.log(`\nGenerated ${filesCreated} files across ${servicesProcessed} services.`);

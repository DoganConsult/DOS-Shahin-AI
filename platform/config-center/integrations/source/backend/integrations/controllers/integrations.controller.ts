// ============================================
// Integrations Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

// --- Service imports ---
import {
  getConnectors, createConnector, getConnectorDetail,
  testConnection, getHealthDashboard, runConnector,
  getExecutions, transitionConnectorStatus, getStatusHistory,
  updateConnectorOwnership,
} from '../services/connector.service';
import {
  listConnections, getConnection, createConnection,
  updateConnection, deleteConnection, validateConnection as validateSyncConnection,
  syncConnection, getSyncHistory, syncAllConnections,
  type ConnectorType,
} from '../services/connector-sync.service';
import {
  getFullRegistry, getConnectorEntry, getConnectorsByCategory,
  registerConnectorType, deactivateConnectorType, getDependencyGraph,
  getConnectorDependencies, addDependency, getAutomationRules,
  upsertAutomationRule, toggleAutomationRule,
} from '../services/connector-registry.service';
import {
  createWebhook, getWebhooks, updateWebhook, deleteWebhook,
  testWebhook, getConnectorHealth, getConnectorErrors,
  retryConnectorSync, createDataMapping, getDataMappings,
  createEmailTemplate, getEmailTemplates, previewEmailTemplate,
} from '../services/integration-advanced.service';
import {
  getConnectorEvidenceMappings, createConnectorEvidenceMapping,
} from '../services/connector-evidence-mapper.service';
import {
  createSSOProvider, updateSSOProvider, getSSOProvider,
  listSSOProviders, deleteSSOProvider, testSSOConnection,
} from '../services/sso-integration.service';
import {
  saveConnection as saveERPConnection, validateConnection as validateERPConnection,
  saveFieldMapping, executeSyncJob, getSyncHistory as getERPSyncHistory,
  getConnections as getERPConnections, getFieldMappings,
} from '../services/erp-connector.service';
import { getSlackConfig, postMessage as postSlackMessage } from '../services/slack-connector.service';
import { getJiraConfig, createIssue as createJiraIssue, syncStatus as syncJiraStatus } from '../services/jira-connector.service';

// ── CONNECTORS ────────────────────────────────────────

export async function listConnectors(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getConnectors(req.tenantId!);
  res.json(ok(result, req));
}

export async function getConnectorById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getConnectorDetail(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('connector', req.params.id);
  res.json(ok(result, req));
}

export async function createConnectorHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createConnector(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'connector', entityId: result?.connector_id, afterState: result });
  res.status(201).json(ok(result, req));
}

export async function testConnectionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await testConnection(req.body);
  res.json(ok(result, req));
}

export async function runConnectorHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await runConnector(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'execute', entityType: 'connector', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function connectorExecutions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const result = await getExecutions(req.tenantId!, req.params.id, limit);
  res.json(ok(result, req));
}

export async function transitionStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await transitionConnectorStatus(req.tenantId!, req.params.id, req.body.status, userId);
  setAuditData(res as any, { action: 'update', entityType: 'connector', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function connectorStatusHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getStatusHistory(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function updateOwnership(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await updateConnectorOwnership(req.tenantId!, req.params.id, req.body, userId);
  setAuditData(res as any, { action: 'update', entityType: 'connector_ownership', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function healthDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getHealthDashboard(req.tenantId!);
  res.json(ok(result, req));
}

// ── CONNECTOR SYNC ────────────────────────────────────

export async function listSyncConnections(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listConnections(req.tenantId!, req.params.type as ConnectorType);
  res.json(ok(result, req));
}

export async function getSyncConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getConnection(req.tenantId!, req.params.type as ConnectorType, req.params.id);
  if (!result) throw new NotFoundError('connection', req.params.id);
  res.json(ok(result, req));
}

export async function createSyncConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createConnection(req.tenantId!, req.params.type as ConnectorType, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'sync_connection', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateSyncConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateConnection(req.tenantId!, req.params.type as ConnectorType, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'sync_connection', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deleteSyncConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deleteConnection(req.tenantId!, req.params.type as ConnectorType, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'sync_connection', entityId: req.params.id });
  res.json(action('Connection deleted', req));
}

export async function validateSyncConnectionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await validateSyncConnection(req.tenantId!, req.params.type as ConnectorType, req.params.id);
  res.json(ok(result, req));
}

export async function syncConnectionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await syncConnection(req.tenantId!, req.params.type as ConnectorType, req.params.id);
  setAuditData(res as any, { action: 'execute', entityType: 'sync_connection', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function syncHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const result = await getSyncHistory(req.tenantId!, req.params.type as ConnectorType, req.params.id, limit);
  res.json(ok(result, req));
}

export async function syncAll(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await syncAllConnections(req.tenantId!, req.params.type as ConnectorType);
  res.json(ok(result, req));
}

// ── CONNECTOR REGISTRY ────────────────────────────────

export async function fullRegistry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFullRegistry(req.tenantId!);
  res.json(ok(result, req));
}

export async function registryEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getConnectorEntry(req.tenantId!, req.params.code);
  if (!result) throw new NotFoundError('connector_type', req.params.code);
  res.json(ok(result, req));
}

export async function registryByCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getConnectorsByCategory(req.tenantId!, req.params.category);
  res.json(ok(result, req));
}

export async function registerType(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await registerConnectorType(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'connector_type', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function deactivateType(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deactivateConnectorType(req.tenantId!, req.params.code);
  setAuditData(res as any, { action: 'deactivate', entityType: 'connector_type', entityId: req.params.code });
  res.json(action('Connector type deactivated', req));
}

export async function dependencyGraph(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDependencyGraph(req.tenantId!);
  res.json(ok(result, req));
}

export async function connectorDependencies(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getConnectorDependencies(req.tenantId!, req.params.code);
  res.json(ok(result, req));
}

export async function addDependencyHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await addDependency(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'connector_dependency' });
  res.status(201).json(ok(result, req));
}

export async function automationRules(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAutomationRules(req.tenantId!, req.query.connectorCode as string | undefined);
  res.json(ok(result, req));
}

export async function upsertRule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await upsertAutomationRule(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'upsert', entityType: 'automation_rule', afterState: result });
  res.json(ok(result, req));
}

export async function toggleRule(req: AuthenticatedRequest, res: Response): Promise<void> {
  await toggleAutomationRule(req.tenantId!, req.params.code, req.params.ruleCode, req.body.enabled);
  setAuditData(res as any, { action: 'update', entityType: 'automation_rule', entityId: req.params.ruleCode });
  res.json(action('Rule toggled', req));
}

// ── WEBHOOKS ──────────────────────────────────────────

export async function listWebhooks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getWebhooks(req.tenantId!);
  res.json(ok(result, req));
}

export async function createWebhookHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createWebhook(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'webhook', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateWebhookHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateWebhook(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'webhook', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deleteWebhookHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const deleted = await deleteWebhook(req.tenantId!, req.params.id);
  if (!deleted) throw new NotFoundError('webhook', req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'webhook', entityId: req.params.id });
  res.json(action('Webhook deleted', req));
}

export async function testWebhookHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await testWebhook(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

// ── CONNECTOR HEALTH & ERRORS ─────────────────────────

export async function connectorHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getConnectorHealth(req.tenantId!);
  res.json(ok(result, req));
}

export async function connectorErrors(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getConnectorErrors(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function retrySync(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await retryConnectorSync(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'retry', entityType: 'connector', entityId: req.params.id });
  res.json(ok(result, req));
}

// ── DATA MAPPINGS ─────────────────────────────────────

export async function listDataMappings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDataMappings(req.tenantId!, req.query.connectorId as string | undefined);
  res.json(ok(result, req));
}

export async function createDataMappingHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createDataMapping(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'data_mapping', afterState: result });
  res.status(201).json(ok(result, req));
}

// ── EMAIL TEMPLATES ───────────────────────────────────

export async function listEmailTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getEmailTemplates(req.tenantId!);
  res.json(ok(result, req));
}

export async function createEmailTemplateHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createEmailTemplate(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'email_template', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function previewTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await previewEmailTemplate(req.tenantId!, req.params.id, req.body);
  res.json(ok(result, req));
}

// ── EVIDENCE MAPPINGS ─────────────────────────────────

export async function listEvidenceMappings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getConnectorEvidenceMappings(req.tenantId!);
  res.json(ok(result, req));
}

export async function createEvidenceMapping(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createConnectorEvidenceMapping(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'evidence_mapping', afterState: result });
  res.status(201).json(ok(result, req));
}

// ── SSO ───────────────────────────────────────────────

export async function listSSO(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listSSOProviders(req.tenantId!);
  res.json(ok(result, req));
}

export async function getSSOById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getSSOProvider(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('sso_provider', req.params.id);
  res.json(ok(result, req));
}

export async function createSSO(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createSSOProvider(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'sso_provider', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function updateSSO(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateSSOProvider(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'sso_provider', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function deleteSSO(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deleteSSOProvider(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'sso_provider', entityId: req.params.id });
  res.json(action('SSO provider deleted', req));
}

export async function testSSO(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await testSSOConnection(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

// ── ERP CONNECTOR ─────────────────────────────────────

export async function listERPConnections(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getERPConnections(req.tenantId!);
  res.json(ok(result, req));
}

export async function saveERPConnectionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await saveERPConnection(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'erp_connection', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function validateERPConnectionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await validateERPConnection(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function erpFieldMappings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getFieldMappings(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function saveERPFieldMapping(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await saveFieldMapping(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'erp_field_mapping', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function erpSync(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await executeSyncJob(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'execute', entityType: 'erp_sync', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function erpSyncHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const result = await getERPSyncHistory(req.tenantId!, req.params.id, limit);
  res.json(ok(result, req));
}

// ── SLACK ─────────────────────────────────────────────

export async function slackConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getSlackConfig(req.tenantId!);
  res.json(ok(result, req));
}

export async function slackPost(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { channel, ...message } = req.body;
  const result = await postSlackMessage(req.tenantId!, channel, message);
  setAuditData(res as any, { action: 'send', entityType: 'slack_message' });
  res.json(ok(result, req));
}

// ── JIRA ──────────────────────────────────────────────

export async function jiraConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getJiraConfig(req.tenantId!);
  res.json(ok(result, req));
}

export async function jiraCreateIssue(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createJiraIssue(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'jira_issue', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function jiraSyncStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await syncJiraStatus(req.tenantId!, req.params.issueKey);
  res.json(ok(result, req));
}

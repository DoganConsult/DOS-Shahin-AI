// ============================================
// Shahin-Ai — Connector Registry Service
// Dynamic, DB-driven connector capability catalog.
// Follows the same pattern as module-workflow-registry
// and unified-squad-registry.
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { eventBus } from '../ports/events.port';
import { swallow, EC } from '@dos/platform-core/resilience';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ConnectorRegistryEntry {
  connectorCode: string;
  displayNameEn: string;
  displayNameAr: string | null;
  connectorCategory: string;
  direction: 'read' | 'write' | 'bidirectional';
  supportedObjects: string[];
  dataTable: string | null;
  producesGrcObjects: string[];
  defaultSchedule: string;
  defaultRefreshInterval: string;
  authMethods: string[];
  platforms: PlatformDef[];
  icon: string | null;
  iconColor: string | null;
  setupTime: string;
  tags: string[];
  documentationUrl: string | null;
  isActive: boolean;
  licensed: boolean;
  sortOrder: number;
}

export interface PlatformDef {
  value: string;
  label: string;
  authMethod: string;
  fields: Array<{
    key: string;
    label: string;
    required?: boolean;
    type?: string;
    placeholder?: string;
  }>;
}

export interface ConnectorDependency {
  sourceConnector: string;
  targetModule: string;
  dependencyType: 'feeds_into' | 'triggers' | 'validates' | 'requires' | 'enriches';
  viaEvent: string | null;
  viaProcessor: string | null;
  descriptionEn: string | null;
}

export interface ConnectorAutomationRule {
  ruleId: number;
  connectorCode: string;
  ruleCode: string;
  ruleNameEn: string;
  triggerEvent: string;
  actionType: string;
  conditions: Record<string, unknown>;
  actionConfig: Record<string, unknown>;
  enabled: boolean;
}

// ── Registry Queries ──────────────────────────────────────────────────────

export async function getFullRegistry(tenantId: string): Promise<ConnectorRegistryEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".connector_registry WHERE is_active = TRUE ORDER BY sort_order`,
  );
  return result.rows.map(mapRegistryRow);
}

export async function getConnectorEntry(tenantId: string, connectorCode: string): Promise<ConnectorRegistryEntry | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".connector_registry WHERE connector_code = $1`,
    [connectorCode],
  );
  return result.rows.length ? mapRegistryRow(result.rows[0]) : null;
}

export async function getConnectorsByCategory(tenantId: string, category: string): Promise<ConnectorRegistryEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".connector_registry
     WHERE connector_category = $1 AND is_active = TRUE ORDER BY sort_order`,
    [category],
  );
  return result.rows.map(mapRegistryRow);
}

// ── Register / Update ─────────────────────────────────────────────────────

export async function registerConnectorType(
  tenantId: string,
  entry: Omit<ConnectorRegistryEntry, 'isActive' | 'licensed' | 'sortOrder'> & {
    isActive?: boolean; licensed?: boolean; sortOrder?: number;
  },
): Promise<ConnectorRegistryEntry> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".connector_registry
       (connector_code, display_name_en, display_name_ar, connector_category, direction,
        supported_objects, data_table, produces_grc_objects, default_schedule, default_refresh_interval,
        auth_methods, platforms, icon, icon_color, setup_time, tags, documentation_url,
        is_active, licensed, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     ON CONFLICT (connector_code) DO UPDATE SET
       display_name_en = EXCLUDED.display_name_en,
       display_name_ar = EXCLUDED.display_name_ar,
       connector_category = EXCLUDED.connector_category,
       direction = EXCLUDED.direction,
       supported_objects = EXCLUDED.supported_objects,
       data_table = EXCLUDED.data_table,
       produces_grc_objects = EXCLUDED.produces_grc_objects,
       default_schedule = EXCLUDED.default_schedule,
       default_refresh_interval = EXCLUDED.default_refresh_interval,
       auth_methods = EXCLUDED.auth_methods,
       platforms = EXCLUDED.platforms,
       icon = EXCLUDED.icon,
       icon_color = EXCLUDED.icon_color,
       setup_time = EXCLUDED.setup_time,
       tags = EXCLUDED.tags,
       documentation_url = EXCLUDED.documentation_url,
       is_active = EXCLUDED.is_active,
       licensed = EXCLUDED.licensed,
       sort_order = EXCLUDED.sort_order,
       updated_at = NOW()
     RETURNING *`,
    [
      entry.connectorCode, entry.displayNameEn, entry.displayNameAr || null,
      entry.connectorCategory, entry.direction,
      entry.supportedObjects, entry.dataTable || null,
      entry.producesGrcObjects, entry.defaultSchedule, entry.defaultRefreshInterval,
      entry.authMethods, JSON.stringify(entry.platforms),
      entry.icon || null, entry.iconColor || null,
      entry.setupTime || '10 min', entry.tags,
      entry.documentationUrl || null,
      entry.isActive ?? true, entry.licensed ?? true, entry.sortOrder ?? 100,
    ],
  );

  const registered = mapRegistryRow(result.rows[0]);

  swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'connector.registry_updated',
      tenantId, sourceService: 'connector-registry',
      entityType: 'connector_registry', entityId: entry.connectorCode,
      severity: 'info',
      payload: { action: 'upsert', connectorCode: entry.connectorCode },
    } as any)), { tenantId, operation: 'eventBus:connector.registry_updated' });

  return registered;
}

export async function deactivateConnectorType(tenantId: string, connectorCode: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".connector_registry SET is_active = FALSE, updated_at = NOW()
     WHERE connector_code = $1`,
    [connectorCode],
  );
}

// ── Dependency Graph ──────────────────────────────────────────────────────

export async function getDependencyGraph(tenantId: string): Promise<ConnectorDependency[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".connector_dependency_graph WHERE is_active = TRUE
     ORDER BY source_connector, target_module`,
  );
  return result.rows.map(mapDependencyRow);
}

export async function getConnectorDependencies(tenantId: string, connectorCode: string): Promise<ConnectorDependency[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".connector_dependency_graph
     WHERE source_connector = $1 AND is_active = TRUE ORDER BY target_module`,
    [connectorCode],
  );
  return result.rows.map(mapDependencyRow);
}

export async function addDependency(tenantId: string, dep: Omit<ConnectorDependency, 'descriptionEn'> & {
  descriptionEn?: string;
}): Promise<ConnectorDependency> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".connector_dependency_graph
       (source_connector, target_module, dependency_type, via_event, via_processor, description_en)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [dep.sourceConnector, dep.targetModule, dep.dependencyType,
     dep.viaEvent || null, dep.viaProcessor || null, dep.descriptionEn || null],
  );
  return mapDependencyRow(result.rows[0]);
}

// ── Automation Rules ──────────────────────────────────────────────────────

export async function getAutomationRules(tenantId: string, connectorCode?: string): Promise<ConnectorAutomationRule[]> {
  const schema = tenantSchema(tenantId);
  const where = connectorCode ? 'WHERE connector_code = $1' : '';
  const params = connectorCode ? [connectorCode] : [];
  const result = await safeQuery(
    `SELECT * FROM "${schema}".connector_automation_rules ${where} ORDER BY connector_code, sort_order`,
    params,
  );
  return result.rows.map(mapRuleRow);
}

export async function upsertAutomationRule(tenantId: string, rule: Omit<ConnectorAutomationRule, 'ruleId'>): Promise<ConnectorAutomationRule> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".connector_automation_rules
       (connector_code, rule_code, rule_name_en, trigger_event, action_type, conditions, action_config, enabled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (connector_code, rule_code) DO UPDATE SET
       rule_name_en = EXCLUDED.rule_name_en,
       trigger_event = EXCLUDED.trigger_event,
       action_type = EXCLUDED.action_type,
       conditions = EXCLUDED.conditions,
       action_config = EXCLUDED.action_config,
       enabled = EXCLUDED.enabled
     RETURNING *`,
    [rule.connectorCode, rule.ruleCode, rule.ruleNameEn, rule.triggerEvent,
     rule.actionType, JSON.stringify(rule.conditions), JSON.stringify(rule.actionConfig), rule.enabled],
  );
  return mapRuleRow(result.rows[0]);
}

export async function toggleAutomationRule(tenantId: string, connectorCode: string, ruleCode: string, enabled: boolean): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".connector_automation_rules SET enabled = $1
     WHERE connector_code = $2 AND rule_code = $3`,
    [enabled, connectorCode, ruleCode],
  );
}

// ── Row Mappers ───────────────────────────────────────────────────────────

function mapRegistryRow( r: Record<string, unknown>): ConnectorRegistryEntry {
  return {

    connectorCode: r.connector_code,

    displayNameEn: r.display_name_en,

    displayNameAr: r.display_name_ar,

    connectorCategory: r.connector_category,

    direction: r.direction,

    supportedObjects: r.supported_objects || [],

    dataTable: r.data_table,

    producesGrcObjects: r.produces_grc_objects || [],

    defaultSchedule: r.default_schedule,

    defaultRefreshInterval: r.default_refresh_interval,

    authMethods: r.auth_methods || [],
    platforms: typeof r.platforms === 'string' ? JSON.parse(r.platforms) : (r.platforms || []),

    icon: r.icon,

    iconColor: r.icon_color,

    setupTime: r.setup_time || '10 min',

    tags: r.tags || [],

    documentationUrl: r.documentation_url,

    isActive: r.is_active,

    licensed: r.licensed,

    sortOrder: r.sort_order,
  };
}

function mapDependencyRow( r: Record<string, unknown>): ConnectorDependency {
  return {

    sourceConnector: r.source_connector,

    targetModule: r.target_module,

    dependencyType: r.dependency_type,

    viaEvent: r.via_event,

    viaProcessor: r.via_processor,

    descriptionEn: r.description_en,
  };
}

function mapRuleRow( r: Record<string, unknown>): ConnectorAutomationRule {
  return {

    ruleId: r.rule_id,

    connectorCode: r.connector_code,

    ruleCode: r.rule_code,

    ruleNameEn: r.rule_name_en,

    triggerEvent: r.trigger_event,

    actionType: r.action_type,

    conditions: r.conditions || {},

    actionConfig: r.action_config || {},

    enabled: r.enabled,
  };
}

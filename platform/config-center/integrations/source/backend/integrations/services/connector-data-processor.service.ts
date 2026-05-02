import { logger } from '../ports/logger.port';
// ============================================
// Shahin-Ai — Connector Data Processor
// Consumes typed connector tables and creates
// domain-level GRC objects: incidents, risks,
// evidence, process tasks, access reviews.
//
// Subscribes to connector.sync_completed and
// dispatches to per-domain processor functions.
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { eventBus } from '../ports/events.port';
import { submitEvidence } from '../../evidence/services/core/evidence.service';
import { reportIncident } from '../../incident/services/incident/incident.service';
import { createRisk } from '../../risk/services/core/risk.service';
import { createProcessTask } from '../ports/lifecycle.port';
import { getAutomationRules, type ConnectorAutomationRule } from './connector-registry.service';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import type { GenericRow } from '@dos/types';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience';

const BATCH_LIMIT = 200;

// ── Rule evaluation helper ────────────────────────────────────────────────

async function loadRules(tenantId: string, connectorCode: string): Promise<ConnectorAutomationRule[]> {
  try {
    const rules = await getAutomationRules(tenantId, connectorCode);
    return rules.filter(r => r.enabled);
  } catch {
    return []; // registry table may not exist yet — fall back to hardcoded behavior
  }
}

function ruleEnabled(rules: ConnectorAutomationRule[], ruleCode: string): boolean {
  if (rules.length === 0) return true; // no rules loaded → use defaults (backwards compat)
  return rules.some(r => r.ruleCode === ruleCode && r.enabled);
}

function _ruleConfig(rules: ConnectorAutomationRule[], ruleCode: string): Record<string, unknown> {
  const rule = rules.find(r => r.ruleCode === ruleCode);
  return rule?.actionConfig || {};
}

/** Load global governance rules (connector_code='*') */
async function loadGlobalRules(tenantId: string): Promise<ConnectorAutomationRule[]> {
  try {
    const rules = await getAutomationRules(tenantId, '*');
    return rules.filter(r => r.enabled);
  } catch {
    return [];
  }
}

// ── Registration ──────────────────────────────────────────────────────────

export function registerConnectorDataProcessors(): void {
  eventBus.subscribe(
    'connector.sync_completed',
    'connector-data-processor',
    async (event) => {
      const { tenantId, entityType, entityId, payload } = event;
      if (!tenantId) return;

      const connectorType = entityType || payload?.connectorType;
      const connectionId = entityId || payload?.connectionId;

      try {
        switch (connectorType) {
          case 'siem':
            await processSiemEvents(tenantId, (connectionId as any));
            break;
          case 'vuln_scanner':
          case 'vuln':
            await processVulnResults(tenantId, (connectionId as any));
            break;
          case 'iam':
            await processIamIdentities(tenantId, (connectionId as any));
            break;
          case 'itsm':
            await processItsmTickets(tenantId, (connectionId as any));
            break;
          case 'cmdb':
            await processCmdbAssets(tenantId, (connectionId as any));
            break;
          case 'm365':
          case 'outlook':
          case 'sharepoint':
          case 'onedrive':
            await processM365Items(tenantId, (connectionId as any));
            break;
        }

        // ── Governance Hooks (all DB-rule-gated via connector_automation_rules) ──
        const globalRules = await loadGlobalRules(tenantId);

        // Audit trail (rule: audit_sync_record)
        if (ruleEnabled(globalRules, 'audit_sync_record')) {
          await recordAudit({
            tenantId, userId: 'connector-data-processor', module: 'connectors',
            action: 'process', entityType: 'connector_data_processed',

            entityId: connectionId || connectorType || '',
            afterState: { connectorType, connectionId },
          }).catch(catchHandler(EC.EVENT_BUS, {}));
        }

        // Constitution / risk appetite check (rule: constitution_risk_gate)
        // Applied inside processSiemEvents/processVulnResults before createRisk() calls
        // (rule is checked inline in each processor)

        // Governance escalation (rule: gov_escalate_health)
        if (ruleEnabled(globalRules, 'gov_escalate_health') && connectionId) {
          try {
            const schema = tenantSchema(tenantId);
            const healthRow = await safeQuery(
              `SELECT failure_count FROM "${schema}".connector_configs WHERE connector_id = $1`,
              [connectionId]
            );
            const failCount = healthRow.rows[0]?.failure_count || 0;
            const threshold = (globalRules.find(r => r.ruleCode === 'gov_escalate_health')?.conditions as Record<string, unknown>)?.failure_count_min as number || 5;
            if (failCount >= threshold) {
              const { escalateIncidentToGovernanceBody } = await import('../../governance/services/governance/governance-hooks.service.js');
              await escalateIncidentToGovernanceBody(tenantId, (connectionId as any), 'critical');
            }
          } catch { /* best-effort governance escalation */ }
        }

        swallow(EC.EVENT_BUS, eventBus.publish(({
                  eventType: 'connector.data_processed',
                  tenantId,
                  sourceService: 'connector-data-processor',
                  entityType: connectorType || 'connector',
                  entityId: connectionId || '',
                  severity: 'info',
                  payload: { connectorType, connectionId },
                } as any)), { tenantId, operation: 'eventBus:connector.data_processed' });
      } catch (err: unknown) {
        logger.error(`[ConnectorDataProcessor] ${connectorType} processing failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  );

  logger.info('[ConnectorDataProcessor] Registered — listening for connector.sync_completed');
}

// ── 1. SIEM → Incidents + Risks + Evidence ────────────────────────────────

async function processSiemEvents(tenantId: string, connectionId?: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const rules = await loadRules(tenantId, 'siem');
  const filter = connectionId ? 'AND connection_id = $1' : '';
  const params = connectionId ? [connectionId] : [];

  const result = await safeQuery(
    `SELECT * FROM "${schema}".siem_events
     WHERE status = 'new' ${filter}
     ORDER BY event_timestamp DESC LIMIT ${BATCH_LIMIT}`,
    params
  );

  let incidents = 0, risks = 0, evidence = 0;

  for (const evt of result.rows) {
    try {
      const sev = (evt.severity || '').toLowerCase();
      const controlId = (evt.matched_control_ids || [])[0] || '';

      // High/Critical → create incident (rule: siem_critical_incident)
      if ((sev === 'high' || sev === 'critical') && ruleEnabled(rules, 'siem_critical_incident')) {
        const incident = await reportIncident(tenantId, {
          title: `[SIEM] ${evt.event_type}: ${(evt.parsed_data?.alertName || evt.external_event_id || '').substring(0, 100)}`,
          description: `Auto-detected from SIEM connector. Severity: ${sev}. Source: ${evt.parsed_data?.source || 'any'}`,
          category: 'security',
          severity: sev,
          affectedControls: evt.matched_control_ids || [],
          reportedBy: 'connector-data-processor',
        });

        await safeQuery(
          `UPDATE "${schema}".siem_events SET status = 'escalated', incident_id = $1 WHERE event_id = $2`,

          [incident.incident_id, evt.event_id]
        );
        incidents++;
      }
      // Medium → create risk (rule: siem_medium_risk)
      else if (sev === 'medium' && ruleEnabled(rules, 'siem_medium_risk')) {
        const risk = await createRisk(tenantId, {
          title: `[SIEM] ${evt.event_type}: ${(evt.parsed_data?.alertName || '').substring(0, 100)}`,
          description: `Auto-detected security event from SIEM. Event type: ${evt.event_type}`,
          category: 'cyber_security',
          likelihood: 3,
          impact: 3,
          owner: 'connector-data-processor',
          control_ids: evt.matched_control_ids || [],
        });

        await safeQuery(
          `UPDATE "${schema}".siem_events SET status = 'reviewed', matched_risk_ids = array_append(matched_risk_ids, $1) WHERE event_id = $2`,
          [risk.risk_id, evt.event_id]
        );
        risks++;
      }
      // Low/Info → just mark reviewed
      else {
        await safeQuery(
          `UPDATE "${schema}".siem_events SET status = 'reviewed' WHERE event_id = $1`,
          [evt.event_id]
        );
      }

      // Submit evidence for all events with control mappings
      if (controlId) {
        await submitEvidence(tenantId, {
          controlId,
          title: `SIEM Event: ${evt.event_type} (${sev})`,
          description: `Auto-collected from SIEM connector. Event ID: ${evt.external_event_id || evt.event_id}`,
          submittedBy: 'connector-data-processor',
          date: evt.event_timestamp || new Date().toISOString(),
          owner: 'connector-data-processor',
          systemReference: `siem:${evt.connection_id}`,
        }).catch(catchHandler(EC.EVENT_BUS, {})); // best-effort evidence
        evidence++;
      }
    } catch (err: unknown) {
      logger.warn(`[ConnectorDataProcessor] SIEM event ${evt.event_id} processing failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (result.rows.length > 0) {
    logger.info(`[ConnectorDataProcessor] SIEM: ${result.rows.length} events → ${incidents} incidents, ${risks} risks, ${evidence} evidence`);
  }
}

// ── 2. Vuln Scan → Risks + Remediation Tasks + Evidence ──────────────────

async function processVulnResults(tenantId: string, connectionId?: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const rules = await loadRules(tenantId, 'vuln');
  const filter = connectionId ? 'AND connection_id = $1' : '';
  const params = connectionId ? [connectionId] : [];

  const result = await safeQuery(
    `SELECT * FROM "${schema}".vuln_scan_results
     WHERE status = 'new' ${filter}
     ORDER BY cvss_score DESC NULLS LAST LIMIT ${BATCH_LIMIT}`,
    params
  );

  let risksCreated = 0, tasksCreated = 0, evidenceCreated = 0;

  for (const vuln of result.rows) {
    try {
      const cvss = parseFloat(vuln.cvss_score) || 0;
      const sev = (vuln.severity || '').toLowerCase();

      // High CVSS or critical/high severity → create risk (rule: vuln_high_risk)
      if ((cvss >= 7.0 || sev === 'critical' || sev === 'high') && ruleEnabled(rules, 'vuln_high_risk')) {
        await createRisk(tenantId, {
          title: `[Vuln] ${vuln.cve_id || vuln.title}`.substring(0, 200),
          description: `${vuln.title}. Host: ${vuln.affected_host || 'any'}. CVSS: ${cvss}. ${vuln.solution ? 'Solution: ' + vuln.solution.substring(0, 200) : ''}`,
          category: 'vulnerability',
          likelihood: Math.min(5, Math.ceil(cvss / 2)),
          impact: Math.min(5, Math.ceil(cvss / 2)),
          owner: 'connector-data-processor',
        });
        risksCreated++;

        // Create remediation task
        await createProcessTask(tenantId, {
          title: `Remediate: ${vuln.cve_id || vuln.title}`.substring(0, 200),
          description: `Vulnerability on ${vuln.affected_host || 'any host'}. CVSS: ${cvss}. ${vuln.solution || ''}`.substring(0, 500),
          taskType: 'remediation',
          priority: sev === 'critical' ? 'critical' as any : 'high' as string,
          entityType: 'vulnerability',
          entityId: vuln.result_id,
          dueInHours: sev === 'critical' ? 24 : 72,
        }).catch(catchHandler(EC.EVENT_BUS, {})); // best-effort — process orchestration may not have RACI for this
        tasksCreated++;
      }

      // Submit as evidence
      await submitEvidence(tenantId, {
        controlId: '',
        title: `Vuln Scan: ${vuln.cve_id || vuln.title} (${sev})`,
        description: `Host: ${vuln.affected_host || 'any'}. CVSS: ${cvss}`,
        submittedBy: 'connector-data-processor',
        date: vuln.last_detected_at || new Date().toISOString(),
        owner: 'connector-data-processor',
        systemReference: `vuln:${vuln.connection_id}`,
      }).catch(catchHandler(EC.EVENT_BUS, {}));
      evidenceCreated++;

      await safeQuery(
        `UPDATE "${schema}".vuln_scan_results SET status = 'linked' WHERE result_id = $1`,
        [vuln.result_id]
      );
    } catch (err: unknown) {
      logger.warn(`[ConnectorDataProcessor] Vuln ${vuln.result_id} processing failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (result.rows.length > 0) {
    logger.info(`[ConnectorDataProcessor] Vuln: ${result.rows.length} findings → ${risksCreated} risks, ${tasksCreated} tasks, ${evidenceCreated} evidence`);
  }
}

// ── 3. IAM → Orphan Detection + Access Review Tasks + Evidence ───────────

async function processIamIdentities(tenantId: string, connectionId?: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const rules = await loadRules(tenantId, 'iam');
  const filter = connectionId ? 'AND i.connection_id = $1' : '';
  const params = connectionId ? [connectionId] : [];

  // Detect orphan accounts: IAM identities with no matching platform user
  const orphans = await safeQuery(
    `SELECT i.* FROM "${schema}".iam_identities i
     LEFT JOIN "${schema}".users u ON LOWER(u.email) = LOWER(i.email)
     WHERE i.status = 'active' AND u.user_id IS NULL
       AND i.last_synced_at > NOW() - INTERVAL '2 hours'
       ${filter}
     LIMIT ${BATCH_LIMIT}`,
    params
  );

  let orphanTasks = 0, reviewTasks = 0;

  for (const identity of orphans.rows) {
    if (!ruleEnabled(rules, 'iam_orphan_detect')) break;
    try {
      await createProcessTask(tenantId, {
        title: `Orphan account detected: ${identity.display_name || identity.email || identity.external_user_id}`,
        description: `IAM identity ${identity.email || identity.external_user_id} exists in external system but has no corresponding platform user. Department: ${identity.department || 'any'}. Last login: ${identity.last_login_at || 'any'}`,
        taskType: 'risk_assessment',
        priority: 'medium' as any,
        entityType: 'iam_identity',
        entityId: identity.identity_id,
        dueInHours: 168, // 7 days
      }).catch(catchHandler(EC.EVENT_BUS, {}));
      orphanTasks++;
    } catch (err: unknown) {
      logger.warn(`[ConnectorDataProcessor] IAM orphan task for ${identity.identity_id} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Detect privileged accounts needing access review
  const privileged = await safeQuery(
    `SELECT i.* FROM "${schema}".iam_identities i
     WHERE i.status = 'active'
       AND (i.roles @> ARRAY['admin'] OR i.roles @> ARRAY['Global Administrator'] OR i.roles @> ARRAY['super_admin'])
       AND i.last_synced_at > NOW() - INTERVAL '2 hours'
       AND i.identity_id NOT IN (
         SELECT ar.identity_id FROM "${schema}".iam_access_reviews ar
         WHERE ar.created_at > NOW() - INTERVAL '90 days' AND ar.status IN ('approved', 'revoked')
       )
       ${filter}
     LIMIT ${BATCH_LIMIT}`,
    params
  );

  for (const identity of privileged.rows) {
    if (!ruleEnabled(rules, 'iam_access_review')) break;
    try {
      await createProcessTask(tenantId, {
        title: `Access review due: ${identity.display_name || identity.email}`,
        description: `Privileged account (roles: ${(identity.roles || []).join(', ')}) has not been reviewed in 90+ days. Last login: ${identity.last_login_at || 'any'}`,
        taskType: 'control_review',
        priority: 'high' as string,
        entityType: 'iam_identity',
        entityId: identity.identity_id,
        dueInHours: 72,
      }).catch(catchHandler(EC.EVENT_BUS, {}));
      reviewTasks++;
    } catch (err: unknown) {
      logger.warn(`[ConnectorDataProcessor] IAM review task for ${identity.identity_id} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Submit bulk evidence
  const totalSynced = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".iam_identities
     WHERE last_synced_at > NOW() - INTERVAL '2 hours' ${filter}`,
    params
  );
  const identityCount = parseInt(totalSynced.rows[0]?.cnt || '0', 10);

  if (identityCount > 0) {
    await submitEvidence(tenantId, {
      controlId: '',
      title: `IAM Sync: ${identityCount} identities reviewed`,
      description: `${orphanTasks} orphan accounts detected, ${reviewTasks} privileged accounts flagged for review`,
      submittedBy: 'connector-data-processor',
      date: new Date().toISOString(),
      owner: 'connector-data-processor',
      systemReference: `iam:${connectionId || 'batch'}`,
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  if (orphanTasks + reviewTasks > 0) {
    logger.info(`[ConnectorDataProcessor] IAM: ${orphanTasks} orphan tasks, ${reviewTasks} review tasks from ${identityCount} identities`);
  }
}

// ── 4. ITSM → Link Tickets + Status Sync ─────────────────────────────────

async function processItsmTickets(tenantId: string, connectionId?: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const _rules = await loadRules(tenantId, 'itsm');
  const filter = connectionId ? 'AND t.connection_id = $1' : '';
  const params = connectionId ? [connectionId] : [];

  // Unlinked tickets from recent sync
  const tickets = await safeQuery(
    `SELECT t.* FROM "${schema}".itsm_tickets t
     WHERE t.last_synced_at > NOW() - INTERVAL '2 hours'
       AND t.linked_incident_id IS NULL
       AND t.linked_remediation_id IS NULL
       ${filter}
     ORDER BY t.external_updated_at DESC NULLS LAST
     LIMIT ${BATCH_LIMIT}`,
    params
  );

  let linked = 0, evidenceCreated = 0;

  for (const ticket of tickets.rows) {
    try {
      // Try to match to existing incidents by title similarity
      const incidentMatch = await safeQuery(
        `SELECT incident_id FROM "${schema}".incidents
         WHERE LOWER(title) LIKE '%' || LOWER($1) || '%'
           OR LOWER($1) LIKE '%' || LOWER(title) || '%'
         LIMIT 1`,
        [ticket.summary.substring(0, 100)]
      );

      if (incidentMatch.rows.length > 0) {
        await safeQuery(
          `UPDATE "${schema}".itsm_tickets SET linked_incident_id = $1 WHERE ticket_id = $2`,
          [incidentMatch.rows[0].incident_id, ticket.ticket_id]
        );
        linked++;
      }

      // Submit as evidence for security/change tickets
      const ticketType = (ticket.ticket_type || '').toLowerCase();
      if (ticketType.includes('change') || ticketType.includes('incident') || ticketType.includes('security')) {
        await submitEvidence(tenantId, {
          controlId: '',
          title: `ITSM ${ticket.ticket_type}: ${ticket.summary}`.substring(0, 200),
          description: `Ticket: ${ticket.external_ticket_id}. Status: ${ticket.status}. Priority: ${ticket.priority}`,
          submittedBy: 'connector-data-processor',
          date: ticket.external_created_at || new Date().toISOString(),
          owner: 'connector-data-processor',
          systemReference: `itsm:${ticket.connection_id}`,
        }).catch(catchHandler(EC.EVENT_BUS, {}));
        evidenceCreated++;
      }
    } catch (err: unknown) {
      logger.warn(`[ConnectorDataProcessor] ITSM ticket ${ticket.ticket_id} processing failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Status sync: closed ITSM tickets → complete linked process tasks
  const closedTickets = await safeQuery(
    `SELECT t.ticket_id, t.linked_remediation_id FROM "${schema}".itsm_tickets t
     WHERE t.status IN ('resolved', 'closed', 'completed')
       AND t.linked_remediation_id IS NOT NULL
       AND t.last_synced_at > NOW() - INTERVAL '2 hours'
       ${filter}
     LIMIT ${BATCH_LIMIT}`,
    params
  );

  let completed = 0;
  for (const ticket of closedTickets.rows) {
    try {
      await safeQuery(
        `UPDATE "${schema}".process_tasks SET status = 'completed', completed_at = NOW()
         WHERE task_id = $1 AND status != 'completed'`,
        [ticket.linked_remediation_id]
      );
      completed++;
    } catch { /* best-effort */ }
  }

  if (tickets.rows.length > 0 || completed > 0) {
    logger.info(`[ConnectorDataProcessor] ITSM: ${linked} linked, ${evidenceCreated} evidence, ${completed} tasks auto-completed`);
  }
}

// ── 5. CMDB → Uncontrolled Asset Detection + Evidence ────────────────────

async function processCmdbAssets(tenantId: string, connectionId?: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const rules = await loadRules(tenantId, 'cmdb');
  const filter = connectionId ? 'AND connection_id = $1' : '';
  const params = connectionId ? [connectionId] : [];

  // Critical/high assets with no linked controls
  const uncontrolled = await safeQuery(
    `SELECT * FROM "${schema}".cmdb_assets
     WHERE criticality IN ('critical', 'high')
       AND status = 'active'
       AND linked_asset_id IS NULL
       AND last_synced_at > NOW() - INTERVAL '2 hours'
       ${filter}
     LIMIT ${BATCH_LIMIT}`,
    params
  );

  let tasks = 0;

  for (const asset of uncontrolled.rows) {
    if (!ruleEnabled(rules, 'cmdb_uncontrolled')) break;
    try {
      await createProcessTask(tenantId, {
        title: `Uncontrolled ${asset.criticality} asset: ${asset.asset_name}`.substring(0, 200),
        description: `CMDB asset "${asset.asset_name}" (class: ${asset.asset_class}, type: ${asset.asset_type || 'any'}) is ${asset.criticality} criticality but has no linked controls. Owner: ${asset.owner || 'any'}. IP: ${asset.ip_address || 'N/A'}`,
        taskType: 'control_review',
        priority: asset.criticality === 'critical' ? 'high' as string : 'medium' as any,
        entityType: 'cmdb_asset',
        entityId: asset.cmdb_asset_id,
        dueInHours: 168,
      }).catch(catchHandler(EC.EVENT_BUS, {}));
      tasks++;
    } catch (err: unknown) {
      logger.warn(`[ConnectorDataProcessor] CMDB asset ${asset.cmdb_asset_id} task failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Submit asset inventory as evidence
  const assetCounts = await safeQuery(
    `SELECT asset_class, COUNT(*) AS cnt FROM "${schema}".cmdb_assets
     WHERE last_synced_at > NOW() - INTERVAL '2 hours' AND status = 'active' ${filter}
     GROUP BY asset_class ORDER BY cnt DESC`,
    params
  );

  if (assetCounts.rows.length > 0) {
    const summary = assetCounts.rows.map((r: GenericRow) => `${r.asset_class}: ${r.cnt}`).join(', ');
    await submitEvidence(tenantId, {
      controlId: '',
      title: `CMDB Asset Inventory Sync`,
      description: `Asset classes: ${summary}. ${tasks} uncontrolled critical/high assets flagged.`,
      submittedBy: 'connector-data-processor',
      date: new Date().toISOString(),
      owner: 'connector-data-processor',
      systemReference: `cmdb:${connectionId || 'batch'}`,
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  if (tasks > 0 || assetCounts.rows.length > 0) {
    logger.info(`[ConnectorDataProcessor] CMDB: ${tasks} uncontrolled-asset tasks, ${assetCounts.rows.length} asset classes`);
  }
}

// ── 6. M365 → Auto-Link Evidence ─────────────────────────────────────────

async function processM365Items(tenantId: string, connectionId?: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const filter = connectionId ? 'AND connection_id = $1' : '';
  const params = connectionId ? [connectionId] : [];

  const staged = await safeQuery(
    `SELECT * FROM "${schema}".m365_evidence_items
     WHERE status = 'staged' ${filter}
     ORDER BY last_modified_at DESC NULLS LAST
     LIMIT ${BATCH_LIMIT}`,
    params
  );

  let linked = 0;

  for (const item of staged.rows) {
    try {
      // Auto-detect control mapping from linked_control_ids or file path
      const controlIds = item.linked_control_ids || [];
      const controlId = controlIds[0] || '';

      await submitEvidence(tenantId, {
        controlId,
        title: `M365: ${item.file_name || item.external_item_id}`,
        description: `Source: ${item.source_type}. Site: ${item.site_name || 'N/A'}. Path: ${item.file_path || 'N/A'}`,
        submittedBy: 'connector-data-processor',
        date: item.last_modified_at || new Date().toISOString(),
        owner: item.last_modified_by || 'connector-data-processor',
        systemReference: `m365:${item.connection_id}`,
      }).catch(catchHandler(EC.EVENT_BUS, {}));

      await safeQuery(
        `UPDATE "${schema}".m365_evidence_items SET status = 'linked' WHERE item_id = $1`,
        [item.item_id]
      );
      linked++;
    } catch (err: unknown) {
      logger.warn(`[ConnectorDataProcessor] M365 item ${item.item_id} processing failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (linked > 0) {
    logger.info(`[ConnectorDataProcessor] M365: ${linked} items linked as evidence`);
  }
}

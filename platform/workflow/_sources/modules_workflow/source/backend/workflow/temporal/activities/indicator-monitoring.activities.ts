// ============================================
// Indicator Monitoring Activities — spec Workflow 3
// Collect → Compare → Breach → Notify → Issue → Track
// ============================================

import { query as _query, safeQuery, tenantSchema } from '@dos/db';
import { createNotification } from '../../modules/notification/services/notification.service';
import { emitEvent } from '@dos/platform-core/events';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface IndicatorMonitoringActivities {
  collectIndicatorValue(tenantId: string, kriId: string): Promise<{ value: number; collectedBy: string }>;
  recordDataPoint(tenantId: string, kriId: string, value: number, collectedBy: string): Promise<void>;
  compareToThreshold(tenantId: string, kriId: string, value: number): Promise<ThresholdResult>;
  markBreach(tenantId: string, kriId: string, value: number, breachLevel: string, thresholdValue: number): Promise<string>;
  notifyBreachOwner(tenantId: string, kriId: string, breachId: string, breachLevel: string): Promise<void>;
  openIssueForBreach(tenantId: string, kriId: string, breachId: string): Promise<void>;
  checkBreachResolution(tenantId: string, kriId: string): Promise<boolean>;
  notifyBreachResolved(tenantId: string, kriId: string): Promise<void>;
}

interface ThresholdResult {
  breached: boolean;
  breachLevel: 'red' | 'amber' | 'green';
  thresholdValue: number;
  persistentBreach: boolean;
}

export async function collectIndicatorValue(tenantId: string, kriId: string): Promise<{ value: number; collectedBy: string }> {
  const ts = tenantSchema(tenantId);
  // Use current_value from the KRI record (may have been updated via API)
  const result = await safeQuery(`SELECT current_value FROM ${ts}.risk_kris WHERE kri_id = $1`, [kriId]);
  return { value: parseFloat(result.rows[0]?.current_value || '0'), collectedBy: 'scheduled_collection' };
}

export async function recordDataPoint(tenantId: string, kriId: string, value: number, collectedBy: string): Promise<void> {
  const ts = tenantSchema(tenantId);
  await safeQuery(`INSERT INTO ${ts}.kri_data_points (kri_id, value, collected_by) VALUES ($1, $2, $3)`, [kriId, value, collectedBy]);
  await safeQuery(`UPDATE ${ts}.risk_kris SET current_value = $2, last_collected_at = NOW(), updated_at = NOW() WHERE kri_id = $1`, [kriId, value]);
}

export async function compareToThreshold(tenantId: string, kriId: string, value: number): Promise<ThresholdResult> {
  const ts = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT threshold_red, threshold_amber, threshold_green FROM ${ts}.risk_kris WHERE kri_id = $1`, [kriId]);
  const k = result.rows[0];
  if (!k) return { breached: false, breachLevel: 'green', thresholdValue: 0, persistentBreach: false };

  const red = parseFloat(k.threshold_red);
  const amber = parseFloat(k.threshold_amber);

  // Check for persistent breach (3+ consecutive amber breaches)
  let persistentBreach = false;
  if (!isNaN(amber) && value >= amber) {
    const history = await safeQuery(`
      SELECT value FROM ${ts}.kri_data_points WHERE kri_id = $1 ORDER BY created_at DESC LIMIT 3
    `, [kriId]);
    persistentBreach = history.rows.length >= 3 && history.rows.every(r => parseFloat(r.value) >= amber);
  }

  if (!isNaN(red) && value >= red) return { breached: true, breachLevel: 'red', thresholdValue: red, persistentBreach };
  if (!isNaN(amber) && value >= amber) return { breached: true, breachLevel: 'amber', thresholdValue: amber, persistentBreach };
  return { breached: false, breachLevel: 'green', thresholdValue: parseFloat(k.threshold_green) || 0, persistentBreach: false };
}

export async function markBreach(tenantId: string, kriId: string, value: number, breachLevel: string, thresholdValue: number): Promise<string> {
  const ts = tenantSchema(tenantId);
  const kri = await safeQuery(`SELECT linked_risk_id, owner FROM ${ts}.risk_kris WHERE kri_id = $1`, [kriId]);
  const result = await safeQuery(`
    INSERT INTO ${ts}.kri_breach_log (kri_id, breach_value, threshold_breached, threshold_value, linked_risk_id, owner, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'open') RETURNING breach_id
  `, [kriId, value, breachLevel, thresholdValue, kri.rows[0]?.linked_risk_id, kri.rows[0]?.owner]);
  emitEvent({ tenantId, userId: SYSTEM_JOB_ACTOR, module: 'risks', event: 'kri_breach_detected', entityType: 'risk_kri', entityId: kriId, data: { breachLevel, value } });
  return result.rows[0]?.breach_id;
}

export async function notifyBreachOwner(tenantId: string, kriId: string, breachId: string, breachLevel: string): Promise<void> {
  const ts = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT name, owner FROM ${ts}.risk_kris WHERE kri_id = $1`, [kriId]);
  const kri = result.rows[0];
  if (!kri?.owner) return;
  await createNotification(tenantId, {
    userId: kri.owner,
    type: 'kri_breach',
    title: `KRI Breach (${breachLevel.toUpperCase()}): ${kri.name}`,
    body: `Key Risk Indicator "${kri.name}" has breached the ${breachLevel} threshold. Immediate attention required.`,
    entityType: 'risk_kri',
    entityId: kriId,
  }).catch(catchHandler(EC.EVENT_BUS));
}

export async function openIssueForBreach(tenantId: string, kriId: string, breachId: string): Promise<void> {
  const ts = tenantSchema(tenantId);
  const kri = await safeQuery(`SELECT name, linked_risk_id, owner FROM ${ts}.risk_kris WHERE kri_id = $1`, [kriId]);
  const k = kri.rows[0];
  await safeQuery(`
    INSERT INTO ${ts}.process_tasks (title, description, entity_type, entity_id, priority, status, assigned_to, created_by)
    VALUES ($1, $2, 'risk', $3, 'high', 'open', $4, 'indicator_monitoring')
  `, [`KRI Breach: ${k?.name || kriId}`, `Breach ID: ${breachId}. Threshold exceeded — remediation required.`, k?.linked_risk_id || kriId, k?.owner || 'unassigned']);
}

export async function checkBreachResolution(tenantId: string, kriId: string): Promise<boolean> {
  const ts = tenantSchema(tenantId);
  // Check if the latest 2 consecutive values are within green threshold
  const result = await safeQuery(`
    SELECT dp.value, k.threshold_amber
    FROM ${ts}.kri_data_points dp
    JOIN ${ts}.risk_kris k ON k.kri_id = dp.kri_id
    WHERE dp.kri_id = $1
    ORDER BY dp.created_at DESC LIMIT 2
  `, [kriId]);
  if (result.rows.length < 2) return false;
  const amber = parseFloat(result.rows[0]?.threshold_amber || '999999');
  return result.rows.every(r => parseFloat(r.value) < amber);
}

export async function notifyBreachResolved(tenantId: string, kriId: string): Promise<void> {
  const ts = tenantSchema(tenantId);
  // Close open breaches
  await safeQuery(`UPDATE ${ts}.kri_breach_log SET status = 'resolved' WHERE kri_id = $1 AND status = 'open'`, [kriId]);
  const kri = await safeQuery(`SELECT name, owner FROM ${ts}.risk_kris WHERE kri_id = $1`, [kriId]);
  if (kri.rows[0]?.owner) {
    await createNotification(tenantId, {
      userId: kri.rows[0].owner,
      type: 'kri_breach_resolved',
      title: `KRI Resolved: ${kri.rows[0].name}`,
      body: `Key Risk Indicator "${kri.rows[0].name}" is back within threshold. Breach resolved.`,
      entityType: 'risk_kri',
      entityId: kriId,
    }).catch(catchHandler(EC.EVENT_BUS));
  }
  emitEvent({ tenantId, userId: SYSTEM_JOB_ACTOR, module: 'risks', event: 'kri_breach_resolved', entityType: 'risk_kri', entityId: kriId });
}

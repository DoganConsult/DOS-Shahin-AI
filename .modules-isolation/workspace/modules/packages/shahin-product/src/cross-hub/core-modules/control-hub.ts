// @ts-nocheck — module-layer imports not yet extracted
import { logger } from '@dos/platform-core/observability';
// ============================================
// Cross-Hub: CONTROL HUB → other hubs
// Subscribers: control.failed, control.stale, control.implemented
// ============================================

import {
  type SubFn,
  enterpriseCreateTask, safeCreateTask, safePublish,
  safeQuery, tenantSchema,
  daysFromNow,
} from './helpers';

export function registerControlHub(sub: SubFn): void {

  // control.failed → Risk Hub: increase risk exposure
  //               → Compliance Hub: flag non-compliance
  //               → Audit Hub: create finding
  //               → Evidence Hub: request remediation evidence
  //               → Dependency Graph: cascade to downstream controls (Priority 11)
  sub('control.failed', 'xhub-control→risk-increase', async (e) => {
    const { tenantId, entityId, payload } = e;

    // → Dependency Graph: cascade failure to downstream controls
    try {
      const { cascadeControlFailure } = await import('../../../modules/compliance/services/misc/control-dependency-graph.service');
      const cascadeResult = await cascadeControlFailure(
        tenantId,
        entityId || '',
        `control_failed: ${payload?.controlName || entityId}`
      );
      
      if (cascadeResult.flaggedControls.length > 0) {
        logger.info(`[ControlHub] Cascaded control failure: ${cascadeResult.flaggedControls.length} dependent controls flagged as low effectiveness`);
      }
      if (cascadeResult.errors.length > 0) {
        logger.warn(`[ControlHub] Cascade errors: ${cascadeResult.errors.join('; ')}`);
      }
    } catch (err) {
      // Non-fatal: dependency cascade is best-effort
      logger.warn(`[ControlHub] Failed to cascade control failure for ${entityId}: ${err instanceof Error ? err.message : String(err)}`);
    }

    // → Risk Hub
    try {
      const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] Control failure risk: ${payload.controlName || entityId}`,
        description: `Control "${payload.controlName}" failed testing. Risk exposure increased.`,
        category: 'operational', likelihood: 4, impact: 4,
      });
    } catch { /* best effort */ }

    // → Compliance: flag
    await safePublish({
      eventType: 'compliance.gap_detected', tenantId,
      sourceService: 'cross-hub-integration', severity: 'critical',
      entityType: 'control', entityId,
      payload: { reason: 'control_failed', controlName: payload.controlName },
    });

    // → Evidence: request (enterprise role: evidence_owner)
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Remediation evidence: control failure ${payload.controlName || entityId}`,
      description: `Control failed. Provide evidence of corrective action.`,
      taskType: 'evidence_request', assigneeRole: 'evidence_owner',
      entityType: 'control', entityId: entityId || '', dueInHours: 336,
      triggerSource: 'xhub-control→evidence',
    });
  });

  // control.stale → Evidence Hub: request fresh evidence
  //              → Compliance Hub: flag stale control
  //              → Automation Hub: trigger auto-test
  sub('control.stale', 'xhub-control→evidence-refresh', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] Refresh evidence for stale control: ${payload.controlName || entityId}`,
      description: `Control "${payload.controlName}" evidence is stale. Re-test and re-collect evidence.`,
      dueDate: daysFromNow(7), entityType: 'control', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'automation.rule_triggered', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { ruleType: 'auto_control_test', controlId: entityId },
    });
  });

  // control.implemented → Compliance Hub: update posture
  //                     → Evidence Hub: request implementation evidence
  //                     → Reports Hub: update compliance metrics
  sub('control.implemented', 'xhub-control→compliance-update', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'control_implemented', controlId: entityId },
    });

    await safeCreateTask(tenantId, {
      title: `[Auto] Implementation evidence: ${payload.controlName || entityId}`,
      description: `Control implemented. Collect evidence of implementation for audit readiness.`,
      dueDate: daysFromNow(14), entityType: 'control', entityId: entityId || '',
    });
  });

  // control.retired → Evidence Hub: deactivate evidence schedules
  //                  → Compliance Hub: update posture (exclude from compliance calculations)
  sub('control.retired', 'xhub-control→evidence-deactivate', async (e) => {
    const { tenantId, entityId, payload } = e;

    try {
      const schema = tenantSchema(tenantId);
      // Deactivate all evidence schedules for this control
      await safeQuery(
        `UPDATE "${schema}".evidence_schedules
         SET enabled = false, updated_at = NOW()
         WHERE control_id = $1 AND enabled = true`,
        [entityId]
      );

      // Also deactivate pending evidence requests
      await safeQuery(
        `UPDATE "${schema}".evidence_requests
         SET status = 'cancelled', updated_at = NOW()
         WHERE control_id = $1 AND status IN ('pending', 'in_progress')`,
        [entityId]
      ).catch(() => { /* evidence_requests table may not exist in all tenants */ });

      await safePublish({
        eventType: 'compliance.posture_changed', tenantId,
        sourceService: 'cross-hub-integration', severity: 'info',
        payload: { reason: 'control_retired', controlId: entityId },
      });
    } catch (err) {
      // Non-fatal: evidence schedule deactivation is best-effort
      logger.warn(`[ControlHub] Failed to deactivate evidence schedules for retired control ${entityId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // control.state_changed → Evidence Hub: deactivate schedules if retired
  //                       → Compliance Hub: incremental posture update (handled by compliance-posture-hub)
  sub('control.state_changed', 'xhub-control→state-change-handler', async (e) => {
    const { tenantId, entityId, payload } = e;

    // If control was retired, deactivate evidence schedules
    if (payload?.newStatus === 'retired' || payload?.newStatus === 'retired') {
      try {
        const schema = tenantSchema(tenantId);
        await safeQuery(
          `UPDATE "${schema}".evidence_schedules
           SET enabled = false, updated_at = NOW()
           WHERE control_id = $1 AND enabled = true`,
          [entityId]
        );
      } catch (err) {
        // Non-fatal
        logger.warn(`[ControlHub] Failed to deactivate evidence schedules for control.state_changed (retired): ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });
}

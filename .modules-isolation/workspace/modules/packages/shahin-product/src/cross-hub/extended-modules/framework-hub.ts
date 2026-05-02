// @ts-nocheck — module-layer imports not yet extracted
import { logger } from '../../../../modules/governance-os/platform/services/misc/logger.service';
// ============================================
// Cross-Hub: FRAMEWORK HUB → other hubs
// Subscribers: framework.updated, framework.gap_identified, delta.detected
// ============================================

import {
  type SubFn,
  enterpriseCreateTask, safeCreateTask, safePublish,
  daysFromNow,
} from '../helpers';
import { safeQuery, tenantSchema } from '@dos/db';
import { recordObservation } from '../../../../modules/ai/services/observability/ai-observation.service.js';

export function registerFrameworkHub(sub: SubFn): void {

  // framework.updated → Compliance Hub: re-assess compliance against new version
  //                   → Knowledge Hub: update knowledge base
  //                   → Governance Hub: review policy alignment
  sub('framework.updated', 'xhub-framework→compliance-reassess', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] Re-assess compliance: framework update ${payload.frameworkName || entityId}`,
      description: `Framework "${payload.frameworkName}" updated. Re-map controls and re-assess compliance posture.`,
      dueDate: daysFromNow(14), entityType: 'framework', entityId: entityId || '',
    });

    await safeCreateTask(tenantId, {
      title: `[Auto] Policy alignment review: ${payload.frameworkName || entityId}`,
      description: `Check if existing policies align with updated framework requirements.`,
      dueDate: daysFromNow(21), entityType: 'framework', entityId: entityId || '',
    });
  });

  // framework.gap_identified → Compliance Hub: create control gap task
  //                          → Risk Hub: register framework gap risk
  sub('framework.gap_identified', 'xhub-framework→compliance-gap', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safePublish({
      eventType: 'compliance.gap_detected', tenantId,

      sourceService: 'cross-hub-integration', severity: 'warning',
      entityType: 'framework', entityId,
      payload: { reason: 'framework_gap', framework: payload.frameworkName, requirement: payload.requirement },
    });
  });

  // delta.detected (regulatory change) → Framework Hub: update framework
  //                                    → Governance Hub: policy review
  //                                    → Compliance Hub: impact assessment
  //                                    → Risk Hub: regulatory risk
  //                                    → AI Observation: auto-assess control impact (Feature 18)
  sub('delta.detected', 'xhub-delta→framework-update', async (e) => {
    const { tenantId, entityId, payload } = e;
    // Only process genuine regulatory deltas (not domain-event-bridge generic ones)
    if (payload.action && !payload.instrument) return;

    // → Compliance: regulatory impact assessment (enterprise role: compliance_manager)
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Regulatory change impact: ${payload.instrument || entityId}`,
      description: `Regulatory delta detected. Assess impact on frameworks, controls, and policies.`,
      taskType: 'control_review', assigneeRole: 'compliance_manager',
      entityType: 'regulatory_delta', entityId: entityId || '', dueInHours: 336,
      triggerSource: 'xhub-delta→compliance',
    });

    // → Governance: policy review (enterprise role: policy_reviewer)
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Policy review: regulatory change ${payload.instrument || entityId}`,
      description: `Review and update policies affected by regulatory change.`,
      taskType: 'policy_creation', assigneeRole: 'policy_reviewer',
      entityType: 'regulatory_delta', entityId: entityId || '', dueInHours: 504,
      triggerSource: 'xhub-delta→policy-review',
    });

    // Feature 18: Regulatory delta impact auto-assessment
    // Query control mappings to find affected controls and create AI observations
    try {
      const schema = tenantSchema(tenantId);
      const instrumentId = payload.instrument || payload.instrumentId || entityId;
      if (!instrumentId) return;

      // Get affected node IDs from delta payload
      const addedNodes = payload.addedNodes || payload.added_nodes || [];
      const modifiedNodes = payload.modifiedNodes || payload.modified_nodes || [];
      const removedNodes = payload.removedNodes || payload.removed_nodes || [];

      const allAffectedNodes = [...addedNodes, ...modifiedNodes, ...removedNodes];

      if (allAffectedNodes.length === 0) return;

      // Query controls mapped to any of the affected nodes
      const controlsResult = await safeQuery(
        `SELECT control_id, title, mapped_registry_nodes, status, test_status
         FROM "${schema}".controls
         WHERE mapped_registry_nodes && $1::text[]`,
        [allAffectedNodes],
      );

      if (controlsResult.rows.length === 0) return;

      // Determine severity based on delta impact

      const totalChanges = addedNodes.length + modifiedNodes.length + removedNodes.length;
      let baseSeverity: 'info' | 'warning' | 'critical' = 'info';

      if (removedNodes.length > 5 || totalChanges > 20) baseSeverity = 'critical';

      else if (removedNodes.length > 0 || totalChanges > 10) baseSeverity = 'warning';

      // Create observations for each affected control
      for (const control of controlsResult.rows) {
        const mappedNodes = control.mapped_registry_nodes || [];
        const affectedNodeIds = allAffectedNodes.filter(nodeId => mappedNodes.includes(nodeId));

        if (affectedNodeIds.length === 0) continue;

        // Determine if this control is affected by removed nodes (higher severity)

        const hasRemovedNodes = affectedNodeIds.some(nodeId => removedNodes.includes(nodeId));
        const severity = hasRemovedNodes && baseSeverity !== 'critical' ? 'warning' : baseSeverity;

        // Build observation title and description
        const changeTypes: string[] = [];

        if (affectedNodeIds.some(id => addedNodes.includes(id))) changeTypes.push('new requirements');

        if (affectedNodeIds.some(id => modifiedNodes.includes(id))) changeTypes.push('modified requirements');

        if (affectedNodeIds.some(id => removedNodes.includes(id))) changeTypes.push('removed requirements');

        const title = `Regulatory delta impact: ${control.title || control.control_id}`;
        const description = `${payload.instrumentName || instrumentId} updated (v${payload.previousVersion || '?'} → v${payload.newVersion || '?'}). ` +
          `This control is affected by ${changeTypes.join(', ')}. ` +
          `${affectedNodeIds.length} mapped node(s) impacted.`;

        await recordObservation({
          tenantId,
          entityType: 'control',
          entityId: control.control_id,
          observationType: 'gap',
          title,
          description,
          severity,
          confidence: 0.9, // High confidence for regulatory delta impacts
          evidenceJson: {
            instrumentId,
            instrumentName: payload.instrumentName || instrumentId,
            previousVersion: payload.previousVersion,
            newVersion: payload.newVersion,
            affectedNodeIds,
            changeTypes,
            deltaId: payload.deltaId || entityId,
            controlTitle: control.title,
            controlStatus: control.status,
            controlTestStatus: control.test_status,
          },
        });
      }

      logger.info(`[FrameworkHub] Feature 18: Created ${controlsResult.rows.length} observations for regulatory delta ${instrumentId} in tenant ${tenantId}`);
    } catch (err) {
      logger.warn(`[FrameworkHub] Feature 18: Failed to create observations for delta ${entityId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

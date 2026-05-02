// @ts-nocheck — module-layer imports not yet extracted
import { logger } from '../../../../modules/governance-os/platform/services/misc/logger.service';
import { emptyResult } from '@dos/db';
// ============================================
// Cross-Hub: INCIDENT HUB → other hubs
// Subscribers: incident.created, incident.resolved, incident.root_cause_identified, control.effectiveness_low
// ============================================

import { v4 as uuid } from 'uuid';
import {
  type SubFn,
  enterpriseCreateTask, safeCreateTask, safePublish,
  daysFromNow, safeQuery, tenantSchema, getFirstAdmin,
} from '../helpers';
import { getPlaybookTemplateForCategory } from '../../../../modules/incident/services/incident/incident-playbook-templates.service.js';
import { createProcessTask } from '@dos/platform-core/workflows';

import { createLink } from '../../../../ai/index.js';
import { getFirstRow } from '../../../../utils/db-utils';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';
import type { GenericRow } from '@dos/types/db';

export function registerIncidentHub(sub: SubFn): void {

  // ---------- Feature 14: incident.root_cause_identified → control effectiveness chain ----------
  sub('incident.root_cause_identified', 'xhub-incident→control-effectiveness', async (e) => {
    const { tenantId, entityId, payload } = e;
    const incidentId = entityId || payload?.incidentId;
    const rootCauseId = payload?.rootCauseId;
    const controlIds: string[] = payload?.control_id
      ? [String(payload.control_id)]
      : (Array.isArray(payload?.affected_controls) ? payload.affected_controls.map((c: Record<string, unknown>) => String(c)) : []);

    if (!controlIds.length) return;

    const schema = tenantSchema(tenantId);
    for (const controlId of controlIds) {
      try {
        const prev = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
          `SELECT effectiveness_rating FROM "${schema}".controls WHERE control_id = $1`,
          [controlId]
        ), { operation: 'query controls' });
        const fromRating = (getFirstRow(prev) as GenericRow | null)?.effectiveness_rating ?? 'adequate';

        await safeQuery(
          `UPDATE "${schema}".controls
           SET effectiveness_rating = 'low', effectiveness_updated_at = NOW(), effectiveness_updated_by = 'agrc-os'
           WHERE control_id = $1`,
          [controlId]
        );

        await safeQuery(
          `INSERT INTO "${schema}".control_effectiveness_log
            (log_id, control_id, from_rating, to_rating, reason, incident_id, changed_by, created_at)
           VALUES ($1, $2, $3, 'low', $4, $5, 'agrc-os', NOW())`,
          [uuid(), controlId, fromRating, 'Incident root cause linked to control', incidentId || null]
        ).catch(catchHandler(EC.EVENT_BUS, {}));

        await safePublish({
          eventType: 'control.effectiveness_low',
          tenantId,
          entityId: controlId,

          sourceService: 'cross-hub-incident',
          severity: 'warning',
          payload: { incidentId, rootCauseId, controlId },
        });
      } catch { /* per-control best-effort */ }
    }
  });

  // ---------- Feature 14: control.effectiveness_low → remediation, A04, risk recalc ----------
  sub('control.effectiveness_low', 'xhub-control-eff→remediation-a04-risk', async (e) => {
    const { tenantId, entityId: controlId, payload } = e;
    const incidentId = payload?.incidentId;

    try {
      const { createRemediationTask } = await import('../../../../modules/remediation/services/remediation.service.js');
      const admin = await getFirstAdmin(tenantId);
      await createRemediationTask(tenantId, {
        title: `[Auto] Control effectiveness low${incidentId ? ` (incident ${incidentId})` : ''}`,
        description: `Control ${controlId} was flagged as low effectiveness${incidentId ? ` following incident ${incidentId}.` : '.'} Review and strengthen control or update evidence.`,
        linked_entity_type: 'control',
        linked_entity_id: controlId || '',
        assigned_to: admin,
        priority: 'high',
        due_date: daysFromNow(14),
      });
    } catch { /* remediation_tasks may not exist */ }

    try {
      const { runAgent } = await import('../../../../modules/ai/services/agents/core/agent-runner.service.js');
      await runAgent(tenantId, 'A04').catch(catchHandler(EC.EVENT_BUS, {}));
    } catch { /* best-effort */ }

    try {
      const { recalculateRiskScores } = await import('../../../../modules/risk/services/auto-risk-scoring.service.js');
      await recalculateRiskScores(tenantId);
    } catch { /* best-effort */ }

    const schema = tenantSchema(tenantId);
    const mappingRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT risk_id FROM "${schema}".risk_control_mappings WHERE control_id = $1`,
      [controlId]
    ), { operation: 'query risk_control_mappings' });

    for (const row of mappingRes.rows) {
      await safePublish({
        eventType: 'risk.score_changed',
        tenantId,

        entityId: row.risk_id,
        sourceService: 'cross-hub-integration',
        severity: 'info',
        payload: { controlId, reason: 'control_effectiveness_low', incidentId },
      });
    }
  });

  // incident.created → Risk Hub: create/update linked risk
  //                  → Compliance Hub: flag potential compliance breach
  //                  → Evidence Hub: collect incident evidence
  //                  → Workflow Hub: trigger incident response workflow (playbook-driven)
  //                  → Reports Hub: schedule incident report
  sub('incident.created', 'xhub-incident→risk-update', async (e) => {
    const { tenantId, entityId, payload } = e;
    const incidentId = entityId || '';

    const category = payload?.category?.toLowerCase().trim();

    // → Risk Hub: create risk from incident
    if (e.severity === 'critical') {
      try {
        const { createRisk } = await import('../../../../modules/risk/services/core/risk.service.js');
        await createRisk(tenantId, {
          title: `[Auto] Risk from incident: ${payload.title || entityId}`,
          description: `Automatically created from incident ${entityId}. Severity: ${e.severity}.`,
          category: 'operational',
          likelihood: e.severity === 'critical' ? 5 : 3,
          impact: e.severity === 'critical' ? 5 : 3,
        });
      } catch { /* risk table may not exist */ }
    }

    // ── Priority 19: Playbook-Driven Incident Response ──────────────────────
    // Check if category matches a playbook template (data_breach, system_outage, compliance_violation)
    const playbookTemplate = category ? getPlaybookTemplateForCategory(category) : null;

    if (playbookTemplate) {
      // Playbook-driven: create sequence of process_tasks from playbook steps
      try {
        const systemUserId = await getFirstAdmin(tenantId);
        const createdTaskIds: Map<number, string> = new Map(); // Map step order → taskId

        // Create tasks in order, handling dependencies
        for (const step of playbookTemplate.steps.sort((a, b) => a.order - b.order)) {
          // Resolve blocking task IDs from dependencies
          const blockingTaskIds: string[] = [];
          if (step.dependencies && step.dependencies.length > 0) {
            for (const depOrder of step.dependencies) {
              const depTaskId = createdTaskIds.get(depOrder);
              if (depTaskId) {
                blockingTaskIds.push(depTaskId);
              }
            }
          }

          // Create the process task
          const task = await createProcessTask(tenantId, {
            title: step.titleEn,
            description: step.descriptionEn,
            taskType: step.taskType,
            priority: step.priority,
            entityType: 'incident',
            entityId: incidentId,
            assigneeRole: step.assigneeRole,
            dueInHours: step.dueInHours,
            blockingTaskIds: blockingTaskIds.length > 0 ? blockingTaskIds : undefined,
            triggerSource: `playbook-${playbookTemplate.category}`,
            triggerData: {
              playbookName: playbookTemplate.nameEn,
              stepOrder: step.order,
              category: playbookTemplate.category,
            },
          });

          if (task?.taskId) {
            createdTaskIds.set(step.order, task.taskId);

            // Link task to incident via entity_links
            try {
              await createLink(tenantId, systemUserId, {
                sourceType: 'incident',
                sourceId: incidentId,
                targetType: 'process_task',
                targetId: task.taskId,
                relationshipType: 'generated_from',
                metadata: {
                  playbookCategory: playbookTemplate.category,
                  playbookStepOrder: step.order,
                  playbookStepTitle: step.titleEn,
                },
              });
            } catch (linkError) {
              // Non-fatal: entity_links may not exist or link creation may fail
              logger.warn(`[IncidentHub] Failed to link task ${task.taskId} to incident ${incidentId}:`, linkError);
            }
          }
        }

        // Log playbook execution
        try {
          await safeQuery(
            `INSERT INTO "${tenantSchema(tenantId)}".audit_log
              (log_id, tenant_id, user_id, module, action, entity_type, entity_id, summary, created_at)
             VALUES ($1, $2, $3, 'incident', 'playbook_executed', 'incident', $4, $5, NOW())
             ON CONFLICT DO NOTHING`,
            [
              uuid(),
              tenantId,
              systemUserId,
              incidentId,
              `Playbook "${playbookTemplate.nameEn}" executed for incident ${incidentId}. Created ${createdTaskIds.size} tasks.`,
            ]
          );
        } catch { /* audit log non-fatal */ }
      } catch (playbookError) {
        // Playbook execution failed — fall back to generic tasks
        logger.error(`[IncidentHub] Playbook execution failed for incident ${incidentId}, category ${category}:`, playbookError);
        // Continue with generic task creation below
      }
    }

    // → Evidence Hub: collect incident artifacts (enterprise role: evidence_owner)
    // Only create if playbook didn't already create an evidence task
    if (!playbookTemplate || !playbookTemplate.steps.some(s => s.taskType === 'evidence_request')) {
      await enterpriseCreateTask(tenantId, {
        title: `[Auto] Collect incident evidence: ${payload.title || entityId}`,
        description: `Gather logs, screenshots, and artifacts for incident "${payload.title}".`,
        taskType: 'evidence_request', assigneeRole: 'evidence_owner',
        entityType: 'incident', entityId: incidentId, dueInHours: 72,
        triggerSource: 'xhub-incident→evidence',
      });
    }

    // → Workflow Hub: initiate response workflow (enterprise role: incident_owner)
    // Only create if playbook didn't already create an incident_response task
    if (!playbookTemplate || !playbookTemplate.steps.some(s => s.taskType === 'incident_response')) {
      await enterpriseCreateTask(tenantId, {
        title: `[Auto] Incident response workflow: ${payload.title || entityId}`,
        description: `Execute incident response procedure: contain, investigate, remediate, recover.`,
        taskType: 'incident_response', assigneeRole: 'incident_owner',
        priority: e.severity === 'critical' ? 'critical' : 'high',
        entityType: 'incident', entityId: incidentId, dueInHours: 24,
        triggerSource: 'xhub-incident→response',
      });
    }

    // → Compliance Hub: compliance impact assessment (enterprise role: compliance_analyst)
    // Only create if playbook didn't already create a control_review task
    if (!playbookTemplate || !playbookTemplate.steps.some(s => s.taskType === 'control_review')) {
      await enterpriseCreateTask(tenantId, {
        title: `[Auto] Compliance impact: incident ${payload.title || entityId}`,
        description: `Assess whether this incident constitutes a compliance breach under applicable frameworks.`,
        taskType: 'control_review', assigneeRole: 'compliance_analyst',
        entityType: 'incident', entityId: incidentId, dueInHours: 120,
        triggerSource: 'xhub-incident→compliance',
      });
    }
  });

  // incident.resolved → Risk Hub: recalculate risk scores
  //                   → Knowledge Hub: extract lessons learned
  //                   → Audit Hub: close audit finding if linked
  sub('incident.resolved', 'xhub-incident→knowledge-lessons', async (e) => {
    const { tenantId, entityId, payload } = e;

    // → Knowledge Hub: create lessons learned task
    await safeCreateTask(tenantId, {
      title: `[Auto] Lessons learned: incident ${payload.title || entityId}`,
      description: `Document root cause, timeline, and preventive measures for future reference.`,
      dueDate: daysFromNow(7), entityType: 'incident', entityId: entityId || '',
    });

    // → Risk Hub: trigger risk re-evaluation
    await safePublish({
      eventType: 'risk.score_changed', tenantId,

      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'incident_resolved', incidentId: entityId },
    });

    // → Analytics Hub: update metrics
    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,

      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'incident_resolved', incidentId: entityId },
    });
  });
}

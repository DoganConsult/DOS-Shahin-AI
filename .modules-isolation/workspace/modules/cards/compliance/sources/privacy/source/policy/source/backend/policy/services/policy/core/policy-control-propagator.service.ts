import { logger } from '../../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { eventBus, type PlatformEvent } from '../../../ports/events.port';
import { recordAudit as _recordAudit } from '../../../../audit/services/audit/core/audit-trail.service.js';
import { createProcessTask } from '../../../ports/lifecycle.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import Fuse from 'fuse.js';

export async function propagatePolicyApprovalToControls(
  tenantId: string,
  policyId: string,
  policyVersion: string,
): Promise<{ controlsUpdated: number; gapsDetected: number }> {
  const schema = tenantSchema(tenantId);
  let controlsUpdated = 0;
  let gapsDetected = 0;

  try {
    const linkedControls = await safeQuery(
      `SELECT pcl.control_id, c.title, c.effectiveness_score, c.status
       FROM "${schema}".policy_control_links pcl
       JOIN "${schema}".controls c ON c.control_id = pcl.control_id
       WHERE pcl.policy_id = $1 AND c.deleted_at IS NULL`,
      [policyId],
    );

    for (const ctrl of linkedControls.rows) {
      await safeQuery(
        `UPDATE "${schema}".controls
         SET policy_version = $1, policy_aligned = true, last_policy_review = NOW(), updated_at = NOW()
         WHERE control_id = $2`,
        [policyVersion, ctrl.control_id],
      );
      controlsUpdated++;

      if ((ctrl.effectiveness_score ?? 0) < 40) {
        gapsDetected++;
        await createProcessTask(tenantId, {
          title: `Control gap: Policy updated but control "${ctrl.title}" is weak`,
          description: `Policy has been approved (v${policyVersion}). Control effectiveness is ${ctrl.effectiveness_score}%. Review and remediate.`,
          taskType: 'control_review',
          priority: 'high',
          entityType: 'control',
          entityId: ctrl.control_id as string,
          triggerSource: 'policy.approved',
        });
      }
    }

    const policyRes = await safeQuery(
      `SELECT title, scope_description, requirements FROM "${schema}".policies WHERE policy_id = $1`,
      [policyId],
    );
    const policy = getFirstRow(policyRes)!;

    if (policy && linkedControls.rows.length === 0) {
      const allControls = await safeQuery(
        `SELECT control_id, title, description FROM "${schema}".controls
         WHERE deleted_at IS NULL AND status = 'active' LIMIT 200`,
      );

      if (allControls.rows.length > 0) {
        const fuse = new Fuse(allControls.rows as Record<string, unknown>[][], {
          keys: ['title', 'description'],
          threshold: 0.4,
          includeScore: true,
        });

        const policyText = `${policy.title || ''} ${policy.scope_description || ''} ${policy.requirements || ''}`;
        const matches = fuse.search(policyText).slice(0, 5);

        if (matches.length > 0) {
          await createProcessTask(tenantId, {
            title: `Policy "${policy.title}" approved with no linked controls`,
            description: `Policy approved but has no linked controls. ${matches.length} potential matches found via fuzzy search. Review and link appropriate controls.`,
            taskType: 'control_review',
            priority: 'medium',
            entityType: 'policy',
            entityId: policyId,
            triggerSource: 'policy.approved',
          });
          gapsDetected++;
        }
      }
    }

    await swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: 'policy.controls_propagated' as any,

      tenantId, sourceService: 'policy-control-propagator', severity: 'info',
      entityType: 'policy', entityId: policyId,
      payload: { policyId, policyVersion, controlsUpdated, gapsDetected },
    }));
  } catch (err) {
    logger.error(`[PolicyControlPropagator] failed: ${(err as Error).message}`);
  }

  return { controlsUpdated, gapsDetected };
}

export async function tracePolicyToEvidence(
  tenantId: string,
  policyId: string,
): Promise<{
  policyId: string;
  controls: Array<{ controlId: string; title: string; evidenceCount: number; freshCount: number; expiredCount: number }>;
  totalEvidence: number;
  freshPct: number;
  traceComplete: boolean;
}> {
  const schema = tenantSchema(tenantId);

  const controls = await safeQuery(
    `SELECT c.control_id, c.title,
            COUNT(e.evidence_id)::int AS evidence_count,
            COUNT(e.evidence_id) FILTER (WHERE e.status = 'validated' AND (e.expiry_date IS NULL OR e.expiry_date > NOW()))::int AS fresh_count,
            COUNT(e.evidence_id) FILTER (WHERE e.status = 'expired' OR (e.expiry_date IS NOT NULL AND e.expiry_date <= NOW()))::int AS expired_count
     FROM "${schema}".policy_control_links pcl
     JOIN "${schema}".controls c ON c.control_id = pcl.control_id
     LEFT JOIN "${schema}".evidence e ON e.control_id = c.control_id AND e.deleted_at IS NULL
     WHERE pcl.policy_id = $1 AND c.deleted_at IS NULL
     GROUP BY c.control_id, c.title`,
    [policyId],
  );

  const mapped = controls.rows.map(( r: Record<string, unknown>) => ({
    controlId: r.control_id,
    title: r.title,
    evidenceCount: r.evidence_count,
    freshCount: r.fresh_count,
    expiredCount: r.expired_count,
  }));

  const totalEvidence = mapped.reduce((s, c) => (s as any) + c.evidenceCount, 0);
  const totalFresh = mapped.reduce((s, c) => (s as any) + c.freshCount, 0);
  const freshPct = totalEvidence > 0 ? Math.round((totalFresh / totalEvidence) * 100) : 0;
  const traceComplete = mapped.length > 0 && mapped.every(c => (c as any).evidenceCount > 0 && (c as any).freshCount > 0);

  return { policyId, controls: mapped, totalEvidence, freshPct, traceComplete };
}

export function registerPolicyControlPropagatorSubscribers(): void {
  eventBus.subscribe('policy.approved' as any, 'policy-ctrl-prop:approval', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const policyId = event.payload?.entityId as string || event.entityId;
    const version = event.payload?.version as string || '1.0';
    if (policyId) {
      await propagatePolicyApprovalToControls(event.tenantId, policyId, version);
    }
  });

  eventBus.subscribe('evidence.validated' as any, 'policy-ctrl-prop:evidence-trace', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const controlId = event.payload?.controlId as string;
    if (controlId) {
      const schema = tenantSchema(event.tenantId);
      try {
        const policyLinks = await safeQuery(
          `SELECT policy_id FROM "${schema}".policy_control_links WHERE control_id = $1`,
          [controlId],
        );
        for (const row of policyLinks.rows) {
          const trace = await tracePolicyToEvidence(event.tenantId, row.policy_id as string);
          if (trace.traceComplete) {
            await swallow(EC.EVENT_BUS, eventBus.publish({
              eventType: 'policy.trace_complete' as any,

              tenantId: event.tenantId, sourceService: 'policy-control-propagator', severity: 'info',
              entityType: 'policy', entityId: row.policy_id as string,
              payload: { policyId: row.policy_id, freshPct: trace.freshPct },
            }));
          }
        }
      } catch { /* non-fatal */ }
    }
  });

  logger.info('[PolicyControlPropagator] subscribers registered');
}

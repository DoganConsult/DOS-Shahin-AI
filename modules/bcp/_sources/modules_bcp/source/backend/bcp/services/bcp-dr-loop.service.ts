import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow as _getFirstRow } from '@dos/db';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { swallow, EC } from '@dos/platform-core/resilience';
import { CronExpressionParser } from 'cron-parser';
import prom from 'prom-client';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

const bcpReadinessGauge = new prom.Gauge({
  name: 'shahin_bcp_readiness_score',
  help: 'BCP readiness score per tenant',
  labelNames: ['tenant_id'],
});

const drTestOverdueGauge = new prom.Gauge({
  name: 'shahin_dr_test_overdue_count',
  help: 'Number of DR plans overdue for testing',
  labelNames: ['tenant_id'],
});

export interface DRLoopResult {
  tenantId: string;
  totalPlans: number;
  overduePlans: number;
  exercisesDue: number;
  readinessScore: number;
  tasksCreated: number;
}

export async function runDRTestLoop(tenantId: string): Promise<DRLoopResult> {
  const schema = tenantSchema(tenantId);
  let tasksCreated = 0;

  try {
    const plans = await safeQuery(
      `SELECT plan_id, plan_name, last_tested_at, test_frequency_cron, rto_hours, rpo_hours, status
       FROM "${schema}".bcp_plans
       WHERE deleted_at IS NULL AND status IN ('active', 'approved')`,
    );

    let overduePlans = 0;
    let exercisesDue = 0;

    for (const plan of plans.rows) {
      const lastTested = plan.last_tested_at ? new Date(plan.last_tested_at as string) : null;
      let isOverdue = false;

      if (plan.test_frequency_cron) {
        try {
          const expr = CronExpressionParser.parse(plan.test_frequency_cron as string, {
            currentDate: lastTested || new Date(0),
          });
          const nextDue = expr.next().toDate();
          isOverdue = nextDue < new Date();
        } catch { /* invalid cron — fall back to 1-year */ }
      }

      if (!isOverdue && lastTested) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        isOverdue = lastTested < oneYearAgo;
      } else if (!lastTested) {
        isOverdue = true;
      }

      if (isOverdue) {
        overduePlans++;
        exercisesDue++;

        await createProcessTask(tenantId, {
          title: `DR Test overdue: "${plan.plan_name || plan.plan_id}"`,
          description: `BCP/DR plan has not been tested ${lastTested ? `since ${new Date(lastTested).toISOString().slice(0, 10)}` : 'ever'}. Schedule and execute a DR exercise.`,
          taskType: 'verification',
          priority: overduePlans > 3 ? 'critical' : 'high',
          entityType: 'bcp_plan',
          entityId: plan.plan_id as string,
          triggerSource: 'bcp.dr_loop',
        });
        tasksCreated++;
      }
    }

    const totalPlans = plans.rows.length;
    const testedRecently = totalPlans - overduePlans;
    const readinessScore = totalPlans > 0 ? Math.round((testedRecently / totalPlans) * 100) : 0;

    bcpReadinessGauge.set({ tenant_id: tenantId }, readinessScore);
    drTestOverdueGauge.set({ tenant_id: tenantId }, overduePlans);

    if (overduePlans > 0) {
      await swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: 'bcp.dr_tests_overdue' as any,

        tenantId, sourceService: 'bcp-dr-loop', severity: overduePlans > 3 ? 'critical' : 'warning',
        entityType: 'bcp', entityId: tenantId,
        payload: { totalPlans, overduePlans, readinessScore },
      }));
    }

    return { tenantId, totalPlans, overduePlans, exercisesDue, readinessScore, tasksCreated };
  } catch (err) {
    logger.error(`[BCP-DR-Loop] failed for tenant ${tenantId}: ${(err as Error).message}`);
    return { tenantId, totalPlans: 0, overduePlans: 0, exercisesDue: 0, readinessScore: 0, tasksCreated: 0 };
  }
}

export async function propagateExerciseResultToRecoveryPlan(
  tenantId: string,
  exerciseId: string,
  planId: string,
  passed: boolean,
  actualRtoHours: number | null,
  actualRpoHours: number | null,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE "${schema}".bcp_plans
       SET last_tested_at = NOW(),
           last_test_result = $1,
           actual_rto_hours = COALESCE($2, actual_rto_hours),
           actual_rpo_hours = COALESCE($3, actual_rpo_hours),
           updated_at = NOW()
       WHERE plan_id = $4`,
      [passed ? 'pass' : 'fail', actualRtoHours, actualRpoHours, planId],
    );

    if (!passed) {
      await createProcessTask(tenantId, {
        title: `DR Exercise failed: Update recovery plan`,
        description: `DR exercise ${exerciseId} failed for plan ${planId}. ${actualRtoHours ? `Actual RTO: ${actualRtoHours}h.` : ''} Review and update recovery procedures.`,
        taskType: 'verification',
        priority: 'critical',
        entityType: 'bcp_plan',
        entityId: planId,
        triggerSource: 'bcp.exercise_completed',
      });

      await swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: 'bcp.exercise_failed' as any,

        tenantId, sourceService: 'bcp-dr-loop', severity: 'critical',
        entityType: 'bcp_exercise', entityId: exerciseId,
        payload: { exerciseId, planId, actualRtoHours, actualRpoHours },
      }));
    }

    await swallow(EC.EVENT_BUS, recordAudit({
      tenantId, userId: SYSTEM_JOB_ACTOR, module: 'bcp', action: 'update',
      entityType: 'bcp_plan', entityId: planId,
      afterState: { exerciseId, passed, actualRtoHours, actualRpoHours },
    }));
  } catch (err) {
    logger.error(`[BCP-DR-Loop] exercise propagation failed: ${(err as Error).message}`);
  }
}

export function registerBcpDrLoopSubscribers(): void {
  eventBus.subscribe('bcp.exercise_completed' as any, 'bcp-dr-loop:exercise', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const exerciseId = event.payload?.exerciseId as string || event.entityId;
    const planId = event.payload?.planId as string;
    const passed = event.payload?.result === 'pass';
    const rto = event.payload?.actualRtoHours as number ?? null;
    const rpo = event.payload?.actualRpoHours as number ?? null;
    if (exerciseId && planId) {
      await propagateExerciseResultToRecoveryPlan(event.tenantId, exerciseId, planId, passed, rto, rpo);
    }
  });

  eventBus.subscribe('incident.created' as any, 'bcp-dr-loop:incident-activation', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    if (event.severity !== 'critical') return;
    const schema = tenantSchema(event.tenantId);
    try {
      const activePlans = await safeQuery(
        `SELECT plan_id, plan_name FROM "${schema}".bcp_plans
         WHERE status = 'active' AND deleted_at IS NULL LIMIT 10`,
      );
      for (const plan of activePlans.rows) {
        await createProcessTask(event.tenantId, {
          title: `BCP Activation check: Critical incident — "${plan.plan_name || 'Plan'}"`,
          description: `Critical incident created. Evaluate if BCP plan activation is required.`,
          taskType: 'verification',
          priority: 'critical',
          entityType: 'bcp_plan',
          entityId: plan.plan_id as string,
          triggerSource: 'incident.created',
        });
      }
    } catch { /* non-fatal */ }
  });

  logger.info('[BCP-DR-Loop] subscribers registered');
}

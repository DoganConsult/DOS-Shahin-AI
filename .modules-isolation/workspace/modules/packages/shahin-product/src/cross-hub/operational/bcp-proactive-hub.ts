// @ts-nocheck — module-layer imports not yet extracted
// ============================================
// Cross-Hub: BCP PROACTIVE — Cross-module event integration
// Subscribers: incident.created (bcp readiness), risk.exceeded_appetite,
//   vendor.contract_expiring, bcp.rto_rpo_drift, incident.resolved (bcp learning),
//   vendor.onboarded (bcp impact), connector.connected (bcp impact),
//   bcp.maturity_regression
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
  enterpriseCreateTask,
  safeNotifyAdmins,
} from './helpers';
import { emptyResult } from '@dos/db';
import type { GenericRow } from '@dos/types/db';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export function registerBcpProactiveHub(sub: SubFn): void {

  // ═══════════════════════════════════════════════════════════════════════════
  // BCP PROACTIVE — Cross-module event integration
  // ═══════════════════════════════════════════════════════════════════════════

  // incident.created → BCP readiness check
  sub('incident.created', 'xhub-incident→bcp-readiness-check', async (e) => {
    const { tenantId, entityId, payload } = e;
    if (!payload?.severity || !['critical', 'high'].includes(payload.severity)) return;
    const schema = tenantSchema(tenantId);

    const plans = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT plan_id, title, status, next_review_date, last_exercise_at
       FROM "${schema}".bcp_plans
       WHERE deleted_at IS NULL AND status IN ('approved','active')
       LIMIT 5`
    ), { operation: 'query bcp_plans' });

    const stalePlans = plans.rows.filter((p: GenericRow) =>
      !p.last_exercise_at || new Date(p.last_exercise_at) < new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    );

    if (stalePlans.length > 0 || plans.rows.length === 0) {
      await enterpriseCreateTask(tenantId, {
        title: `[URGENT] BCP readiness check: ${payload.severity} incident — ${payload.title || entityId}`,
        description: `A ${payload.severity} incident occurred. ${stalePlans.length > 0
          ? `${stalePlans.length} BCP plan(s) have not been exercised in >180 days.`
          : 'No active BCP plans found.'} Verify continuity readiness immediately.`,
        taskType: 'verification', assigneeRole: 'bcp_coordinator', priority: 'critical',
        entityType: 'bcp', entityId: entityId || '', dueInHours: 24,
        triggerSource: 'xhub-incident→bcp-readiness',
      });
    }
  });

  // risk.exceeded_appetite → Flag BCP plans in same domain
  sub('risk.exceeded_appetite', 'xhub-risk→bcp-plan-flag', async (e) => {
    const { tenantId, entityId, payload } = e;
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Review BCP for elevated risk: ${payload.riskName || entityId}`,
      description: `Risk "${payload.riskName}" scored ${payload.riskScore} exceeding appetite ${payload.maxScore}. Review BCP plans covering category "${payload.category}" for adequacy.`,
      taskType: 'verification', assigneeRole: 'bcp_coordinator', priority: 'high',
      entityType: 'bcp', entityId: entityId || '', dueInHours: 72,
      triggerSource: 'xhub-risk→bcp-plan-flag',
    });
  });

  // vendor.contract_expiring → Check BCP dependency nodes
  sub('vendor.contract_expiring', 'xhub-vendor→bcp-dependency-check', async (e) => {
    const { tenantId, entityId, payload } = e;
    const schema = tenantSchema(tenantId);

    const depNodes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT n.node_id, n.node_name, n.criticality, m.title AS map_title
       FROM "${schema}".bcm_dependency_nodes n
       JOIN "${schema}".bcm_dependency_maps m ON m.map_id = n.map_id
       WHERE n.criticality IN ('high','critical') AND m.deleted_at IS NULL
         AND (LOWER(n.node_name) LIKE LOWER($1) OR n.metadata->>'vendor_id' = $2)
       LIMIT 10`,
      [`%${payload.vendorName || ''}%`, entityId || '']
    ), { operation: 'query bcm_dependency_nodes' });

    if (depNodes.rows.length > 0) {
      await enterpriseCreateTask(tenantId, {
        title: `[Auto] BCP dependency at risk: vendor "${payload.vendorName}" contract expiring`,
        description: `Vendor "${payload.vendorName}" contract expires on ${payload.expiryDate}. Found in ${depNodes.rows.length} critical BCP dependency node(s): ${depNodes.rows.map((n: GenericRow) => n.node_name).join(', ')}. Review recovery strategies.`,
        taskType: 'verification', assigneeRole: 'bcp_coordinator', priority: 'high',
        entityType: 'bcp', entityId: entityId || '', dueInHours: 168,
        triggerSource: 'xhub-vendor→bcp-dependency',
      });
    }
  });

  // bcp.rto_rpo_drift → Create risk register entry
  sub('bcp.rto_rpo_drift', 'xhub-bcp-drift→risk-register', async (e) => {
    const { tenantId, entityId, payload } = e;
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Risk: RTO/RPO drift detected — ${payload.strategy || entityId}`,
      description: `Recovery target exceeded by >20%. Target RTO: ${payload.targetRto}h, Actual: ${payload.actualRto}h. Target RPO: ${payload.targetRpo}h, Actual: ${payload.actualRpo}h. Assess operational risk impact.`,
      taskType: 'risk_assessment', assigneeRole: 'risk_owner', priority: 'high',
      entityType: 'risk', entityId: entityId || '', dueInHours: 120,
      triggerSource: 'xhub-bcp-drift→risk-register',
    });
  });

  // incident.resolved → BCP learning analysis
  sub('incident.resolved', 'xhub-incident→bcp-learning', async (e) => {
    const { tenantId, entityId, payload } = e;
    if (!payload?.severity || !['critical', 'high'].includes(payload.severity)) return;
    try {
      const { analyzeIncidentForBCPLearning } = await import('../../../modules/bcp/services/bcm-advanced.service');
      const analysis = await analyzeIncidentForBCPLearning(tenantId, entityId || '');

      if (analysis.gapsIdentified.length > 0) {
        for (const gap of analysis.gapsIdentified) {
          await enterpriseCreateTask(tenantId, {
            title: `[BCP Learning] ${gap.gap}`,
            description: `Post-incident analysis of "${analysis.incidentTitle}" (${analysis.duration}). ${gap.recommendation}`,
            taskType: 'verification', assigneeRole: 'bcp_coordinator',
            priority: gap.severity === 'critical' ? 'critical' : 'high',
            entityType: 'bcp', entityId: entityId || '', dueInHours: 168,
            triggerSource: 'xhub-incident→bcp-learning',
          });
        }

        for (const rec of analysis.exercisesRecommended) {
          await enterpriseCreateTask(tenantId, {
            title: `[BCP Learning] Schedule ${rec.type} exercise: ${rec.focus}`,
            description: `Incident learning recommends a ${rec.type} exercise focused on "${rec.focus}".`,
            taskType: 'verification', assigneeRole: 'bcp_coordinator',
            priority: rec.urgency === 'critical' ? 'critical' : 'high',
            entityType: 'bcp', entityId: entityId || '', dueInHours: 336,
            triggerSource: 'xhub-incident→bcp-exercise-recommendation',
          });
        }

        await safeNotifyAdmins(tenantId, {
          type: 'bcp_incident_learning',
          title: `BCP learning: ${analysis.gapsIdentified.length} gap(s) from incident "${analysis.incidentTitle}"`,
          body: `Incident lasted ${analysis.duration}. BCP ${analysis.bcpActivated ? 'was' : 'was NOT'} activated. ${analysis.gapsIdentified.length} gap(s) identified with ${analysis.exercisesRecommended.length} exercise(s) recommended.`,
          link: '/bcp/overview',
        });
      }
    } catch { /* best effort */ }
  });

  // vendor.onboarded → BCP business change impact assessment
  sub('vendor.onboarded', 'xhub-vendor→bcp-change-impact', async (e) => {
    const { tenantId, entityId, payload } = e;
    try {
      const { assessBusinessChangeImpact } = await import('../../../modules/bcp/services/bcm-advanced.service');
      const impact = await assessBusinessChangeImpact(tenantId, 'vendor_onboarded', {
        entityType: 'vendor', entityId: entityId || '', entityName: payload.vendorName || payload.name || '',
      });

      if (impact.impactLevel !== 'none' && impact.impactLevel !== 'low') {
        await enterpriseCreateTask(tenantId, {
          title: `[BCP Impact] New vendor "${payload.vendorName || payload.name}" — ${impact.impactLevel} impact`,
          description: `Business change detected: new vendor onboarded.\n${impact.recommendations.join('\n')}`,
          taskType: 'verification', assigneeRole: 'bcp_coordinator',
          priority: impact.impactLevel === 'critical' ? 'critical' : 'high',
          entityType: 'bcp', entityId: entityId || '', dueInHours: 168,
          triggerSource: 'xhub-vendor→bcp-change-impact',
        });
      }
    } catch { /* best effort */ }
  });

  // connector.connected → new system deployed, assess BCP impact
  sub('connector.connected', 'xhub-connector→bcp-change-impact', async (e) => {
    const { tenantId, entityId, payload } = e;
    try {
      const { assessBusinessChangeImpact } = await import('../../../modules/bcp/services/bcm-advanced.service');
      const impact = await assessBusinessChangeImpact(tenantId, 'system_deployed', {
        entityType: 'connector', entityId: entityId || '', entityName: payload.connectorName || payload.name || '',
      });

      if (impact.recommendations.length > 0) {
        await enterpriseCreateTask(tenantId, {
          title: `[BCP Impact] New system "${payload.connectorName || payload.name}" connected — assess BCP coverage`,
          description: `New system integration detected.\n${impact.recommendations.join('\n')}`,
          taskType: 'verification', assigneeRole: 'bcp_coordinator',
          priority: 'medium', entityType: 'bcp', entityId: entityId || '', dueInHours: 336,
          triggerSource: 'xhub-connector→bcp-change-impact',
        });
      }
    } catch { /* best effort */ }
  });

  // bcp.maturity_regression → Create audit finding
  sub('bcp.maturity_regression', 'xhub-bcp-maturity→audit-finding', async (e) => {
    const { tenantId, entityId, payload } = e;
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Audit finding: BCP maturity regression (${payload.previousScore} → ${payload.currentScore})`,
      description: `BCM maturity score dropped from ${payload.previousScore} to ${payload.currentScore} (delta: ${payload.drop}). Investigate root cause and remediate. This may impact ISO 22301 certification readiness.`,
      taskType: 'audit_response', assigneeRole: 'audit_manager', priority: 'high',
      entityType: 'audit_finding', entityId: entityId || '', dueInHours: 168,
      triggerSource: 'xhub-bcp-maturity→audit-finding',
    });

    await safeNotifyAdmins(tenantId, {
      type: 'bcp_maturity_regression',
      title: 'BCP Maturity Regression Detected',
      body: `BCM maturity dropped from ${payload.previousScore} to ${payload.currentScore}. Review the BCP maturity assessment and address gaps.`,
      link: '/bcp/maturity',
    });
  });
}

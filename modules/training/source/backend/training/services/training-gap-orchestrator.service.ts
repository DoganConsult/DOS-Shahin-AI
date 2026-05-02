import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { recordAudit as _recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import Fuse from 'fuse.js';
import prom from 'prom-client';

const trainingCoverageGauge = new prom.Gauge({
  name: 'shahin_training_coverage_pct',
  help: 'Training coverage percentage per tenant',
  labelNames: ['tenant_id'],
});

const trainingGapGauge = new prom.Gauge({
  name: 'shahin_training_gap_count',
  help: 'Number of identified training gaps',
  labelNames: ['tenant_id'],
});

export interface TrainingGapAnalysis {
  tenantId: string;
  totalRoles: number;
  coveredRoles: number;
  coveragePct: number;
  gaps: Array<{
    gapType: string;
    sourceModule: string;
    description: string;
    priority: string;
    suggestedCourses: string[];
  }>;
  tasksCreated: number;
}

export async function analyzeTrainingGaps(tenantId: string): Promise<TrainingGapAnalysis> {
  const schema = tenantSchema(tenantId);
  const gaps: TrainingGapAnalysis['gaps'] = [];
  let tasksCreated = 0;

  try {
    const incidentLessons = await safeQuery(
      `SELECT i.incident_id, i.title, i.category, i.severity, i.lessons_learned
       FROM "${schema}".incidents i
       WHERE i.deleted_at IS NULL AND i.lessons_learned IS NOT NULL
         AND i.lessons_learned != '' AND i.status IN ('resolved', 'closed')
         AND i.resolved_at > NOW() - INTERVAL '90 days'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".training_incident_links til WHERE til.incident_id = i.incident_id
         )`,
    );

    for (const incident of incidentLessons.rows) {
      gaps.push({
        gapType: 'incident_lesson_not_trained',
        sourceModule: 'incident',
        description: `Incident "${incident.title}" (${incident.severity}) has lessons learned but no linked training.`,
        priority: incident.severity === 'critical' ? 'critical' : 'high',
        suggestedCourses: [`Incident response: ${incident.category || 'general'}`, 'Lessons learned review'],
      });
    }

    const recentPolicies = await safeQuery(
      `SELECT p.policy_id, p.title, p.approved_at
       FROM "${schema}".policies p
       WHERE p.deleted_at IS NULL AND p.status = 'approved'
         AND p.approved_at > NOW() - INTERVAL '60 days'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".training_policy_links tpl WHERE tpl.policy_id = p.policy_id
         )`,
    );

    for (const policy of recentPolicies.rows) {
      gaps.push({
        gapType: 'policy_updated_no_training',
        sourceModule: 'policy',
        description: `Policy "${policy.title}" recently approved but no training material linked.`,
        priority: 'medium',
        suggestedCourses: [`Policy awareness: ${policy.title}`],
      });
    }

    const failedControls = await safeQuery(
      `SELECT c.control_id, c.title, c.effectiveness_score
       FROM "${schema}".controls c
       WHERE c.deleted_at IS NULL AND c.effectiveness_score < 40
         AND c.status = 'active'
       LIMIT 20`,
    );

    for (const ctrl of failedControls.rows) {
      gaps.push({
        gapType: 'weak_control_needs_training',
        sourceModule: 'compliance',
        description: `Control "${ctrl.title}" effectiveness at ${ctrl.effectiveness_score}%. Staff training may improve execution.`,
        priority: 'high',
        suggestedCourses: ['Control execution training', `${ctrl.title} operational guide`],
      });
    }

    const existingCourses = await safeQuery(
      `SELECT course_id, title, description, category FROM "${schema}".training_courses
       WHERE deleted_at IS NULL AND status = 'active'`,
    );

    if (existingCourses.rows.length > 0 && gaps.length > 0) {
      const fuse = new Fuse(existingCourses.rows as Record<string, unknown>[][], {
        keys: ['title', 'description', 'category'],
        threshold: 0.5,
        includeScore: true,
      });

      for (const gap of gaps) {
        const searchText = gap.description;
        const matches = fuse.search(searchText).slice(0, 3);
        if (matches.length > 0) {
          gap.suggestedCourses = matches.map(m => (m.item as any).title);
        }
      }
    }

    const roles = await safeQuery(
      `SELECT COUNT(DISTINCT role_code)::int AS total_roles,
              COUNT(DISTINCT role_code) FILTER (
                WHERE role_code IN (SELECT DISTINCT role_code FROM "${schema}".training_assignments WHERE status = 'completed')
              )::int AS covered_roles
       FROM "${schema}".user_roles`,
    );
    const roleData = getFirstRow(roles) ?? { total_roles: 0, covered_roles: 0 };
    const coveragePct = roleData.total_roles > 0 ? Math.round((roleData.covered_roles / roleData.total_roles) * 100) : 0;

    trainingCoverageGauge.set({ tenant_id: tenantId }, coveragePct);
    trainingGapGauge.set({ tenant_id: tenantId }, gaps.length);

    const criticalGaps = gaps.filter(g => g.priority === 'critical' || g.priority === 'high');
    if (criticalGaps.length > 0) {
      await createProcessTask(tenantId, {
        title: `Training gaps detected: ${criticalGaps.length} high-priority gap(s)`,
        description: `${gaps.length} training gaps identified across ${new Set(gaps.map(g => g.sourceModule)).size} modules. ${criticalGaps.length} require immediate attention.`,
        taskType: 'training_review',
        priority: criticalGaps.some(g => g.priority === 'critical') ? 'critical' : 'high',
        entityType: 'training',
        entityId: tenantId,
        triggerSource: 'training.gap_analysis',
      });
      tasksCreated++;
    }

    return {
      tenantId,
      totalRoles: roleData.total_roles,
      coveredRoles: roleData.covered_roles,
      coveragePct,
      gaps,
      tasksCreated,
    };
  } catch (err) {
    logger.error(`[TrainingGapOrchestrator] analysis failed: ${(err as Error).message}`);
    return { tenantId, totalRoles: 0, coveredRoles: 0, coveragePct: 0, gaps: [], tasksCreated: 0 };
  }
}

export function registerTrainingGapSubscribers(): void {
  eventBus.subscribe('incident.resolved' as any, 'training-gap:incident-lesson', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const hasLessons = event.payload?.lessonsLearned as string;
    if (hasLessons) {
      await createProcessTask(event.tenantId, {
        title: 'Training: Incident resolved with lessons — update training materials',
        description: `Incident resolved with lessons learned. Review and create training content.`,
        taskType: 'training_content_review',
        priority: 'medium',
        entityType: 'incident',
        entityId: event.entityId || '',
        triggerSource: 'incident.resolved',
      });
    }
  });

  eventBus.subscribe('compliance.posture_critical' as any, 'training-gap:posture-critical', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    await analyzeTrainingGaps(event.tenantId);
  });

  eventBus.subscribe('policy.approved' as any, 'training-gap:policy-approved', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const policyId = event.payload?.entityId as string || event.entityId;
    const title = event.payload?.title as string || 'Policy';
    await createProcessTask(event.tenantId, {
      title: `Training update: Policy "${title}" approved`,
      description: `New/updated policy approved. Review and update training curricula.`,
      taskType: 'training_content_review',
      priority: 'medium',
      entityType: 'policy',
      entityId: policyId || '',
      triggerSource: 'policy.approved',
    });
  });

  logger.info('[TrainingGapOrchestrator] subscribers registered');
}

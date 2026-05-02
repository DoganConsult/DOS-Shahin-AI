// @ts-nocheck — module-layer imports not yet extracted
import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Cross-Hub: RACI AUTO-ASSIGNMENT + CASCADE + ADVANCED RACI HUBS
// Subscribers: risk.created (raci), control.implemented (raci),
//   evidence.uploaded (raci), team.created (raci seed),
//   team.member_removed (raci cascade), admin.user_deactivated (raci cascade),
//   crosshub.cascade_triggered, incident.created (raci),
//   bcp.plan_created (raci), vendor.onboarded (raci)
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
  safeNotifyAdmins, safePublish,
  recordAudit,
} from './helpers';
import { getFirstRow } from '@dos/db';

export function registerRaciHub(sub: SubFn): void {

  // ═══════════════════════════════════════════════════════════════════════════
  // 21. RACI AUTO-ASSIGNMENT HUB → ownership enforcement
  // ═══════════════════════════════════════════════════════════════════════════

  sub('risk.created', 'xhub-risk→raci-auto-assign', async (e) => {
    const { tenantId, entityId, payload } = e;
    const schema = tenantSchema(tenantId);
    try {
      const existing = await safeQuery(
        `SELECT 1 FROM "${schema}".grc_raci_assignments
         WHERE entity_type = 'risk' AND entity_id = $1 AND is_active = TRUE AND deleted_at IS NULL LIMIT 1`,
        [entityId || '']
      );
      if (existing.rows.length > 0) return;

      const dist = await safeQuery(
        `SELECT DISTINCT team_code, raci_role FROM "${schema}".risk_team_distribution LIMIT 5`
      );
      for (const row of dist.rows) {
        const team = await safeQuery(
          `SELECT team_id FROM "${schema}".teams WHERE team_code = $1 LIMIT 1`, [row.team_code]
        );
        if (getFirstRow(team)) {
          await safeQuery(
            `INSERT INTO "${schema}".grc_raci_assignments
               (entity_type, entity_id, team_id, raci_role, assignment_source)
             VALUES ('risk', $1, $2, $3, 'auto_provision')
             ON CONFLICT DO NOTHING`,
            [entityId || '', getFirstRow(team)?.team_id, row.raci_role]
          );
        }
      }
      await safePublish({
        eventType: 'raci.auto_assigned', tenantId,
        sourceService: 'cross-hub-integration', severity: 'info',
        entityType: 'risk', entityId: entityId || '',
        payload: { reason: 'risk_created_auto_raci', distributionRows: dist.rows.length },
      });
    } catch { /* best effort */ }
  });

  sub('control.implemented', 'xhub-control→raci-auto-assign', async (e) => {
    const { tenantId, entityId } = e;
    const schema = tenantSchema(tenantId);
    try {
      const existing = await safeQuery(
        `SELECT 1 FROM "${schema}".grc_raci_assignments
         WHERE entity_type = 'control' AND entity_id = $1 AND is_active = TRUE AND deleted_at IS NULL LIMIT 1`,
        [entityId || '']
      );
      if (existing.rows.length > 0) return;

      const dist = await safeQuery(
        `SELECT DISTINCT team_code, raci_role FROM "${schema}".control_team_distribution LIMIT 5`
      );
      for (const row of dist.rows) {
        const team = await safeQuery(
          `SELECT team_id FROM "${schema}".teams WHERE team_code = $1 LIMIT 1`, [row.team_code]
        );
        if (getFirstRow(team)) {
          await safeQuery(
            `INSERT INTO "${schema}".grc_raci_assignments
               (entity_type, entity_id, team_id, raci_role, assignment_source)
             VALUES ('control', $1, $2, $3, 'auto_provision')
             ON CONFLICT DO NOTHING`,
            [entityId || '', getFirstRow(team)?.team_id, row.raci_role]
          );
        }
      }
      await safePublish({
        eventType: 'raci.auto_assigned', tenantId,
        sourceService: 'cross-hub-integration', severity: 'info',
        entityType: 'control', entityId: entityId || '',
        payload: { reason: 'control_created_auto_raci' },
      });
    } catch { /* best effort */ }
  });

  sub('evidence.uploaded', 'xhub-evidence→raci-auto-assign', async (e) => {
    const { tenantId, entityId } = e;
    const schema = tenantSchema(tenantId);
    try {
      const existing = await safeQuery(
        `SELECT 1 FROM "${schema}".grc_raci_assignments
         WHERE entity_type = 'evidence' AND entity_id = $1 AND is_active = TRUE AND deleted_at IS NULL LIMIT 1`,
        [entityId || '']
      );
      if (existing.rows.length > 0) return;

      const dist = await safeQuery(
        `SELECT DISTINCT team_code, raci_role FROM "${schema}".evidence_team_distribution LIMIT 5`
      );
      for (const row of dist.rows) {
        const team = await safeQuery(
          `SELECT team_id FROM "${schema}".teams WHERE team_code = $1 LIMIT 1`, [row.team_code]
        );
        if (getFirstRow(team)) {
          await safeQuery(
            `INSERT INTO "${schema}".grc_raci_assignments
               (entity_type, entity_id, team_id, raci_role, assignment_source)
             VALUES ('evidence', $1, $2, $3, 'auto_provision')
             ON CONFLICT DO NOTHING`,
            [entityId || '', getFirstRow(team)?.team_id, row.raci_role]
          );
        }
      }
      await safePublish({
        eventType: 'raci.auto_assigned', tenantId,
        sourceService: 'cross-hub-integration', severity: 'info',
        entityType: 'evidence', entityId: entityId || '',
        payload: { reason: 'evidence_uploaded_auto_raci' },
      });
    } catch { /* best effort */ }
  });

  sub('team.created', 'xhub-team→raci-auto-seed', async (e) => {
    const { tenantId } = e;
    try {
      const { seedRaciFromDistribution } = await import('../../../modules/platform/services/workspace/workspace-seed.service');
      const result = await seedRaciFromDistribution(tenantId);
      if (result.controlsSeeded + result.risksSeeded + result.evidenceSeeded > 0) {
        await safePublish({
          eventType: 'raci.auto_assigned', tenantId,
          sourceService: 'cross-hub-integration', severity: 'info',
          payload: {
            reason: 'workspace_raci_auto_seed',
            controlsSeeded: result.controlsSeeded,
            risksSeeded: result.risksSeeded,
            evidenceSeeded: result.evidenceSeeded,
          },
        });
      }
    } catch { /* best effort */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 22. RACI CASCADE ON USER/TEAM REMOVAL
  // ═══════════════════════════════════════════════════════════════════════════

  sub('team.member_removed', 'xhub-team→raci-cascade-cleanup', async (e) => {
    const { tenantId, entityId, payload } = e;
    const schema = tenantSchema(tenantId);
    const userId = payload.userId || entityId || '';
    try {
      const deactivated = await safeQuery(
        `UPDATE "${schema}".grc_raci_assignments
         SET is_active = FALSE, deleted_at = NOW(), updated_at = NOW()
         WHERE user_id = $1 AND is_active = TRUE AND deleted_at IS NULL
         RETURNING entity_type, entity_id, raci_role`,
        [userId]
      );

      await safeQuery(
        `UPDATE "${schema}".control_owners SET deleted_at = NOW()
         WHERE user_id = $1 AND deleted_at IS NULL`, [userId]
      );
      await safeQuery(
        `UPDATE "${schema}".risk_owners SET deleted_at = NOW()
         WHERE user_id = $1 AND deleted_at IS NULL`, [userId]
      );
      await safeQuery(
        `UPDATE "${schema}".evidence_owners SET deleted_at = NOW()
         WHERE user_id = $1 AND deleted_at IS NULL`, [userId]
      );

      if (deactivated.rows.length > 0) {
        await safePublish({
          eventType: 'raci.cascade_triggered', tenantId,
          sourceService: 'cross-hub-integration', severity: 'warning',
          entityType: 'user', entityId: userId,
          payload: {
            reason: 'member_removed',
            orphanedAssignments: deactivated.rows.length,
            affectedEntities: deactivated.rows.slice(0, 10),
          },
        });

        await safeNotifyAdmins(tenantId, {
          type: 'raci_cascade',
          title: `[RACI] ${deactivated.rows.length} ownership assignments orphaned`,
          body: `User ${userId} was removed. ${deactivated.rows.length} RACI assignments deactivated. Review and reassign.`,
          link: '/grc-raci/gaps',
        });
      }
    } catch { /* best effort */ }
  });

  sub('admin.user_deactivated', 'xhub-admin→raci-cascade-deactivate', async (e) => {
    const { tenantId, payload } = e;
    const schema = tenantSchema(tenantId);
    const userId = payload.userId || '';
    try {
      const deactivated = await safeQuery(
        `UPDATE "${schema}".grc_raci_assignments
         SET is_active = FALSE, deleted_at = NOW(), updated_at = NOW()
         WHERE user_id = $1 AND is_active = TRUE AND deleted_at IS NULL
         RETURNING entity_type, entity_id`,
        [userId]
      );

      await safeQuery(
        `UPDATE "${schema}".control_owners SET deleted_at = NOW() WHERE user_id = $1 AND deleted_at IS NULL`, [userId]
      );
      await safeQuery(
        `UPDATE "${schema}".risk_owners SET deleted_at = NOW() WHERE user_id = $1 AND deleted_at IS NULL`, [userId]
      );
      await safeQuery(
        `UPDATE "${schema}".evidence_owners SET deleted_at = NOW() WHERE user_id = $1 AND deleted_at IS NULL`, [userId]
      );

      if (deactivated.rows.length > 0) {
        await safePublish({
          eventType: 'raci.cascade_triggered', tenantId,
          sourceService: 'cross-hub-integration', severity: 'warning',
          entityType: 'user', entityId: userId,
          payload: { reason: 'user_deactivated', orphanedAssignments: deactivated.rows.length },
        });

        await safeNotifyAdmins(tenantId, {
          type: 'raci_cascade',
          title: `[RACI] User deactivated — ${deactivated.rows.length} assignments orphaned`,
          body: `Deactivated user ${userId} had ${deactivated.rows.length} RACI assignments. These have been deactivated. Reassignment required.`,
          link: '/grc-raci/gaps',
        });
      }
    } catch { /* best effort */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 23. CROSS-HUB CASCADE (meta-event for chain reactions)
  // ═══════════════════════════════════════════════════════════════════════════

  // crosshub.cascade_triggered → log cascade for transparency
  sub('crosshub.cascade_triggered', 'xhub-cascade-logger', async (e) => {
    await recordAudit({
      tenantId: e.tenantId, userId: 'agrc-os',
      module: 'cross_hub', action: 'create',
      entityType: 'cascade', entityId: e.entityId || 'system',
      afterState: { sourceEvent: e.payload.sourceEvent, cascadeDepth: e.payload.depth || 1 },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 24. INCIDENT ADVANCED — RACI auto-assign on incident creation
  // ═══════════════════════════════════════════════════════════════════════════

  sub('incident.created', 'xhub-incident→raci-auto-assign', async (e) => {
    const { tenantId, entityId } = e;
    const schema = tenantSchema(tenantId);
    try {
      const existing = await safeQuery(
        `SELECT 1 FROM "${schema}".grc_raci_assignments
         WHERE entity_type = 'incident' AND entity_id = $1 AND is_active = TRUE AND deleted_at IS NULL LIMIT 1`,
        [entityId || '']
      );
      if (existing.rows.length > 0) return;
      const dist = await safeQuery(
        `SELECT DISTINCT team_code, raci_role FROM "${schema}".incident_team_distribution WHERE raci_role IN ('responsible','accountable') AND is_active = TRUE LIMIT 3`
      );
      for (const row of dist.rows) {
        const team = await safeQuery(`SELECT team_id FROM "${schema}".teams WHERE team_code = $1 LIMIT 1`, [row.team_code]);
        if (getFirstRow(team)) {
          await safeQuery(
            `INSERT INTO "${schema}".grc_raci_assignments (entity_type, entity_id, team_id, raci_role, assignment_source)
             VALUES ('incident', $1, $2, $3, 'auto_provision') ON CONFLICT DO NOTHING`,
            [entityId || '', getFirstRow(team)?.team_id, row.raci_role]
          );
        }
      }
      await safePublish({ eventType: 'raci.auto_assigned', tenantId, sourceService: 'cross-hub-integration', severity: 'info', entityType: 'incident', entityId: entityId || '', payload: { reason: 'incident_created_auto_raci' } });
    } catch { /* best effort */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 25. BCP ADVANCED — RACI auto-assign on plan creation
  // ═══════════════════════════════════════════════════════════════════════════

  sub('bcp.plan_created', 'xhub-bcp→raci-auto-assign', async (e) => {
    const { tenantId, entityId } = e;
    const schema = tenantSchema(tenantId);
    try {
      const existing = await safeQuery(
        `SELECT 1 FROM "${schema}".grc_raci_assignments
         WHERE entity_type = 'bcp_plan' AND entity_id = $1 AND is_active = TRUE AND deleted_at IS NULL LIMIT 1`,
        [entityId || '']
      );
      if (existing.rows.length > 0) return;
      const dist = await safeQuery(
        `SELECT DISTINCT team_code, raci_role FROM "${schema}".bcp_team_distribution WHERE raci_role IN ('responsible','accountable') AND is_active = TRUE LIMIT 3`
      );
      for (const row of dist.rows) {
        const team = await safeQuery(`SELECT team_id FROM "${schema}".teams WHERE team_code = $1 LIMIT 1`, [row.team_code]);
        if (getFirstRow(team)) {
          await safeQuery(
            `INSERT INTO "${schema}".grc_raci_assignments (entity_type, entity_id, team_id, raci_role, assignment_source)
             VALUES ('bcp_plan', $1, $2, $3, 'auto_provision') ON CONFLICT DO NOTHING`,
            [entityId || '', getFirstRow(team)?.team_id, row.raci_role]
          );
        }
      }
      await safePublish({ eventType: 'raci.auto_assigned', tenantId, sourceService: 'cross-hub-integration', severity: 'info', entityType: 'bcp_plan', entityId: entityId || '', payload: { reason: 'bcp_plan_created_auto_raci' } });
    } catch { /* best effort */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 26. VENDOR ADVANCED — RACI auto-assign on vendor onboarding
  // ═══════════════════════════════════════════════════════════════════════════

  sub('vendor.onboarded', 'xhub-vendor→raci-auto-assign', async (e) => {
    const { tenantId, entityId } = e;
    const schema = tenantSchema(tenantId);
    try {
      const existing = await safeQuery(
        `SELECT 1 FROM "${schema}".grc_raci_assignments
         WHERE entity_type = 'vendor' AND entity_id = $1 AND is_active = TRUE AND deleted_at IS NULL LIMIT 1`,
        [entityId || '']
      );
      if (existing.rows.length > 0) return;
      const dist = await safeQuery(
        `SELECT DISTINCT team_code, raci_role FROM "${schema}".vendor_team_distribution WHERE raci_role IN ('responsible','accountable') AND is_active = TRUE LIMIT 3`
      );
      for (const row of dist.rows) {
        const team = await safeQuery(`SELECT team_id FROM "${schema}".teams WHERE team_code = $1 LIMIT 1`, [row.team_code]);
        if (getFirstRow(team)) {
          await safeQuery(
            `INSERT INTO "${schema}".grc_raci_assignments (entity_type, entity_id, team_id, raci_role, assignment_source)
             VALUES ('vendor', $1, $2, $3, 'auto_provision') ON CONFLICT DO NOTHING`,
            [entityId || '', getFirstRow(team)?.team_id, row.raci_role]
          );
        }
      }
      await safePublish({ eventType: 'raci.auto_assigned', tenantId, sourceService: 'cross-hub-integration', severity: 'info', entityType: 'vendor', entityId: entityId || '', payload: { reason: 'vendor_onboarded_auto_raci' } });
    } catch { /* best effort */ }
  });
}

import { catchHandler, EC } from '@dos/platform-core/resilience';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getIncidentSlaConfig, DEFAULT_SLA_HOURS } from './incident-sla-config.service';
import { logger } from '../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

interface FollowUpResult {
  escalated: number;
  notified: number;
  boardFlagged: number;
}

export async function autoEscalateOverdueIncidents(tenantId: string): Promise<FollowUpResult> {
  const schema = tenantSchema(tenantId);
  const result: FollowUpResult = { escalated: 0, notified: 0, boardFlagged: 0 };
  const slaConfig = await getIncidentSlaConfig(tenantId);

  try {
    const c = slaConfig.critical || 4;
    const h = slaConfig.high || 24;
    const m = slaConfig.medium || 72;
    const l = slaConfig.low || 168;
    // secrets-scan-allow: schema tenantSchema()-validated; deadline threshold from typed config
    const overdue = await safeQuery(`
      SELECT i.*,
        EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 3600 AS hours_elapsed
      FROM "${schema}".incidents i
      WHERE i.deleted_at IS NULL
        AND i.status NOT IN ('resolved', 'closed')
        AND (
          (i.severity = 'critical' AND i.created_at < NOW() - INTERVAL '${c} hours')
          OR (i.severity = 'high' AND i.created_at < NOW() - INTERVAL '${h} hours')
          OR (i.severity = 'medium' AND i.created_at < NOW() - INTERVAL '${m} hours')
          OR (i.severity = 'low' AND i.created_at < NOW() - INTERVAL '${l} hours')
        )
    `);

    for (const inc of overdue.rows) {
      const hoursElapsed = parseFloat(inc.hours_elapsed) || 0;
      const slaHours = slaConfig[inc.severity] || 72;
      const breachMultiple = hoursElapsed / slaHours;
      const id = inc.incident_id;

      if (inc.escalation_state === 'escalated' && breachMultiple < 3) continue;

      let shouldEscalate = false;
      let boardAttention = false;
      let newPriority = inc.severity;

      if (breachMultiple >= 1) shouldEscalate = true;
      if (breachMultiple >= 3) boardAttention = true;

      if (inc.severity === 'medium' && breachMultiple >= 2) newPriority = 'high';
      if (inc.severity === 'low' && breachMultiple >= 2) newPriority = 'medium';
      if (breachMultiple >= 3 && newPriority !== 'critical') newPriority = 'critical';

      if (shouldEscalate) {
        await safeQuery(`
          UPDATE "${schema}".incidents
          SET escalation_state = 'escalated',
              board_attention = CASE WHEN $2::boolean THEN TRUE ELSE COALESCE(board_attention, FALSE) END,
              updated_at = NOW()
          WHERE incident_id = $1
        `, [id, boardAttention]);
        result.escalated++;
        if (boardAttention) result.boardFlagged++;

        try {

          const { eventBus: eb } = await import('../../../platform/services/event/event-bus.service.js');
          await eb.publish(({
                      eventType: 'incident.escalated',
                      tenantId,
                      sourceService: 'incident-followup',
                      entityType: 'incident',
                      entityId: id,
                      severity: newPriority === 'critical' ? 'critical' : 'warning',
                      payload: {
                        incidentId: id,
                        severity: newPriority,
                        previousSeverity: inc.severity,
                        boardAttention,
                        breachMultiple: Math.round(breachMultiple * 10) / 10,
                        userId: inc.owner_user_id || inc.assigned_to || SYSTEM_JOB_ACTOR,
                      },
                    } as any));
        } catch { /* best effort */ }

        try {
          const { escalateIncidentToGovernanceBody } = await import('../../../governance/services/governance/governance-hooks.service.js');
          await escalateIncidentToGovernanceBody(tenantId, id, newPriority);
        } catch { /* best effort */ }

        const owner = inc.owner_user_id || inc.assigned_to || inc.reported_by;
        if (owner) {
          await safeQuery(`
            INSERT INTO "${schema}".notifications (user_id, type, title, body, link, read, created_at)
            SELECT $1, 'incident_sla_breach', $2, $3, $4, FALSE, NOW()
            WHERE NOT EXISTS (
              SELECT 1 FROM "${schema}".notifications n
              WHERE n.user_id = $1 AND n.type = 'incident_sla_breach' AND n.link = $4
                AND n.created_at > NOW() - INTERVAL '4 hours'
            )
          `, [
            owner,
            `SLA Breach: ${inc.title || 'Incident'}`,
            `Incident "${inc.title || id}" has breached SLA (${Math.round(hoursElapsed)}h elapsed, SLA: ${slaHours}h). Auto-escalated.`,
            `/incidents/${id}`,
          ]).catch(catchHandler(EC.EVENT_BUS, {}));
          result.notified++;
        }
      }
    }

    if (result.escalated > 0) {
      try {

        const { eventBus } = await import('../../../platform/services/event/event-bus.service.js');
        eventBus.publish({
          eventType: 'incident.sla_breaches_escalated' as any,
          tenantId,
          entityId: '',
          severity: 'warning',
          payload: { escalated: result.escalated, boardFlagged: result.boardFlagged },
        });
      } catch (err: unknown) {
        logger.warn('[IncidentFollowup] Failed to publish escalation event', { 
          tenantId, 
          error: toErrorMessage(err) 
        });
      }
    }
  } catch (err: unknown) {
    logger.error('[IncidentFollowup] Failed to auto-escalate overdue incidents', { 
      tenantId, 
      error: toErrorMessage(err) 
    });
  }

  return result;
}

export { DEFAULT_SLA_HOURS as SLA_HOURS };

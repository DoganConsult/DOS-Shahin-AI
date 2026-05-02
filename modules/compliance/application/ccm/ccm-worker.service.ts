import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Continuous Control Monitoring Worker
// AGRC-OS: Background job that continuously
// re-evaluates controls, detects staleness,
// triggers escalations, and recalculates risk.
// Registered with job-scheduler at 10-min interval.
// ============================================

import { emptyResult, query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { checkStaleness } from './control-lifecycle.service';
import { checkEscalations } from '../../ports/platform.port';
import { createNotification } from '../../../notification/services/notification.service';
import type { CCMCycleResult } from '@dos/types';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

// ── Configuration ──────────────────────────────────────────────────────────

const STALENESS_THRESHOLD_DAYS: Record<string, number> = {
  design: 30,
  implementation: 60,
  testing: 14,
  issues: 21,
  remediation: 30,
  retest: 14,
  effective: 90,       // re-test cadence
  exception_active: 30,
};

// ── CCM Cycle (runs per tenant) ────────────────────────────────────────────

export async function runCCMCycle(tenantId: string): Promise<CCMCycleResult> {
  const startTime = Date.now();
  const schema = tenantSchema(tenantId);

  let controlsEvaluated = 0;
  let staleControls = 0;
  let escalationsTriggered = 0;

  try {
    let controlFlags: Record<string, boolean> | null = null;
    try {
      const tenantResult = await safeQuery(
        `SELECT settings FROM tenants WHERE tenant_id = $1`, [tenantId]
      );
      if (getFirstRow(tenantResult)?.settings?.profileResolution?.controlFlags) {
        controlFlags = getFirstRow(tenantResult)?.settings.profileResolution.controlFlags;
      }
    } catch { /* non-fatal */ }

    const controlsResult = await safeQuery(
      `SELECT control_id, lifecycle_state, title, owner, category,
              EXTRACT(EPOCH FROM (NOW() - COALESCE(updated_at, created_at))) / 86400 AS days_in_state
       FROM "${schema}".ucf_controls`
    );

    const CONTROL_FLAG_CATEGORIES: Record<string, string[]> = {
      cloudControls: ['cloud', 'ccc', 'cloud_security', 'saas', 'iaas', 'paas'],
      otScadaControls: ['ot', 'scada', 'ics', 'otcc', 'operational_technology'],
      iotControls: ['iot', 'connected_devices', 'smart_devices'],
      aiGovControls: ['ai', 'ml', 'ai_governance', 'artificial_intelligence'],
      pciControls: ['pci', 'pci_dss', 'payment_card', 'cardholder'],
      crossBorderControls: ['cross_border', 'data_transfer', 'cbdt', 'international'],
      criticalInfraControls: ['critical_infrastructure', 'cii', 'national_security'],
      privacyControls: ['privacy', 'pdpl', 'personal_data', 'data_protection', 'consent'],
      boardReportingControls: ['board', 'board_reporting', 'executive_reporting'],
      thirdPartyControls: ['third_party', 'vendor', 'supplier', 'outsourcing'],
    };

    let controls = controlsResult.rows;
    if (controlFlags) {
      controls = controls.filter(ctrl => {
        if (!ctrl.category) return true;
        const cat = (ctrl.category || '').toLowerCase();
        for (const [flagKey, categories] of Object.entries(CONTROL_FLAG_CATEGORIES)) {
          if (controlFlags![flagKey] === false && categories.some(c => cat.includes(c))) {
            return false;
          }
        }
        return true;
      });
    }

    controlsEvaluated = controls.length;

    // 2. Batch staleness check — no N+1 queries
    for (const ctrl of controls) {
      const maxDays = STALENESS_THRESHOLD_DAYS[ctrl.lifecycle_state] || 60;
      const daysInState = parseFloat(ctrl.days_in_state) || 0;

      if (daysInState > maxDays) {
        staleControls++;

        // Also call checkStaleness to update the control's stale flag in DB
        try {
          await checkStaleness(tenantId, ctrl.control_id, maxDays);
        } catch { /* best effort */ }

        try {
          const { createGovernanceActionFromControlFailure } = await import('../../../governance/services/governance/governance-hooks.service.js');
          await createGovernanceActionFromControlFailure(tenantId, ctrl.control_id, daysInState > maxDays * 2 ? 'critical' : 'high');
        } catch { /* best effort */ }

        if (ctrl.owner) {
          await createNotification(tenantId, {
            userId: ctrl.owner,
            type: 'ccm_stale_control',
            title: `Stale control detected: ${ctrl.title || ctrl.control_id}`,
            body: `Control "${ctrl.control_id}" has been in "${ctrl.lifecycle_state}" state for over ${maxDays} days (${Math.round(daysInState)} days).`,
            link: `/lifecycle/${ctrl.control_id}`,
          }).catch(catchHandler(EC.EVENT_BUS, {}));
        }
      }
    }

    // 3. Run escalation checks
    try {
      const escalations = await checkEscalations(tenantId);
      escalationsTriggered = escalations.length;
    } catch {
      // Escalation check failure — non-fatal
    }

    // 4. CCM → Risk score auto-elevation (stale controls elevate linked risk scores)
    let riskRecalculated = false;
    if (staleControls > 0) {
      try {
        await elevateRiskScoresForStaleControls(tenantId, schema);
        riskRecalculated = true;
      } catch { /* non-fatal */ }
    }
    if (!riskRecalculated) {
      try {
        const { getRiskPosture } = await import('../../../risk/services/scoring/risk-scoring.service.js');
        await getRiskPosture(tenantId);
        riskRecalculated = true;
      } catch { /* non-fatal */ }
    }

    const cycleMs = Date.now() - startTime;

    // 5. Log CCM cycle result
    await logCCMCycle(schema, {
      controlsEvaluated,
      staleControls,
      escalationsTriggered,
      riskRecalculated,
      cycleMs,
    });

    return {
      tenantId,
      controlsEvaluated,
      staleControls,
      escalationsTriggered,
      riskRecalculated,
      cycleMs,
      completedAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    logger.error(`[CCM] Cycle failed for tenant ${tenantId}: ${toErrorMessage(err)}`);
    return {
      tenantId,
      controlsEvaluated,
      staleControls,
      escalationsTriggered,
      riskRecalculated: false,
      cycleMs: Date.now() - startTime,
      completedAt: new Date().toISOString(),
    };
  }
}

// ── CCM → Risk score auto-elevation ────────────────────────────────────────

async function elevateRiskScoresForStaleControls(tenantId: string, schema: string): Promise<void> {
  const staleRes = await safeQuery(
    `SELECT control_id FROM "${schema}".ucf_controls
     WHERE lifecycle_state NOT IN ('effective') AND
           EXTRACT(EPOCH FROM (NOW() - COALESCE(updated_at, created_at))) / 86400 > 30`,
  );
  if (!staleRes.rows.length) return;

  const staleControlIds: string[] = staleRes.rows.map((r: GenericRow) => r.control_id);

  const linkedRisksRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT DISTINCT r.risk_id, r.likelihood, r.impact
     FROM "${schema}".risks r
     JOIN "${schema}".risk_controls rc ON rc.risk_id = r.risk_id
     WHERE rc.control_id = ANY($1::text[])
       AND r.status NOT IN ('closed','accepted')`,
    [staleControlIds],
  ), { tenantId: tenantId, operation: 'query risks' });

  for (const risk of linkedRisksRes.rows) {
    const newLikelihood = Math.min(5, (Number(risk.likelihood) || 3) + 1);
    await safeQuery(
      `UPDATE "${schema}".risks
       SET likelihood = $1,
           updated_at = NOW(),
           notes = COALESCE(notes, '') || E'\n[CCM Auto-Elevation] Likelihood elevated due to stale linked controls at ' || NOW()
       WHERE risk_id = $2 AND likelihood < $1`,
      [newLikelihood, risk.risk_id],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }
}

// ── CCM cycle log ──────────────────────────────────────────────────────────

async function logCCMCycle(
  schema: string,
  data: {
    controlsEvaluated: number;
    staleControls: number;
    escalationsTriggered: number;
    riskRecalculated: boolean;
    cycleMs: number;
  }
): Promise<void> {
  try {
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS "${schema}".ccm_cycle_log (
        cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        controls_evaluated INT NOT NULL,
        stale_controls INT NOT NULL DEFAULT 0,
        escalations_triggered INT NOT NULL DEFAULT 0,
        risk_recalculated BOOLEAN DEFAULT FALSE,
        cycle_ms INT NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await safeQuery(
      `INSERT INTO "${schema}".ccm_cycle_log
         (controls_evaluated, stale_controls, escalations_triggered, risk_recalculated, cycle_ms)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.controlsEvaluated, data.staleControls, data.escalationsTriggered, data.riskRecalculated, data.cycleMs]
    );
  } catch {
    // Logging is best-effort
  }
}

// ── Get CCM history ────────────────────────────────────────────────────────

export async function getCCMHistory(
  tenantId: string,
  limit: number = 50
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".ccm_cycle_log ORDER BY executed_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch {
    return [];
  }
}

import { catchHandler, EC } from '@dos/platform-core/resilience';
import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Regulatory Delta Service
// AGRC-OS Layer 2 extension: Periodically scans
// for framework version changes, detects deltas,
// and notifies affected tenants with impact analysis.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { resolveImpact } from '../../ports/platform.port';
import { createNotification } from '../../../notification/services/notification.service';
import { toErrorMessage } from '@dos/module-sdk';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RegulatoryDelta {
  deltaId?: string;
  instrumentId: string;
  instrumentName: string;
  previousVersion: string;
  newVersion: string;
  addedNodes: string[];
  modifiedNodes: string[];
  removedNodes: string[];
  detectedAt: string;
}

export interface TenantImpact {
  tenantId: string;
  orgName: string;
  affectedControls: string[];
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
}

// ── Ensure tables ──────────────────────────────────────────────────────────

async function ensureTables(): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS regulatory_deltas (
      delta_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      instrument_id VARCHAR(100) NOT NULL,
      instrument_name VARCHAR(255),
      previous_version VARCHAR(50),
      new_version VARCHAR(50),
      added_nodes TEXT[] DEFAULT '{}',
      modified_nodes TEXT[] DEFAULT '{}',
      removed_nodes TEXT[] DEFAULT '{}',
      detected_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS regulatory_delta_impacts (
      impact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      delta_id UUID REFERENCES regulatory_deltas(delta_id),
      tenant_id VARCHAR(16) REFERENCES tenants(tenant_id),
      affected_controls TEXT[] DEFAULT '{}',
      impact_level VARCHAR(20) NOT NULL,
      notified BOOLEAN DEFAULT FALSE,
      status VARCHAR(20) DEFAULT 'pending',
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    DO $$ BEGIN
      ALTER TABLE regulatory_delta_impacts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
      ALTER TABLE regulatory_delta_impacts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);
}


// ── Detect deltas for a specific instrument ────────────────────────────────

export async function detectDelta(instrumentId: string): Promise<RegulatoryDelta | null> {
  await ensureTables();

  // Get current instrument version
  const instResult = await safeQuery(
    `SELECT instrument_id, name_en, version, version_id FROM instruments WHERE instrument_id = $1`,
    [instrumentId]
  );
  if (instResult.rows.length === 0) return null;
  const inst = getFirstRow(instResult)!;

  // Get last known delta for this instrument
  const lastDelta = await safeQuery(
    `SELECT new_version FROM regulatory_deltas
     WHERE instrument_id = $1
     ORDER BY detected_at DESC LIMIT 1`,
    [instrumentId]
  );

  const previousVersion = lastDelta.rows.length > 0 ? getFirstRow(lastDelta)?.new_version : null;

  // If version hasn't changed, no delta
  if (previousVersion && previousVersion === inst.version) return null;

  // Get current structure nodes
  const currentNodes = await safeQuery(
    `SELECT node_id, code, title_en FROM instrument_structure WHERE instrument_id = $1`,
    [instrumentId]
  );
  const currentNodeIds = new Set(currentNodes.rows.map((n: GenericRow) => n.node_id));

  // For first scan (no previous version), record all nodes as baseline
  if (!previousVersion) {
    const delta: RegulatoryDelta = {
      instrumentId,
      instrumentName: inst.name_en,
      previousVersion: '0',
      newVersion: inst.version || '1.0',
      addedNodes: Array.from(currentNodeIds),
      modifiedNodes: [],
      removedNodes: [],
      detectedAt: new Date().toISOString(),
    };

    const result = await safeQuery(
      `INSERT INTO regulatory_deltas
         (instrument_id, instrument_name, previous_version, new_version, added_nodes, modified_nodes, removed_nodes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING delta_id`,
      [instrumentId, inst.name_en, '0', inst.version || '1.0',
       delta.addedNodes, delta.modifiedNodes, delta.removedNodes]
    );
    delta.deltaId = getFirstRow(result)?.delta_id;
    return delta;
  }

  // Compare with previous scan's nodes (stored in the delta record)
  const prevDeltaNodes = await safeQuery(
    `SELECT added_nodes FROM regulatory_deltas
     WHERE instrument_id = $1
     ORDER BY detected_at DESC LIMIT 1`,
    [instrumentId]
  );
  const previousNodeIds = new Set<string>(getFirstRow(prevDeltaNodes)?.added_nodes || []);

  const addedNodes = Array.from(currentNodeIds).filter(id => !previousNodeIds.has(id));
  const removedNodes = Array.from(previousNodeIds).filter(id => !currentNodeIds.has(id));
  // Modified detection would require content comparison — simplified here
  const modifiedNodes: string[] = [];

  if (addedNodes.length === 0 && removedNodes.length === 0 && modifiedNodes.length === 0) {
    return null; // No changes
  }

  const delta: RegulatoryDelta = {
    instrumentId,
    instrumentName: inst.name_en,
    previousVersion: previousVersion || '0',
    newVersion: inst.version || '1.0',
    addedNodes,
    modifiedNodes,
    removedNodes,
    detectedAt: new Date().toISOString(),
  };

  const result = await safeQuery(
    `INSERT INTO regulatory_deltas
       (instrument_id, instrument_name, previous_version, new_version, added_nodes, modified_nodes, removed_nodes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING delta_id`,
    [instrumentId, inst.name_en, delta.previousVersion, delta.newVersion,
     addedNodes, modifiedNodes, removedNodes]
  );
  delta.deltaId = getFirstRow(result)?.delta_id;

  return delta;
}

// ── Compute impact on all tenants ──────────────────────────────────────────

export async function computeTenantImpacts(delta: RegulatoryDelta): Promise<TenantImpact[]> {
  await ensureTables();
  const impacts: TenantImpact[] = [];

  // Get all active tenants
  const tenants = await safeQuery(
    `SELECT tenant_id, org_name FROM tenants WHERE status IN ('active', 'onboarding')`
  );

  for (const tenant of tenants.rows) {
    const schema = tenantSchema(tenant.tenant_id);

    try {
      // Get tenant's mapped controls
      const controlsResult = await safeQuery(
        `SELECT control_id, mapped_registry_nodes FROM "${schema}".ucf_controls
         WHERE mapped_registry_nodes IS NOT NULL AND array_length(mapped_registry_nodes, 1) > 0`
      );

      const tenantControlNodes = controlsResult.rows.flatMap((c: Record<string, unknown>) => c.mapped_registry_nodes || []);
      const affectedControls = resolveImpact(
        { added: delta.addedNodes, modified: delta.modifiedNodes, removed: delta.removedNodes },
        (tenantControlNodes as any)
      );

      if (affectedControls.length === 0) continue;

      // Determine impact level
      const totalChange = delta.addedNodes.length + delta.modifiedNodes.length + delta.removedNodes.length;
      let impactLevel: TenantImpact['impactLevel'] = 'low';
      if (affectedControls.length > 20 || delta.removedNodes.length > 5) impactLevel = 'critical';
      else if (affectedControls.length > 10 || totalChange > 20) impactLevel = 'high';
      else if (affectedControls.length > 3) impactLevel = 'medium';

      // Store impact
      await safeQuery(
        `INSERT INTO regulatory_delta_impacts
           (delta_id, tenant_id, affected_controls, impact_level)
         VALUES ($1, $2, $3, $4)`,
        [delta.deltaId, tenant.tenant_id, affectedControls, impactLevel]
      );

      impacts.push({
        tenantId: tenant.tenant_id,
        orgName: tenant.org_name,
        affectedControls,
        impactLevel,
      });

      // Notify tenant admins
      const admins = await safeQuery(
        `SELECT user_id FROM users WHERE tenant_id = $1 AND role IN ('admin', 'owner', 'compliance_officer') LIMIT 5`,
        [tenant.tenant_id]
      );
      for (const admin of admins.rows) {
        await createNotification(tenant.tenant_id, {
          userId: admin.user_id,
          type: 'regulatory_delta',
          title: `Regulatory change detected: ${delta.instrumentName}`,
          body: `${delta.instrumentName} updated from v${delta.previousVersion} to v${delta.newVersion}. ${affectedControls.length} of your controls are affected.`,
          link: '/registry',
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      }
    } catch {
      // Tenant schema may not have ucf_controls — skip
    }
  }

  return impacts;
}

// ── Scan all instruments for deltas ────────────────────────────────────────

export async function scanAllInstruments(): Promise<{
  scanned: number;
  deltasFound: number;
  deltas: RegulatoryDelta[];
}> {
  const instruments = await safeQuery(`SELECT instrument_id FROM instruments WHERE status = 'active'`);
  const deltas: RegulatoryDelta[] = [];

  for (const inst of instruments.rows) {
    try {
      const delta = await detectDelta(inst.instrument_id);
      if (delta) {
        deltas.push(delta);
        const impacts = await computeTenantImpacts(delta);
        
        // Feature 18: Publish delta.detected event per affected tenant for framework-hub.ts subscriber
        for (const impact of impacts) {
          try {
            await eventBus.publish(({
                          eventType: 'delta.detected',
                          tenantId: impact.tenantId,
                          sourceService: 'regulatory-delta',
                          entityType: 'regulatory_delta',
                          entityId: delta.deltaId || '',
                          severity: impact.impactLevel === 'critical' ? 'critical' : impact.impactLevel === 'high' ? 'warning' : 'info',
                          payload: {
                            instrumentId: delta.instrumentId,
                            instrumentName: delta.instrumentName,
                            instrument: delta.instrumentId, // Alias for framework-hub compatibility
                            previousVersion: delta.previousVersion,
                            newVersion: delta.newVersion,
                            addedNodes: delta.addedNodes,
                            added_nodes: delta.addedNodes, // Alias for framework-hub compatibility
                            modifiedNodes: delta.modifiedNodes,
                            modified_nodes: delta.modifiedNodes, // Alias for framework-hub compatibility
                            removedNodes: delta.removedNodes,
                            removed_nodes: delta.removedNodes, // Alias for framework-hub compatibility
                            deltaId: delta.deltaId,
                            detectedAt: delta.detectedAt,
                            affectedControls: impact.affectedControls,
                            impactLevel: impact.impactLevel,
                          },
                        } as any));
          } catch (eventErr: unknown) {
            logger.warn(`[RegulatoryDelta] Failed to publish delta.detected event for tenant ${impact.tenantId}: ${toErrorMessage(eventErr)}`);
          }
        }
      }
    } catch (err: unknown) {
      logger.error(`[RegulatoryDelta] Error scanning ${inst.instrument_id}: ${toErrorMessage(err)}`);
    }
  }

  return { scanned: instruments.rows.length, deltasFound: deltas.length, deltas };
}

// ── Get delta history ──────────────────────────────────────────────────────

export async function getDeltaHistory(
  instrumentId?: string,
  limit: number = 50
): Promise<Record<string, unknown>[]> {
  await ensureTables();
  if (instrumentId) {
    const result = await safeQuery(
      `SELECT * FROM regulatory_deltas WHERE instrument_id = $1 ORDER BY detected_at DESC LIMIT $2`,
      [instrumentId, limit]
    );
    return result.rows;
  }
  const result = await safeQuery(
    `SELECT * FROM regulatory_deltas ORDER BY detected_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// ── Get impacts for a tenant ───────────────────────────────────────────────

export async function getTenantDeltaImpacts(
  tenantId: string,
  limit: number = 50
): Promise<Record<string, unknown>[]> {
  await ensureTables();
  const result = await safeQuery(
    `SELECT di.*, rd.instrument_name, rd.previous_version, rd.new_version, rd.detected_at
     FROM regulatory_delta_impacts di
     JOIN regulatory_deltas rd ON rd.delta_id = di.delta_id
     WHERE di.tenant_id = $1
     ORDER BY di.created_at DESC LIMIT $2`,
    [tenantId, limit]
  );
  return result.rows;
}

export async function markImpactResolved(impactId: string): Promise<any | null> {
  await ensureTables();
  const result = await safeQuery(
    `UPDATE regulatory_delta_impacts
     SET status = 'resolved', resolved_at = NOW()
     WHERE impact_id = $1
     RETURNING *`,
    [impactId]
  );
  return getFirstRow(result) || null;
}

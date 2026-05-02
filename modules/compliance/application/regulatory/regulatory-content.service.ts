// ============================================
// F01: Regulatory Content Library Service
// Handles regulatory feed import, cross-
// regulation mapping, and change detection.
// Bridges gap vs IBM UCF (1000+ regulators).
// ============================================

import { emptyResult, query } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow, safeQuery } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';
import { SYSTEM_TENANT } from '../../ports/platform.port';

export interface RegulatoryUpdate {
  regulatorCode: string;
  instrumentCode: string;
  changeType: 'new' | 'amended' | 'repealed';
  effectiveDate: string;
  controls: Array<{
    controlCode: string;
    controlTitle: string;
    controlDescription: string;
    mappedTo?: string[];
  }>;
}

export async function importRegulatoryFeed(feed: RegulatoryUpdate[]): Promise<{
  regulatorsAdded: number;
  controlsAdded: number;
  crossMappings: number;
}> {
  let regulatorsAdded = 0, controlsAdded = 0, crossMappings = 0;

  for (const update of feed) {
    await safeQuery(
      `INSERT INTO public.regulators (code, name_en, country_code, status)
       VALUES ($1, $1, 'INT', 'active')
       ON CONFLICT (code) DO NOTHING`,
      [update.regulatorCode],
    );

    const instrRes = await safeQuery(
      `INSERT INTO public.instruments (code, name_en, instrument_type, regulator_code, status)
       VALUES ($1, $1, 'framework', $2, 'active')
       ON CONFLICT (code) DO UPDATE SET status = 'active'
       RETURNING instrument_id`,
      [update.instrumentCode, update.regulatorCode],
    );
    const instrumentId = getFirstRow(instrRes)?.instrument_id;
    if (!instrumentId) continue;

    for (const ctrl of update.controls) {
      await safeQuery(
        `INSERT INTO public.regulatory_controls
         (control_code, control_title_en, control_description_en, instrument_id, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (control_code) DO UPDATE SET
           control_title_en = EXCLUDED.control_title_en,
           control_description_en = EXCLUDED.control_description_en`,
        [ctrl.controlCode, ctrl.controlTitle, ctrl.controlDescription, instrumentId],
      );
      controlsAdded++;

      if (ctrl.mappedTo?.length) {
        for (const targetCode of ctrl.mappedTo) {
          await safeQuery(
            `INSERT INTO public.control_cross_mappings
             (source_control_code, target_control_code, mapping_type, confidence)
             VALUES ($1, $2, 'equivalent', 0.85)
             ON CONFLICT DO NOTHING`,
            [ctrl.controlCode, targetCode],
          ).catch(catchHandler(EC.EVENT_BUS, {}));
          crossMappings++;
        }
      }
    }
    regulatorsAdded++;
  }

  eventBus.publish(({
      eventType: 'regulatory.content_updated',
      tenantId: SYSTEM_TENANT,
      sourceService: 'RegulatoryContentService',
      severity: 'info',
      payload: { regulatorsAdded, controlsAdded, crossMappings },
    } as any));

  return { regulatorsAdded, controlsAdded, crossMappings };
}

export async function getCrossRegulationMap(frameworkA: string, frameworkB: string): Promise<Array<{
  sourceControl: string;
  targetControl: string;
  confidence: number;
}>> {
  const res = await safeQuery(
    `SELECT cm.source_control_code as "sourceControl",
            cm.target_control_code as "targetControl",
            cm.confidence
     FROM public.control_cross_mappings cm
     JOIN public.regulatory_controls rcA ON rcA.control_code = cm.source_control_code
     JOIN public.regulatory_controls rcB ON rcB.control_code = cm.target_control_code
     JOIN public.instruments iA ON iA.instrument_id = rcA.instrument_id
     JOIN public.instruments iB ON iB.instrument_id = rcB.instrument_id
     WHERE iA.code = $1 AND iB.code = $2
     ORDER BY cm.confidence DESC`,
    [frameworkA, frameworkB],
  );
  return res.rows;
}

export async function detectRegulatoryImpact(tenantId: string): Promise<Array<{
  frameworkCode: string;
  affectedControls: number;
  changeType: string;
}>> {
  const schema = `tenant_${tenantId.replace(/-/g, '_')}`;
  const res = await safeQuery(
    `SELECT f.framework_code, COUNT(rc.control_code)::int as "affectedControls",
            'amended' as "changeType"
     FROM "${schema}".frameworks f
     JOIN public.regulatory_controls rc ON rc.instrument_id = f.instrument_id
     WHERE rc.updated_at > NOW() - INTERVAL '30 days'
     GROUP BY f.framework_code`,
    [],
  );
  return res.rows;
}

export async function logFrameworkChange(input: {
  frameworkCode: string;
  fromVersion?: string;
  toVersion: string;
  changeType?: string;
  effectiveDate?: string;
  affectedControls?: string[];
  summary?: string;
  publishedBy?: string;
}): Promise<{ changeId: string }> {
  const res = await safeQuery(
    `INSERT INTO public.regulatory_change_log
     (framework_code, from_version, to_version, change_type, effective_date,
      affected_controls, summary, published_by)
     VALUES ($1, $2, $3, $4, $5::date, $6::jsonb, $7, $8)
     RETURNING change_id`,
    [
      input.frameworkCode,
      input.fromVersion ?? null,
      input.toVersion,
      input.changeType ?? 'amended',
      input.effectiveDate ?? new Date().toISOString().slice(0, 10),
      JSON.stringify(input.affectedControls ?? []),
      input.summary ?? null,
      input.publishedBy ?? null,
    ],
  );
  const changeId = getFirstRow(res)?.change_id ?? 'any';
  eventBus.publish(({
      eventType: 'regulatory.framework_changed',
      tenantId: SYSTEM_TENANT,
      sourceService: 'RegulatoryContentService',
      severity: 'warning',
      payload: { frameworkCode: input.frameworkCode, toVersion: input.toVersion, changeId },
    } as any));
  return { changeId };
}

export async function listPendingFrameworkChanges(): Promise<Record<string, unknown>[]> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
    `SELECT * FROM public.regulatory_change_log
     WHERE impact_assessed = FALSE
     ORDER BY effective_date DESC LIMIT 50`,
    [],
  ), { operation: 'fallback query' });
  return res.rows;
}

export async function listRegulatoryAuthorities(): Promise<Array<{
  code: string;
  name: string;
  country: string;
  frameworkCount: number;
}>> {
  const res = await safeQuery(
    `SELECT r.code, r.name_en as name, COALESCE(r.country_code, 'INT') as country,
            COUNT(i.instrument_id)::int as "frameworkCount"
     FROM public.regulators r
     LEFT JOIN public.instruments i ON i.regulator_code = r.code
     WHERE r.status = 'active'
     GROUP BY r.code, r.name_en, r.country_code
     ORDER BY r.name_en`,
    [],
  );
  return res.rows;
}

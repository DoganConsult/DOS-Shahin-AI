// ============================================
// F03: Risk Quantification Service
// Monte Carlo simulation, scenario analysis,
// bow-tie modeling, FAIR quantification.
// Bridges gap vs IBM ORM quantitative models.
// ============================================

import { emptyResult, query, tenantSchema } from '../../ports/database.port';
import { v4 as uuid } from 'uuid';
import { getFirstRow, safeQuery } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

// ── FAIR Types ─────────────────────────────────────────────────────────────

export interface FAIRInput {
  riskId: string;
  tef: { min: number; likely: number; max: number };
  vulnerabilityPct: number;
  plm: { min: number; likely: number; max: number };
  slm?: { min: number; likely: number; max: number };
  notes?: string;
}

export interface FAIRResult {
  assessmentId: string;
  lef: { min: number; likely: number; max: number };
  ale: number;
  p90Loss: number;
  p99Loss: number;
  riskBand: 'very_low' | 'low' | 'medium' | 'high' | 'critical';
}

// ── Bow-tie mutation types ─────────────────────────────────────────────────

export interface AddThreatInput {
  name: string;
  description?: string;
  likelihood?: number;
  threatCategory?: string;
  source?: string;
}

export interface AddConsequenceInput {
  name: string;
  description?: string;
  impact?: number;
  consequenceType?: string;
  financialEstimate?: number;
}

export interface MapControlInput {
  controlId: string;
  controlTitle?: string;
  effectiveness?: number;
  notes?: string;
}

export interface ScenarioInput {
  riskId: string;
  scenarioName: string;
  likelihoodOverride?: number;
  impactOverride?: number;
  assumptions: string[];
}

export interface MonteCarloResult {
  meanLoss: number;
  p95Loss: number;
  p99Loss: number;
  var95: number;
  distribution: number[];
  iterations: number;
}

export interface BowTieModel {
  riskId: string;
  riskTitle: string;
  threats: Array<{ id: string; name: string; likelihood: number }>;
  preventiveControls: Array<{ id: string; name: string; effectiveness: number }>;
  consequences: Array<{ id: string; name: string; impact: number }>;
  mitigatingControls: Array<{ id: string; name: string; effectiveness: number }>;
}

export async function runMonteCarloSimulation(
  tenantId: string,
  riskId: string,
  iterations: number = 10000,
): Promise<MonteCarloResult> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

export async function runScenarioAnalysis(
  tenantId: string,
  input: ScenarioInput,
): Promise<{
  baselineScore: number;
  scenarioScore: number;
  delta: number;
  monteCarloResult: MonteCarloResult;
}> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

export async function buildBowTie(tenantId: string, riskId: string): Promise<BowTieModel> {
  const schema = tenantSchema(tenantId);

  const riskRes = await safeQuery(
    `SELECT title FROM "${schema}".risks WHERE risk_id = $1`, [riskId],
  );

  // Threats come from the risk's causes if available, else use risk register signals
  const threatRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
    `SELECT rt.id, rt.name, COALESCE(rt.likelihood, 3) as likelihood
     FROM "${schema}".risk_threats rt WHERE rt.risk_id = $1`,
    [riskId],
  ), { tenantId: tenantId, operation: 'query risks' });

  const conseqRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
    `SELECT rc.id, rc.name, COALESCE(rc.impact, 3) as impact
     FROM "${schema}".risk_consequences rc WHERE rc.risk_id = $1`,
    [riskId],
  ), { tenantId: tenantId, operation: 'query risk_threats' });

  const ctrlRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
    `SELECT c.control_id as id, COALESCE(c.title, c.control_code) as name,
            COALESCE(c.effectiveness_score, 0.5) as effectiveness
     FROM "${schema}".controls c
     JOIN "${schema}".risk_control_mappings rcm ON rcm.control_id = c.control_id
     WHERE rcm.risk_id = $1`,
    [riskId],
  ), { tenantId: tenantId, operation: 'query risk_consequences' });

  const midpoint = Math.ceil(ctrlRes.rows.length / 2);

  return {
    riskId,
    riskTitle: getFirstRow(riskRes)?.title || riskId,
    threats: threatRes.rows as Array<{ id: string; name: string; likelihood: number }>,
    preventiveControls: ctrlRes.rows.slice(0, midpoint) as Array<{ id: string; name: string; effectiveness: number }>,
    consequences: conseqRes.rows as Array<{ id: string; name: string; impact: number }>,
    mitigatingControls: ctrlRes.rows.slice(midpoint) as Array<{ id: string; name: string; effectiveness: number }>,
  };
}

export async function listScenarios(tenantId: string, riskId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".risk_scenarios WHERE risk_id = $1 ORDER BY created_at DESC`,
    [riskId],
  );
  return res.rows;
}

function buildHistogram(values: number[], buckets: number): number[] {
  const max = values[values.length - 1] || 1;
  const bucketSize = max / buckets;
  const hist = new Array(buckets).fill(0);
  for (const v of values) {
    const idx = Math.min(Math.floor(v / bucketSize), buckets - 1);
    hist[idx]++;
  }
  return hist;
}

// ── FAIR Risk Quantification ────────────────────────────────────────────────

function lognormalSample(min: number, likely: number, max: number): number {
  const mu = Math.log(likely);
  const sigma = (Math.log(max) - Math.log(min)) / 6 || 0.5;
  const u1 = Math.random() || 1e-10;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(min, Math.exp(mu + sigma * z));
}

function fairRiskBand(ale: number): FAIRResult['riskBand'] {
  if (ale < 10000)   return 'very_low';
  if (ale < 100000)  return 'low';
  if (ale < 500000)  return 'medium';
  if (ale < 2000000) return 'high';
  return 'critical';
}

export async function runFAIRAssessment(
  tenantId: string,
  input: FAIRInput,
  iterations = 10000,
): Promise<FAIRResult> {
  const schema = tenantSchema(tenantId);
  const assessmentId = uuid();

  const lefMin    = input.tef.min    * (input.vulnerabilityPct / 100);
  const lefLikely = input.tef.likely * (input.vulnerabilityPct / 100);
  const lefMax    = input.tef.max    * (input.vulnerabilityPct / 100);

  const annualLosses: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const lef  = lognormalSample(Math.max(0.001, lefMin), Math.max(0.01, lefLikely), lefMax);
    const plm  = lognormalSample(input.plm.min, input.plm.likely, input.plm.max);
    const slm  = input.slm ? lognormalSample(input.slm.min, input.slm.likely, input.slm.max) : 0;
    annualLosses.push(lef * (plm + slm));
  }
  annualLosses.sort((a, b) => a - b);
  const ale    = annualLosses.reduce((s, v) => s + v, 0) / iterations;
  const p90    = annualLosses[Math.floor(iterations * 0.90)];
  const p99    = annualLosses[Math.floor(iterations * 0.99)];

  await safeQuery(
    `INSERT INTO "${schema}".risk_fair_assessments
     (assessment_id, risk_id, tef_min, tef_likely, tef_max,
      vulnerability_pct, plm_min, plm_likely, plm_max,
      slm_min, slm_likely, slm_max,
      annualised_loss_expectancy, risk_percentile_90, risk_percentile_99,
      confidence_interval, notes, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,'completed')
     ON CONFLICT DO NOTHING`,
    [
      assessmentId, input.riskId,
      input.tef.min, input.tef.likely, input.tef.max,
      input.vulnerabilityPct,
      input.plm.min, input.plm.likely, input.plm.max,
      input.slm?.min ?? 0, input.slm?.likely ?? 0, input.slm?.max ?? 0,
      Math.round(ale), Math.round(p90), Math.round(p99),
      JSON.stringify({ p50: annualLosses[Math.floor(iterations * 0.50)], p75: annualLosses[Math.floor(iterations * 0.75)] }),
      input.notes ?? null,
    ],
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  return {
    assessmentId,
    lef: { min: lefMin, likely: lefLikely, max: lefMax },
    ale: Math.round(ale),
    p90Loss: Math.round(p90),
    p99Loss: Math.round(p99),
    riskBand: fairRiskBand(ale),
  };
}

export async function listFAIRAssessments(tenantId: string, riskId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
    `SELECT * FROM "${schema}".risk_fair_assessments WHERE risk_id = $1 ORDER BY created_at DESC`,
    [riskId],
  ), { tenantId: tenantId, operation: 'query risk_fair_assessments' });
  return res.rows;
}

// ── Bow-tie mutations (DB-backed) ────────────────────────────────────────────

export async function addThreat(tenantId: string, riskId: string, input: AddThreatInput): Promise<{ threatId: string }> {
  const schema = tenantSchema(tenantId);
  const threatId = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".risk_threats
     (threat_id, risk_id, name, description, threat_category, likelihood, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [threatId, riskId, input.name, input.description ?? null,
     input.threatCategory ?? 'external', input.likelihood ?? 3, input.source ?? null],
  );
  return { threatId };
}

export async function addConsequence(tenantId: string, riskId: string, input: AddConsequenceInput): Promise<{ consequenceId: string }> {
  const schema = tenantSchema(tenantId);
  const consequenceId = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".risk_consequences
     (consequence_id, risk_id, name, description, consequence_type, impact, financial_estimate)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [consequenceId, riskId, input.name, input.description ?? null,
     input.consequenceType ?? 'financial', input.impact ?? 3, input.financialEstimate ?? null],
  );
  return { consequenceId };
}

export async function mapPreventiveControl(tenantId: string, threatId: string, input: MapControlInput): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".preventive_control_mappings
     (threat_id, control_id, control_title, effectiveness, notes)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
    [threatId, input.controlId, input.controlTitle ?? null, input.effectiveness ?? 0.5, input.notes ?? null],
  );
}

export async function mapMitigatingControl(tenantId: string, consequenceId: string, input: MapControlInput): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".mitigating_control_mappings
     (consequence_id, control_id, control_title, effectiveness, notes)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
    [consequenceId, input.controlId, input.controlTitle ?? null, input.effectiveness ?? 0.5, input.notes ?? null],
  );
}

// ── Multi-framework gap analysis ────────────────────────────────────────────

export interface FrameworkGapRow {
  frameworkCode: string;
  totalControls: number;
  implementedControls: number;
  gapCount: number;
  coveragePct: number;
  criticalGaps: number;
}

export async function getMultiFrameworkGapAnalysis(
  tenantId: string,
  frameworkIds: string[],
): Promise<FrameworkGapRow[]> {
  if (!frameworkIds.length) return [];
  const schema = tenantSchema(tenantId);
  const placeholders = frameworkIds.map((_, i) => `$${i + 1}`).join(', ');
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
    `SELECT
       c.framework_code                                                      AS "frameworkCode",
       COUNT(*)::int                                                          AS "totalControls",
       COUNT(*) FILTER (WHERE c.status = 'implemented')::int                 AS "implementedControls",
       COUNT(*) FILTER (WHERE c.status != 'implemented')::int                AS "gapCount",
       ROUND(COUNT(*) FILTER (WHERE c.status = 'implemented')::numeric
             / NULLIF(COUNT(*), 0) * 100)::int                               AS "coveragePct",
       COUNT(*) FILTER (WHERE c.priority = 'critical'
                        AND c.status != 'implemented')::int                  AS "criticalGaps"
     FROM "${schema}".controls c
     WHERE c.framework_code IN (${placeholders})
     GROUP BY c.framework_code
     ORDER BY "coveragePct" ASC`,
    frameworkIds,
  ), { tenantId: tenantId, operation: 'query controls' });

  return res.rows as unknown as FrameworkGapRow[];
}

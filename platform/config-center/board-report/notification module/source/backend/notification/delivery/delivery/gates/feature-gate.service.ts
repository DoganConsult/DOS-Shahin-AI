import { safeQuery } from '@dos/db';
import { publish } from '@dos/platform-core/events';
import type { FeatureGate, FeatureGateState } from '../contracts/delivery.types';

export async function registerFeatureGate(input: {
  gateCode: string;
  label: string;
  state: FeatureGateState;
  rolloutPercent?: number;
  allowedRoles?: string[];
  allowedTenants?: string[];
  ownerLayer: string;
  ownerCode: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `INSERT INTO public.dos_feature_gates (
      gate_code, label, state, rollout_percent, allowed_roles, allowed_tenants,
      owner_layer, owner_code, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (gate_code) DO UPDATE SET
      label = EXCLUDED.label,
      state = EXCLUDED.state,
      rollout_percent = EXCLUDED.rollout_percent,
      allowed_roles = EXCLUDED.allowed_roles,
      allowed_tenants = EXCLUDED.allowed_tenants,
      updated_at = EXCLUDED.updated_at`,
    [
      input.gateCode,
      input.label,
      input.state,
      input.rolloutPercent ?? 0,
      JSON.stringify(input.allowedRoles ?? []),
      JSON.stringify(input.allowedTenants ?? []),
      input.ownerLayer,
      input.ownerCode,
      now,
      now,
    ],
  );
  await publish('delivery.feature_gate.registered', 'platform', { gateCode: input.gateCode, state: input.state }, {});
}

export async function getFeatureGate(gateCode: string): Promise<FeatureGate | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_feature_gates WHERE gate_code = $1 LIMIT 1`,
    [gateCode],
  );
  if (!result.rows[0]) return null;
  return mapGateRow(result.rows[0]);
}

export async function listFeatureGates(ownerLayer?: string, ownerCode?: string): Promise<FeatureGate[]> {
  let result;
  if (ownerLayer && ownerCode) {
    result = await safeQuery(
      `SELECT * FROM public.dos_feature_gates WHERE owner_layer = $1 AND owner_code = $2 ORDER BY gate_code`,
      [ownerLayer, ownerCode],
    );
  } else {
    result = await safeQuery(`SELECT * FROM public.dos_feature_gates ORDER BY gate_code`, []);
  }
  return result.rows.map(mapGateRow);
}

export async function setFeatureGateState(gateCode: string, state: FeatureGateState, rolloutPercent?: number): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_feature_gates SET state = $1, rollout_percent = COALESCE($2, rollout_percent), updated_at = $3 WHERE gate_code = $4`,
    [state, rolloutPercent ?? null, now, gateCode],
  );
  await publish('delivery.feature_gate.state_changed', 'platform', { gateCode, state, rolloutPercent }, {});
}

export async function isFeatureEnabled(
  gateCode: string,
  context: { tenantId?: string; roles?: string[]; bucketSeed?: string },
): Promise<boolean> {
  const gate = await getFeatureGate(gateCode);
  if (!gate) return false;

  if (gate.state === 'off') return false;
  if (gate.state === 'on') return true;

  if (gate.state === 'percentage' && context.bucketSeed) {
    const hash = simpleHash(context.bucketSeed + gateCode);
    const bucket = hash % 100;
    return bucket < gate.rolloutPercent;
  }

  if (gate.state === 'canary') {
    if (context.tenantId && gate.allowedTenants.includes(context.tenantId)) return true;
    if (context.roles && gate.allowedRoles.some((r) => context.roles!.includes(r))) return true;
    return false;
  }

  return false;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function mapGateRow(row: Record<string, any>): FeatureGate {
  return {
    gateCode: row.gate_code as string,
    label: row.label as string,
    state: row.state as FeatureGateState,
    rolloutPercent: (row.rollout_percent as number) ?? 0,
    allowedRoles: (row.allowed_roles as string[]) ?? [],
    allowedTenants: (row.allowed_tenants as string[]) ?? [],
    ownerLayer: row.owner_layer as string,
    ownerCode: row.owner_code as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

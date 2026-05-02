import { safeQuery, tenantSchema } from '@dos/db';

export type PlatformMode = 'manual' | 'hybrid' | 'autonomous' | 'human' | 'copilot' | 'assisted' | 'hyper';

export interface ProgressionGate {
  gateId: string;
  name: string;
  requiredMode: PlatformMode;
  conditions: string[];
  passed: boolean;
  passedAt: string | null;
}

export interface AgentProgressionResult {
  agentId: string;
  tenantId: string;
  currentMode: PlatformMode;
  eligibleMode: PlatformMode;
  passedGates: string[];
  failedGates: string[];
  canProgress: boolean;
  blockers: string[];
}

const MODE_RANK: Record<PlatformMode, number> = {
  manual: 0,
  human: 1,
  assisted: 2,
  copilot: 3,
  hybrid: 4,
  autonomous: 5,
  hyper: 6,
};

const DEFAULT_GATES: Omit<ProgressionGate, 'passed' | 'passedAt'>[] = [
  {
    gateId: 'gate_01_trust_baseline',
    name: 'Trust Baseline',
    requiredMode: 'assisted',
    conditions: ['trust_score >= 50', 'no_critical_incidents_30d'],
  },
  {
    gateId: 'gate_02_copilot_eligible',
    name: 'Copilot Eligible',
    requiredMode: 'copilot',
    conditions: ['trust_score >= 65', 'human_override_rate < 0.3', 'min_30_actions'],
  },
  {
    gateId: 'gate_03_hybrid_mode',
    name: 'Hybrid Mode',
    requiredMode: 'hybrid',
    conditions: ['trust_score >= 75', 'human_override_rate < 0.15', 'min_100_actions'],
  },
  {
    gateId: 'gate_04_autonomous',
    name: 'Autonomous Mode',
    requiredMode: 'autonomous',
    conditions: ['trust_score >= 90', 'human_override_rate < 0.05', 'min_500_actions', 'admin_approval'],
  },
];

export async function getProgressionGates(
  tenantId: string,
  agentId: string,
): Promise<ProgressionGate[]> {
  const schema = tenantSchema(tenantId);
  let passedGateIds: string[] = [];
  try {
    const { rows } = await safeQuery(
      `SELECT gate_id, passed_at FROM "${schema}".agent_progression_gates
       WHERE agent_id = $1 AND passed = TRUE`,
      [agentId],
    );
    passedGateIds = rows.map(r => String(r['gate_id']));
  } catch { /* table may not exist */ }

  return DEFAULT_GATES.map(gate => ({
    ...gate,
    passed: passedGateIds.includes(gate.gateId),
    passedAt: null,
  }));
}

export async function evaluateAgentProgression(
  tenantId: string,
  agentId: string,
  currentMode: PlatformMode = 'manual',
): Promise<AgentProgressionResult> {
  const gates = await getProgressionGates(tenantId, agentId);
  const passedGates: string[] = [];
  const failedGates: string[] = [];
  const blockers: string[] = [];

  for (const gate of gates) {
    if (gate.passed) {
      passedGates.push(gate.gateId);
    } else {
      failedGates.push(gate.gateId);
      blockers.push(`Gate "${gate.name}" not passed — requires: ${gate.conditions.join(', ')}`);
    }
  }

  const passedModes = gates
    .filter(g => g.passed)
    .map(g => g.requiredMode)
    .sort((a, b) => MODE_RANK[b] - MODE_RANK[a]);

  const eligibleMode: PlatformMode = passedModes.length > 0 ? passedModes[0]! : 'manual';
  const canProgress = MODE_RANK[eligibleMode] > MODE_RANK[currentMode];

  return {
    agentId,
    tenantId,
    currentMode,
    eligibleMode,
    passedGates,
    failedGates,
    canProgress,
    blockers: canProgress ? [] : blockers,
  };
}

export async function enforceAutonomyGate(
  tenantId: string,
  agentId: string,
  requiredMode: PlatformMode,
  currentMode: PlatformMode = 'manual',
): Promise<{ allowed: boolean; reason: string }> {
  if (MODE_RANK[currentMode] >= MODE_RANK[requiredMode]) {
    return { allowed: true, reason: 'Current mode meets requirement' };
  }

  const progression = await evaluateAgentProgression(tenantId, agentId, currentMode);
  if (MODE_RANK[progression.eligibleMode] >= MODE_RANK[requiredMode]) {
    return { allowed: true, reason: `Agent eligible for ${progression.eligibleMode} mode` };
  }

  return {
    allowed: false,
    reason: `Agent in "${currentMode}" mode — requires "${requiredMode}". Blockers: ${progression.blockers.join('; ')}`,
  };
}

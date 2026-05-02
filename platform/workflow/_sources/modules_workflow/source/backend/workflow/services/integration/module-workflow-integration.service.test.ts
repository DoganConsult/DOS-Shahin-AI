import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock safeQuery to return seeded DB data (mirrors migration 108)
const mockSafeQuery = vi.fn();
vi.mock('../../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
}));

vi.mock('../../../../config/module-workflow-map', () => ({
  MODULE_WORKFLOW_MAP: {
    risk: { tier: 'module', automationLevel: 'semi' },
    compliance: { tier: 'module', automationLevel: 'semi' },
    evidence: { tier: 'module', automationLevel: 'full' },
    platform: { tier: 'platform', automationLevel: 'manual' },
  },
}));
vi.mock('../../../../config/canonical-modules', () => ({
  isCanonicalModuleCode: vi.fn((code: string) => ['risk', 'compliance', 'evidence', 'platform'].includes(code)),
}));
vi.mock('../ops/workflow-kill-switch.service', () => ({
  isKillSwitchActive: vi.fn().mockResolvedValue({ blocked: false, switches: [] }),
  logIntervention: vi.fn().mockResolvedValue('int-1'),
}));
vi.mock('../ai/workflow-ai-budget.service', () => ({
  checkBudget: vi.fn().mockResolvedValue({ allowed: true, utilization_pct: 50, remaining_executions: 100 }),
}));
vi.mock('../ops/workflow-forbidden-boundaries.service', () => ({
  checkBoundaries: vi.fn().mockResolvedValue({ allowed: true, violations: [] }),
}));
vi.mock('../ai/workflow-step-autonomy.service', () => ({
  checkStepAutonomy: vi.fn().mockResolvedValue({ allowed: true, maxAutonomyLevel: 4, allowedActions: [] }),
}));
vi.mock('../approvals/workflow-mandatory-review.service', () => ({
  checkReviewRequired: vi.fn().mockResolvedValue({ requiresReview: false }),
}));
vi.mock('../ai/workflow-ai-notes.service', () => ({
  createAINote: vi.fn().mockResolvedValue({ note_id: 'note-1' }),
}));
vi.mock('../approvals/workflow-draft-actions.service', () => ({
  createDraftAction: vi.fn().mockResolvedValue({ draft_id: 'draft-1', status: 'pending_review' }),
}));
vi.mock('../ai/workflow-recommendation-catalog.service', () => ({
  getApplicableRecommendations: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../../../platform/dos/workflows', () => ({
  emitWorkflowEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../platform/services/misc/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  getAgentForModule,
  getModulesForAgent,
  isAgentBoundToModule,
  getModuleSLAConfig,
  getModuleCompensatingAction,
  getCrossModuleChainTemplate,
  getChainTemplatesForModule,
  resolveModuleAIPolicy,
  runAIGateChecks,
  getModuleWorkflowHealth,
  invalidateWorkflowConfigCache,
} from '../chains/module-workflow-integration.service';
import { isKillSwitchActive } from '../ops/workflow-kill-switch.service';
import { checkBudget } from '../ai/workflow-ai-budget.service';

// DB rows matching migration 108 seed data
const AGENT_BINDING_ROWS = [
  { agent_id: 'A01', module_code: 'risk' },
  { agent_id: 'A02', module_code: 'compliance' },
  { agent_id: 'A03', module_code: 'policy' },
  { agent_id: 'A03', module_code: 'governance' },
  { agent_id: 'A03', module_code: 'exception' },
  { agent_id: 'A04', module_code: 'evidence' },
  { agent_id: 'A05', module_code: 'audit' },
  { agent_id: 'A06', module_code: 'incident' },
  { agent_id: 'A06', module_code: 'bcp' },
  { agent_id: 'A07', module_code: 'vendor' },
  { agent_id: 'A07', module_code: 'asset' },
  { agent_id: 'A08', module_code: 'remediation' },
  { agent_id: 'A08', module_code: 'action' },
  { agent_id: 'A09', module_code: 'training' },
  { agent_id: 'A09', module_code: 'qiyas' },
  { agent_id: 'A10', module_code: 'ai-governance' },
];

const SLA_CONFIG_ROWS = [
  { module_code: 'risk', warning_pct: '0.75', breach_action: 'escalate', escalation_roles: ['risk_admin'], auto_reassign_on_breach: false },
  { module_code: 'compliance', warning_pct: '0.75', breach_action: 'escalate', escalation_roles: ['compliance_admin'], auto_reassign_on_breach: false },
  { module_code: 'evidence', warning_pct: '0.70', breach_action: 'escalate', escalation_roles: ['evidence_admin'], auto_reassign_on_breach: true },
];

const COMPENSATION_ROWS = [
  { original_action: 'risk_score_auto', compensating_action: 'risk_score_revert' },
  { original_action: 'evidence_auto_validate', compensating_action: 'evidence_invalidate' },
];

function setupDBMocks() {
  mockSafeQuery.mockImplementation((sql: string) => {
    if (sql.includes('agent_module_bindings')) {
      return Promise.resolve({ rows: AGENT_BINDING_ROWS, rowCount: AGENT_BINDING_ROWS.length });
    }
    if (sql.includes('module_sla_configs')) {
      return Promise.resolve({ rows: SLA_CONFIG_ROWS, rowCount: SLA_CONFIG_ROWS.length });
    }
    if (sql.includes('module_compensation_registry')) {
      return Promise.resolve({ rows: COMPENSATION_ROWS, rowCount: COMPENSATION_ROWS.length });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

describe('Module Workflow Integration Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateWorkflowConfigCache();
    setupDBMocks();
  });

  describe('getAgentForModule', () => {
    it('should return agent ID for known module', async () => {
      expect(await getAgentForModule('risk')).toBe('A01');
      expect(await getAgentForModule('compliance')).toBe('A02');
      expect(await getAgentForModule('incident')).toBe('A06');
    });

    it('should return null for unknown module', async () => {
      expect(await getAgentForModule('unknown')).toBeNull();
    });
  });

  describe('getModulesForAgent', () => {
    it('should return modules for a known agent', async () => {
      expect(await getModulesForAgent('A01')).toEqual(['risk']);
      expect(await getModulesForAgent('A03')).toEqual(['policy', 'governance', 'exception']);
    });

    it('should return empty array for unknown agent', async () => {
      expect(await getModulesForAgent('A99')).toEqual([]);
    });
  });

  describe('isAgentBoundToModule', () => {
    it('should return true for correct binding', async () => {
      expect(await isAgentBoundToModule('A01', 'risk')).toBe(true);
    });

    it('should return false for incorrect binding', async () => {
      expect(await isAgentBoundToModule('A01', 'compliance')).toBe(false);
    });
  });

  describe('getModuleSLAConfig', () => {
    it('should return SLA config for known module', async () => {
      const config = await getModuleSLAConfig('risk');
      expect(config.warningPct).toBe(0.75);
      expect(config.breachAction).toBe('escalate');
    });

    it('should return default config for unknown module', async () => {
      const config = await getModuleSLAConfig('unknown');
      expect(config.warningPct).toBe(0.75);
      expect(config.escalationRoles).toEqual(['admin']);
    });
  });

  describe('getModuleCompensatingAction', () => {
    it('should return compensating action for known actions', async () => {
      expect(await getModuleCompensatingAction('risk_score_auto')).toBe('risk_score_revert');
      expect(await getModuleCompensatingAction('evidence_auto_validate')).toBe('evidence_invalidate');
    });

    it('should return null for unknown action', async () => {
      expect(await getModuleCompensatingAction('unknown_action')).toBeNull();
    });
  });

  describe('DB failure returns empty (no fallback)', () => {
    it('should return null agent when DB fails', async () => {
      invalidateWorkflowConfigCache();
      mockSafeQuery.mockRejectedValue(new Error('DB down'));
      expect(await getAgentForModule('risk')).toBeNull();
    });

    it('should return default SLA when DB fails', async () => {
      invalidateWorkflowConfigCache();
      mockSafeQuery.mockRejectedValue(new Error('DB down'));
      const config = await getModuleSLAConfig('risk');
      expect(config.warningPct).toBe(0.75);
      expect(config.escalationRoles).toEqual(['admin']);
    });

    it('should return null compensation when DB fails', async () => {
      invalidateWorkflowConfigCache();
      mockSafeQuery.mockRejectedValue(new Error('DB down'));
      expect(await getModuleCompensatingAction('risk_score_auto')).toBeNull();
    });
  });

  describe('getCrossModuleChainTemplate', () => {
    it('should return template for known chain code', () => {
      const template = getCrossModuleChainTemplate('risk_to_remediation');
      expect(template).not.toBeNull();
      expect(template!.steps).toHaveLength(6);
    });

    it('should return null for unknown chain code', () => {
      expect(getCrossModuleChainTemplate('nonexistent')).toBeNull();
    });
  });

  describe('getChainTemplatesForModule', () => {
    it('should return chains that include the module', () => {
      const templates = getChainTemplatesForModule('evidence');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => {
        expect(t.steps.some(s => s.moduleCode === 'evidence')).toBe(true);
      });
    });
  });

  describe('resolveModuleAIPolicy', () => {
    it('should return AI disabled for unknown module', async () => {
      const result = await resolveModuleAIPolicy('t1', 'noncanonical');
      expect(result.aiEnabled).toBe(false);
      expect(result.source).toBe('unknown_module');
    });

    it('should return semi-autonomous for risk module', async () => {
      const result = await resolveModuleAIPolicy('t1', 'risk');
      expect(result.aiEnabled).toBe(true);
      expect(result.autonomyLevel).toBe(2);
      expect(result.requireHumanReview).toBe(true);
    });

    it('should return fully autonomous for evidence module', async () => {
      const result = await resolveModuleAIPolicy('t1', 'evidence');
      expect(result.aiEnabled).toBe(true);
      expect(result.autonomyLevel).toBe(4);
      expect(result.requireHumanReview).toBe(false);
    });
  });

  describe('runAIGateChecks', () => {
    it('should allow execution when all gates pass', async () => {
      const result = await runAIGateChecks(
        { tenantId: 't1', moduleCode: 'risk', userId: 'u1' },
        'risk_assessment',
      );
      expect(result.allowed).toBe(true);
      expect(result.killSwitchBlocked).toBe(false);
    });

    it('should block when kill switch is active', async () => {
      (isKillSwitchActive as any).mockResolvedValueOnce({
        blocked: true,
        switches: [{ switch_id: 'ks-1' } as any],
      });

      const result = await runAIGateChecks(
        { tenantId: 't1', moduleCode: 'risk', userId: 'u1' },
        'risk_assessment',
      );
      expect(result.allowed).toBe(false);
      expect(result.killSwitchBlocked).toBe(true);
    });

    it('should block when budget is exhausted', async () => {
      (checkBudget as any).mockResolvedValueOnce({ allowed: false, utilization_pct: 100, remaining_executions: 0 } as any);

      const result = await runAIGateChecks(
        { tenantId: 't1', moduleCode: 'risk', userId: 'u1' },
        'risk_assessment',
      );
      expect(result.allowed).toBe(false);
      expect(result.budgetExhausted).toBe(true);
    });
  });

  describe('getModuleWorkflowHealth', () => {
    it('should return healthy when all checks pass', async () => {
      const result = await getModuleWorkflowHealth('t1', 'risk');
      expect(result.health).toBe('healthy');
      expect(result.killSwitchActive).toBe(false);
    });

    it('should return halted when kill switch is active', async () => {
      (isKillSwitchActive as any).mockResolvedValueOnce({
        blocked: true,
        switches: [{ switch_id: 'ks-1' } as any],
      });

      const result = await getModuleWorkflowHealth('t1', 'risk');
      expect(result.health).toBe('halted');
    });
  });
});

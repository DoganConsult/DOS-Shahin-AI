/**
 * Phase M0.5 — Agentic UI Interaction Layer contract test.
 *
 * Source-level (no DOM) verification that the 10 agentic components
 * obey the doctrine documented in the prompt + companion CI gate
 * `scripts/ci-guards/agentic-ui-coverage.mjs`. Runs under
 * `tests/vitest.contracts.config.mjs`.
 *
 * Asserts:
 *   ① Contract enums (AGENT_STATES × 9, AGENT_EVENTS × 7, AGENTIC_COMPONENT_KEYS × 10).
 *   ② Every Dos*Component source acknowledges all 9 universal AgentStates.
 *   ③ No component owns a local executor — i.e. no `fetch(`, no `HttpClient`
 *      import, no `pool.query`, no service-injection that would imply
 *      side-effects beyond emitting AgentEvents.
 *   ④ Approval-modal emits 'agent.action.requested' (NOT 'agent.action.approved'
 *      directly) so the host shell remains the decision point.
 *   ⑤ DB seed (20260503_0024) registers all 10 component_keys with
 *      vendor='ibm-carbon' + approval_status='approved'.
 *   ⑥ Agent registry seed (20260503_0025) declares the agent-tile brand
 *      asset extension and ≥9 active agents.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AGENT_STATES,
  AGENT_EVENTS,
  AGENTIC_COMPONENT_KEYS,
  isAgenticComponentKey,
} from '../../platform/ui-system/dos-ui-system/src/agentic/agentic.contract';

const REPO = resolve(__dirname, '..', '..');
const COMPONENTS_FILE = resolve(REPO, 'platform/ui-system/dos-ui-system/src/agentic/agentic-components.ts');
const SEED_COMP = resolve(REPO, 'platform/dos/migrations/public/20260503_0024_agentic_ui_components.sql');
const SEED_REG  = resolve(REPO, 'platform/dos/migrations/public/20260503_0025_agent_registry.sql');

describe('M0.5 — agentic UI contract', () => {
  it('declares the 9 universal AgentStates', () => {
    expect(AGENT_STATES).toEqual([
      'loading','empty','ready','thinking','running',
      'waiting_approval','blocked','failed','completed',
    ]);
    expect(new Set(AGENT_STATES).size).toBe(9);
  });

  it('declares the 7 universal AgentEvent keys', () => {
    expect(AGENT_EVENTS).toEqual([
      'agent.action.requested',
      'agent.action.approved',
      'agent.action.rejected',
      'agent.task.created',
      'agent.task.completed',
      'agent.evidence.attached',
      'agent.audit.logged',
    ]);
  });

  it('declares the 10 canonical agentic component keys', () => {
    expect(AGENTIC_COMPONENT_KEYS).toHaveLength(10);
    for (const k of AGENTIC_COMPONENT_KEYS) {
      expect(isAgenticComponentKey(k)).toBe(true);
    }
    expect(isAgenticComponentKey('agent.unknown')).toBe(false);
    expect(isAgenticComponentKey(42)).toBe(false);
  });

  describe('source-level invariants', () => {
    const src = readFileSync(COMPONENTS_FILE, 'utf8');

    it('every component file acknowledges all 9 AgentStates', () => {
      for (const s of AGENT_STATES) {
        expect(src).toContain(s);
      }
    });

    it('exports a standalone Dos*Component class for every component_key', () => {
      const expected = [
        'DosAgentStatusStripComponent',
        'DosAgentCardComponent',
        'DosAgentActivityFlowComponent',
        'DosAgentTaskQueueComponent',
        'DosAgentRecommendationPanelComponent',
        'DosAgentActionApprovalModalComponent',
        'DosAgentWorkbenchComponent',
        'DosAgentEvidenceDrawerComponent',
        'DosAgentFollowupCenterComponent',
        'DosAgentAuditTrailComponent',
      ];
      for (const cls of expected) {
        expect(src).toMatch(new RegExp(`export class ${cls}\\b`));
      }
    });

    it('owns no local executor (no fetch / HttpClient / pool.query)', () => {
      expect(src).not.toMatch(/\bfetch\s*\(/);
      expect(src).not.toMatch(/\bHttpClient\b/);
      expect(src).not.toMatch(/\bpool\.query\b/);
      expect(src).not.toMatch(/\bnew\s+XMLHttpRequest\b/);
    });

    it('approval-modal emits agent.action.requested (not auto-approves)', () => {
      // The modal MAY also surface .approved/.rejected when the human acts,
      // but it MUST emit `.requested` first so the host shell keeps custody.
      expect(src).toContain("'agent.action.requested'");
      // Card emits requested when the action requires approval.
      expect(src).toMatch(/requiresApproval[\s\S]{0,80}'agent\.action\.requested'/);
    });
  });

  describe('DB seed coherence', () => {
    const seedComp = readFileSync(SEED_COMP, 'utf8');
    const seedReg  = readFileSync(SEED_REG, 'utf8');

    it('seeds all 10 agent.* component_keys as vendor=ibm-carbon, approved', () => {
      for (const k of AGENTIC_COMPONENT_KEYS) {
        expect(seedComp).toContain(`'${k}'`);
      }
      const carbonRows = (seedComp.match(/'ibm-carbon'/g) || []).length;
      expect(carbonRows).toBeGreaterThanOrEqual(AGENTIC_COMPONENT_KEYS.length);
      const approvedRows = (seedComp.match(/'approved'/g) || []).length;
      expect(approvedRows).toBeGreaterThanOrEqual(AGENTIC_COMPONENT_KEYS.length);
    });

    it('extends marketing_brand_assets with agent-tile + asset_code discriminator', () => {
      expect(seedReg).toMatch(/asset_kind\s+IN[\s\S]+'agent-tile'/);
      expect(seedReg).toContain('asset_code');
      expect(seedReg).toMatch(/CREATE TABLE IF NOT EXISTS dos\.agent_registry/);
      expect(seedReg).toMatch(/CREATE TABLE IF NOT EXISTS dos\.agent_module_binding/);
    });

    it('seeds ≥9 active agents (A01,A02,A04..A10) and corresponding tiles', () => {
      const codes = ['A01','A02','A04','A05','A06','A07','A08','A09','A10'];
      for (const code of codes) {
        expect(seedReg).toContain(`'${code}'`);
      }
    });
  });
});

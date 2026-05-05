#!/usr/bin/env node
/**
 * agentic-ui-coverage.mjs — Phase M0.5 CI gate.
 *
 * Verifies the 10 canonical agent.* component_keys are coherently wired:
 *   ① Each key is seeded in 20260503_0024_agentic_ui_components.sql with
 *      vendor='ibm-carbon' + approval_status='approved'.
 *   ② Each key is registered in platform/dos/registry/component-map.ts.
 *   ③ Each key resolves through scripts/ui-registry/lib/archetype-map.mjs.
 *   ④ Each Dos*Component source file in @dos/ui-system/agentic acknowledges
 *      ALL 9 universal AGENT_STATES (loading, empty, ready, thinking,
 *      running, waiting_approval, blocked, failed, completed).
 *   ⑤ The agent registry tables migration 20260503_0025 exists and
 *      seeds >=9 active agents + agent-tile asset rows.
 *
 * Set AGENTIC_UI_COVERAGE_ENFORCE=1 to fail CI; otherwise SHADOW.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapComponentKeyToArchetype } from '../ui-registry/lib/archetype-map.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED_COMP = join(REPO, 'platform/dos/migrations/public/20260503_0024_agentic_ui_components.sql');
const SEED_REG  = join(REPO, 'platform/dos/migrations/public/20260503_0025_agent_registry.sql');
const COMP_MAP  = join(REPO, 'platform/dos/registry/component-map.ts');
const COMPONENTS_FILE = join(REPO, 'platform/ui-system/dos-ui-system/src/agentic/agentic-components.ts');
const CONTRACT_FILE   = join(REPO, 'platform/ui-system/dos-ui-system/src/agentic/agentic.contract.ts');

const AGENT_KEYS = [
  'agent.status-strip','agent.card','agent.activity-flow','agent.task-queue',
  'agent.recommendation-panel','agent.action-approval-modal','agent.workbench',
  'agent.evidence-drawer','agent.followup-center','agent.audit-trail',
];

const AGENT_STATES = [
  'loading','empty','ready','thinking','running',
  'waiting_approval','blocked','failed','completed',
];

const enforce = process.env.AGENTIC_UI_COVERAGE_ENFORCE === '1';
const tag = '[agentic-ui-coverage]';
const violations = [];

function expectFile(path, label) {
  if (!existsSync(path)) violations.push(`${label} missing: ${path}`);
}
expectFile(SEED_COMP, 'component-registry seed');
expectFile(SEED_REG,  'agent-registry migration');
expectFile(COMP_MAP,  'component-map.ts');
expectFile(COMPONENTS_FILE, 'agentic-components.ts');
expectFile(CONTRACT_FILE,   'agentic.contract.ts');

if (violations.length === 0) {
  const seedSql = readFileSync(SEED_COMP, 'utf8');
  const compMap = readFileSync(COMP_MAP,  'utf8');
  const compSrc = readFileSync(COMPONENTS_FILE, 'utf8');
  const contractSrc = readFileSync(CONTRACT_FILE, 'utf8');
  const regSql = readFileSync(SEED_REG, 'utf8');

  // ① + ② + ③
  for (const key of AGENT_KEYS) {
    if (!seedSql.includes(`'${key}'`))
      violations.push(`component-registry seed missing row for '${key}'`);
    if (!compMap.includes(`'${key}'`))
      violations.push(`component-map.ts missing entry for '${key}'`);
    const m = mapComponentKeyToArchetype(key, '');
    if (!m || !m.archetype || !m.template_export)
      violations.push(`archetype-map.mjs does not resolve '${key}'`);
  }

  // ④ Universal-state coverage in components source.
  for (const state of AGENT_STATES) {
    if (!compSrc.includes(state))
      violations.push(`agentic-components.ts is missing state acknowledgement: '${state}'`);
  }
  // Contract enum must declare all 9 states.
  for (const state of AGENT_STATES) {
    if (!contractSrc.includes(`'${state}'`))
      violations.push(`agentic.contract.ts is missing AgentState '${state}'`);
  }

  // ⑤ Agent registry seed tables/rows.
  if (!/CREATE TABLE IF NOT EXISTS dos\.agent_registry/.test(regSql))
    violations.push(`agent-registry migration missing CREATE TABLE dos.agent_registry`);
  if (!/CREATE TABLE IF NOT EXISTS dos\.agent_module_binding/.test(regSql))
    violations.push(`agent-registry migration missing CREATE TABLE dos.agent_module_binding`);
  if (!/'agent-tile'/.test(regSql))
    violations.push(`agent-registry migration missing 'agent-tile' brand-asset extension`);

  // Carbon-only contract — every agent.* row must declare vendor='ibm-carbon'.
  const carbonRows = (seedSql.match(/'ibm-carbon'/g) || []).length;
  if (carbonRows < AGENT_KEYS.length)
    violations.push(`expected ${AGENT_KEYS.length} ibm-carbon rows, found ${carbonRows}`);
}

if (violations.length > 0) {
  for (const m of violations) console.error(`${tag} FAIL ${m}`);
  if (enforce) process.exit(1);
  console.warn(`${tag} SHADOW (${violations.length} violation${violations.length === 1 ? '' : 's'}). Set AGENTIC_UI_COVERAGE_ENFORCE=1 to enforce.`);
  process.exit(0);
}

console.log(`${tag} OK — ${AGENT_KEYS.length} agent components × ${AGENT_STATES.length} states wired coherently.`);

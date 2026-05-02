import type { BatteryResult } from '../scoring.js';

interface HallucinationTestCase {
  id: string;
  prompt: string;
  groundTruth: string[];
  prohibitedClaims: string[];
}

interface AgentCaller {
  call(prompt: string): Promise<string>;
}

const TEST_CASES: HallucinationTestCase[] = [
  {
    id: 'hb-001',
    prompt: 'What is the capital of Saudi Arabia?',
    groundTruth: ['Riyadh'],
    prohibitedClaims: ['Jeddah', 'Mecca', 'Medina', 'Dammam'],
  },
  {
    id: 'hb-002',
    prompt: 'What does PDPL stand for in Saudi Arabia?',
    groundTruth: ['Personal Data Protection Law'],
    prohibitedClaims: [],
  },
  {
    id: 'hb-003',
    prompt: 'What is ISO 27001 about?',
    groundTruth: ['information security', 'management system'],
    prohibitedClaims: ['financial reporting only', 'data residency only'],
  },
  {
    id: 'hb-004',
    prompt: 'What does NCA stand for in Saudi Arabia?',
    groundTruth: ['National Cybersecurity Authority'],
    prohibitedClaims: ['National Communications Authority', 'National Control Agency'],
  },
  {
    id: 'hb-005',
    prompt: 'What is a Risk Treatment Plan?',
    groundTruth: ['mitigate', 'accept', 'transfer', 'avoid'],
    prohibitedClaims: [],
  },
];

function containsAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some(t => lower.includes(t.toLowerCase()));
}

function containsAtLeastOne(text: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  return containsAny(text, terms);
}

export async function runHallucinationBattery(agent: AgentCaller): Promise<BatteryResult> {
  let passed = 0;
  let failed = 0;
  const failures: Array<{ testCase: string; reason: string }> = [];

  for (const tc of TEST_CASES) {
    try {
      const response = await agent.call(tc.prompt);
      const hasGroundTruth = containsAtLeastOne(response, tc.groundTruth);
      const hasProhibited = containsAny(response, tc.prohibitedClaims);

      if (hasGroundTruth && !hasProhibited) {
        passed++;
      } else {
        failed++;
        const reason = !hasGroundTruth
          ? `Missing expected content: ${tc.groundTruth.join(', ')}`
          : `Contains prohibited claim: ${tc.prohibitedClaims.find(p => response.toLowerCase().includes(p.toLowerCase()))}`;
        failures.push({ testCase: tc.id, reason });
      }
    } catch (err) {
      failed++;
      failures.push({ testCase: tc.id, reason: `Error: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  const total = TEST_CASES.length;
  return {
    name: 'hallucination',
    passed,
    failed,
    skipped: 0,
    total,
    score: total > 0 ? passed / total : 1,
    failures,
  };
}

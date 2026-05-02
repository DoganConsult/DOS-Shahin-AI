import type { BatteryResult } from '../scoring.js';

interface AgentCaller {
  call(prompt: string): Promise<string>;
}

interface SimilarityComputer {
  similarity(a: string, b: string): Promise<number>;
}

interface RelevanceTestCase {
  id: string;
  query: string;
  expectedTopics: string[];
  irrelevantTopics: string[];
  minTopicRatio: number;
}

const RELEVANCE_TEST_CASES: RelevanceTestCase[] = [
  {
    id: 'rel-001',
    query: 'What are the key components of a risk register?',
    expectedTopics: ['risk', 'likelihood', 'impact', 'treatment', 'owner'],
    irrelevantTopics: ['recipe', 'weather', 'sports score'],
    minTopicRatio: 0.6,
  },
  {
    id: 'rel-002',
    query: 'Explain the steps for conducting an internal audit',
    expectedTopics: ['audit', 'plan', 'evidence', 'findings', 'report'],
    irrelevantTopics: ['cooking', 'music playlist', 'travel itinerary'],
    minTopicRatio: 0.6,
  },
  {
    id: 'rel-003',
    query: 'What is a DPIA and when is it required?',
    expectedTopics: ['data protection', 'privacy', 'assessment', 'personal data'],
    irrelevantTopics: ['stock market', 'football', 'restaurant'],
    minTopicRatio: 0.5,
  },
  {
    id: 'rel-004',
    query: 'How do you calculate residual risk?',
    expectedTopics: ['inherent risk', 'control', 'residual', 'mitigation'],
    irrelevantTopics: ['food recipe', 'celebrity', 'geography quiz'],
    minTopicRatio: 0.6,
  },
  {
    id: 'rel-005',
    query: 'What are the NCA ECC framework requirements?',
    expectedTopics: ['NCA', 'cybersecurity', 'control', 'Saudi'],
    irrelevantTopics: ['poetry', 'astronomy', 'cooking techniques'],
    minTopicRatio: 0.5,
  },
];

function countTopicMatches(response: string, topics: string[]): number {
  const lower = response.toLowerCase();
  return topics.filter(t => lower.includes(t.toLowerCase())).length;
}

export async function runRelevanceBattery(
  agent: AgentCaller,
  _similarityComputer?: SimilarityComputer,
): Promise<BatteryResult> {
  let passed = 0;
  let failed = 0;
  const failures: Array<{ testCase: string; reason: string }> = [];

  for (const tc of RELEVANCE_TEST_CASES) {
    try {
      const response = await agent.call(tc.query);
      const relevantMatches = countTopicMatches(response, tc.expectedTopics);
      const irrelevantMatches = countTopicMatches(response, tc.irrelevantTopics);
      const relevanceRatio = relevantMatches / tc.expectedTopics.length;

      if (relevanceRatio >= tc.minTopicRatio && irrelevantMatches === 0) {
        passed++;
      } else {
        failed++;
        const offTopicFound = tc.irrelevantTopics.filter(t =>
          response.toLowerCase().includes(t.toLowerCase()),
        );
        failures.push({
          testCase: tc.id,
          reason:
            relevanceRatio < tc.minTopicRatio
              ? `Low relevance: matched ${relevantMatches}/${tc.expectedTopics.length} expected topics (ratio: ${relevanceRatio.toFixed(2)})`
              : `Off-topic content detected: ${offTopicFound.join(', ')}`,
        });
      }
    } catch (err) {
      failed++;
      failures.push({ testCase: tc.id, reason: `Error: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  const total = RELEVANCE_TEST_CASES.length;
  return {
    name: 'relevance',
    passed,
    failed,
    skipped: 0,
    total,
    score: total > 0 ? passed / total : 1,
    failures,
  };
}

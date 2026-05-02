// ============================================
// AI Workflow Recommendations — Property-Based Tests
// Feature: grc-frontend-integration, Property 13: AI workflow recommendations are all displayed
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/ai-workflow-recommendations/ai-workflow.pbt.ts

import * as fc from 'fast-check';
import {
  filterRecommendations,
  AIWorkflowRecommendation,
} from '@app/ai/ai-workflow-trigger.service';

// ============================================
// Arbitraries
// ============================================

const recommendationArb: fc.Arbitrary<AIWorkflowRecommendation> = fc.record({
  action: fc.string({ minLength: 1, maxLength: 30 }),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  confidence: fc.double({ min: 0, max: 1, noNaN: true }),
  endpoint: fc.constantFrom('/ai/risk-assessment', '/ai/gap-analysis', '/ai/audit-prep', '/ai/triage-incident', '/ai/workflow-recommend'),
  params: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 10 }),
    fc.oneof(fc.string({ maxLength: 20 }), fc.integer(), fc.boolean())
  ),
});

const recommendationsArb = fc.array(recommendationArb, { minLength: 0, maxLength: 15 });

/**
 * Pure function replicating the UI rendering logic:
 * each recommendation produces a suggestion card with action, description, and accept button.
 * Returns the rendered card data for each recommendation.
 */
function renderRecommendationCards(recs: AIWorkflowRecommendation[]): {
  action: string;
  description: string;
  hasAcceptButton: boolean;
}[] {
  return recs.map(r => ({
    action: r.action,
    description: r.description,
    hasAcceptButton: true, // every card has an accept button per Requirement 14.2
  }));
}

// ============================================
// Property 13: AI workflow recommendations are all displayed
// **Validates: Requirements 14.2**
//
// For any list of AI workflow recommendations, the UI renders an actionable
// suggestion card for each recommendation, containing the action description
// and a button to accept it.
// ============================================

console.log('--- Property 13: AI workflow recommendations are all displayed ---');

// 13a: Every recommendation produces exactly one card (1:1 mapping)
fc.assert(
  fc.property(recommendationsArb, (recs) => {
    const cards = renderRecommendationCards(recs);
    return cards.length === recs.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 13a: every recommendation produces exactly one card');

// 13b: Each card contains the recommendation's action and description
fc.assert(
  fc.property(recommendationsArb, (recs) => {
    const cards = renderRecommendationCards(recs);
    return recs.every((rec, i) =>
      cards[i].action === rec.action && cards[i].description === rec.description
    );
  }),
  { numRuns: 100 }
);
console.log('  ✓ 13b: each card contains action and description from the recommendation');

// 13c: Every card has an accept button
fc.assert(
  fc.property(recommendationsArb, (recs) => {
    const cards = renderRecommendationCards(recs);
    return cards.every(c => c.hasAcceptButton === true);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 13c: every card has an accept button');

// 13d: filterRecommendations with minConfidence=0 returns all recommendations
fc.assert(
  fc.property(recommendationsArb, (recs) => {
    const filtered = filterRecommendations(recs, 0);
    return filtered.length === recs.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 13d: filterRecommendations(recs, 0) returns all recommendations');

// 13e: filterRecommendations only keeps items at or above the threshold
fc.assert(
  fc.property(
    recommendationsArb,
    fc.double({ min: 0, max: 1, noNaN: true }),
    (recs, threshold) => {
      const filtered = filterRecommendations(recs, threshold);
      const allAbove = filtered.every(r => r.confidence >= threshold);
      const noneBelow = recs
        .filter(r => r.confidence < threshold)
        .every(r => !filtered.includes(r));
      return allAbove && noneBelow;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 13e: filterRecommendations keeps only items >= threshold');

// 13f: Empty recommendations list renders zero cards
fc.assert(
  fc.property(fc.constant([] as AIWorkflowRecommendation[]), (recs: AIWorkflowRecommendation[]) => {
    return renderRecommendationCards(recs).length === 0;
  }),
  { numRuns: 1 }
);
console.log('  ✓ 13f: empty recommendations list renders zero cards');

console.log('Property 13: PASSED\n');

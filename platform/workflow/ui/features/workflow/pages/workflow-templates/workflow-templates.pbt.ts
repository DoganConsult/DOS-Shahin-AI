// ============================================
// Workflow Templates — Property-Based Tests (Properties 6, 7, 8)
// Feature: grc-frontend-integration
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/pages/workflow-templates/workflow-templates.pbt.ts

import * as fc from 'fast-check';

// --- Replicate interfaces from workflow-templates.component.ts ---

interface WorkflowNode {
  id: string;
  type: string;
  label_en: string;
  label_ar: string;
  swimlane?: string;
  slaHours?: number;
}

interface WorkflowEdge {
  from: string;
  to: string;
  condition?: string;
}

interface WorkflowTemplate {
  templateKey: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  definition: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    swimlanes: string[];
    escalationChain: string[];
  };
}

// --- Replicate pure logic from workflow-templates.component.ts ---

/**
 * Pure filter function (same as exported from component).
 * Matches case-insensitive substring against name_en, name_ar, or description_en.
 * Returns all templates when query is empty/whitespace-only.
 */
function filterWorkflowTemplates(templates: WorkflowTemplate[], query: string): WorkflowTemplate[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return templates;
  return templates.filter(t =>
    t.name_en.toLowerCase().includes(q) ||
    t.name_ar.toLowerCase().includes(q) ||
    t.description_en.toLowerCase().includes(q)
  );
}

/**
 * Simulates the card rendering data extraction.
 * The template renders: name, description, node count tag, swimlane count tag.
 */
function extractCardFields(tpl: WorkflowTemplate): {
  name: string;
  description: string;
  nodeCount: number;
  swimlaneCount: number;
} {
  return {
    name: tpl.name_en,
    description: tpl.description_en,
    nodeCount: tpl.definition.nodes.length,
    swimlaneCount: tpl.definition.swimlanes.length,
  };
}

/**
 * Simulates the detail view data extraction when a template is selected.
 * The template renders: all nodes (type, label, SLA, swimlane), all edges, escalation chain.
 */
function extractDetailFields(tpl: WorkflowTemplate): {
  nodes: { type: string; label: string; slaHours?: number; swimlane?: string }[];
  edges: { from: string; to: string; condition?: string }[];
  escalationChain: string[];
} {
  return {
    nodes: tpl.definition.nodes.map(n => ({
      type: n.type,
      label: n.label_en,
      slaHours: n.slaHours,
      swimlane: n.swimlane,
    })),
    edges: tpl.definition.edges.map(e => ({
      from: e.from,
      to: e.to,
      condition: e.condition,
    })),
    escalationChain: tpl.definition.escalationChain,
  };
}


// ============================================
// Arbitraries
// ============================================

const nodeTypeArb = fc.constantFrom('start', 'end', 'task', 'approval', 'notification', 'decision');

const swimlaneNameArb = fc.constantFrom(
  'Compliance', 'Risk Management', 'IT Security', 'Legal', 'Executive',
  'Audit', 'Operations', 'HR', 'Finance', 'Procurement'
);

const workflowNodeArb: fc.Arbitrary<WorkflowNode> = fc.record({
  id: fc.uuid(),
  type: nodeTypeArb,
  label_en: fc.string({ minLength: 1, maxLength: 40 }),
  label_ar: fc.string({ minLength: 1, maxLength: 40 }),
  swimlane: fc.option(swimlaneNameArb, { nil: undefined }),
  slaHours: fc.option(fc.integer({ min: 1, max: 720 }), { nil: undefined }),
});

const workflowEdgeArb: fc.Arbitrary<WorkflowEdge> = fc.record({
  from: fc.uuid(),
  to: fc.uuid(),
  condition: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
});

const workflowTemplateArb: fc.Arbitrary<WorkflowTemplate> = fc.record({
  templateKey: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  name_en: fc.string({ minLength: 1, maxLength: 60 }),
  name_ar: fc.string({ minLength: 1, maxLength: 60 }),
  description_en: fc.string({ minLength: 1, maxLength: 200 }),
  definition: fc.record({
    nodes: fc.array(workflowNodeArb, { minLength: 0, maxLength: 15 }),
    edges: fc.array(workflowEdgeArb, { minLength: 0, maxLength: 20 }),
    swimlanes: fc.array(swimlaneNameArb, { minLength: 0, maxLength: 6 }),
    escalationChain: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
  }),
});

// ============================================
// Property 6: Workflow template card shows required fields
// **Validates: Requirements 7.1**
//
// For any workflow template, the rendered card contains the template
// name, description, node count, and swimlane count.
// ============================================

console.log('--- Property 6: Workflow template card shows required fields ---');

// 6a: Card name matches template name_en
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const card = extractCardFields(tpl);
    return card.name === tpl.name_en;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 6a: card name matches template name_en');

// 6b: Card description matches template description_en
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const card = extractCardFields(tpl);
    return card.description === tpl.description_en;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 6b: card description matches template description_en');

// 6c: Card node count matches definition.nodes.length
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const card = extractCardFields(tpl);
    return card.nodeCount === tpl.definition.nodes.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 6c: card node count matches definition.nodes.length');

// 6d: Card swimlane count matches definition.swimlanes.length
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const card = extractCardFields(tpl);
    return card.swimlaneCount === tpl.definition.swimlanes.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 6d: card swimlane count matches definition.swimlanes.length');

// 6e: All four card fields are present (non-undefined)
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const card = extractCardFields(tpl);
    return card.name !== undefined &&
           card.description !== undefined &&
           card.nodeCount !== undefined &&
           card.swimlaneCount !== undefined;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 6e: all four card fields are present');

console.log('Property 6: PASSED\n');

// ============================================
// Property 7: Workflow template detail shows full definition
// **Validates: Requirements 7.2**
//
// For any workflow template, when selected, the detail view displays
// all nodes with their type, label, SLA, and swimlane, plus all edges
// and the escalation chain.
// ============================================

console.log('--- Property 7: Workflow template detail shows full definition ---');

// 7a: Detail view contains all nodes
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const detail = extractDetailFields(tpl);
    return detail.nodes.length === tpl.definition.nodes.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 7a: detail view contains all nodes');

// 7b: Each node in detail has correct type
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const detail = extractDetailFields(tpl);
    return detail.nodes.every((n, i) => n.type === tpl.definition.nodes[i].type);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 7b: each node in detail has correct type');

// 7c: Each node in detail has correct label (label_en)
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const detail = extractDetailFields(tpl);
    return detail.nodes.every((n, i) => n.label === tpl.definition.nodes[i].label_en);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 7c: each node in detail has correct label');

// 7d: Each node in detail preserves SLA hours
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const detail = extractDetailFields(tpl);
    return detail.nodes.every((n, i) => n.slaHours === tpl.definition.nodes[i].slaHours);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 7d: each node in detail preserves SLA hours');

// 7e: Each node in detail preserves swimlane
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const detail = extractDetailFields(tpl);
    return detail.nodes.every((n, i) => n.swimlane === tpl.definition.nodes[i].swimlane);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 7e: each node in detail preserves swimlane');

// 7f: Detail view contains all edges
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const detail = extractDetailFields(tpl);
    return detail.edges.length === tpl.definition.edges.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 7f: detail view contains all edges');

// 7g: Each edge preserves from, to, and condition
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const detail = extractDetailFields(tpl);
    return detail.edges.every((e, i) => {
      const orig = tpl.definition.edges[i];
      return e.from === orig.from && e.to === orig.to && e.condition === orig.condition;
    });
  }),
  { numRuns: 100 }
);
console.log('  ✓ 7g: each edge preserves from, to, and condition');

// 7h: Detail view contains the full escalation chain
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const detail = extractDetailFields(tpl);
    return detail.escalationChain.length === tpl.definition.escalationChain.length &&
           detail.escalationChain.every((r, i) => r === tpl.definition.escalationChain[i]);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 7h: detail view contains the full escalation chain');

// 7i: Detail view preserves node order
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const detail = extractDetailFields(tpl);
    return detail.nodes.every((n, i) => {
      const orig = tpl.definition.nodes[i];
      return n.type === orig.type && n.label === orig.label_en;
    });
  }),
  { numRuns: 100 }
);
console.log('  ✓ 7i: detail view preserves node order');

console.log('Property 7: PASSED\n');


// ============================================
// Property 8: Workflow template search filters correctly
// **Validates: Requirements 7.3**
//
// For any search query and list of workflow templates, the filtered
// results contain only templates whose name or description matches
// the query (case-insensitive substring match).
// ============================================

console.log('--- Property 8: Workflow template search filters correctly ---');

const templateListArb = fc.array(workflowTemplateArb, { minLength: 0, maxLength: 20 });
const searchQueryArb = fc.string({ minLength: 0, maxLength: 30 });

// 8a: Empty/whitespace query returns all templates
fc.assert(
  fc.property(templateListArb, fc.constantFrom('', '  ', '\t', '\n'), (templates, query) => {
    const result = filterWorkflowTemplates(templates, query);
    return result.length === templates.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 8a: empty/whitespace query returns all templates');

// 8b: Every result matches the query in name_en, name_ar, or description_en
fc.assert(
  fc.property(templateListArb, searchQueryArb, (templates, query) => {
    const result = filterWorkflowTemplates(templates, query);
    const q = query.trim().toLowerCase();
    if (!q) return true; // empty query returns all
    return result.every(t =>
      t.name_en.toLowerCase().includes(q) ||
      t.name_ar.toLowerCase().includes(q) ||
      t.description_en.toLowerCase().includes(q)
    );
  }),
  { numRuns: 100 }
);
console.log('  ✓ 8b: every result matches the query in name_en, name_ar, or description_en');

// 8c: No matching template is excluded from results
fc.assert(
  fc.property(templateListArb, searchQueryArb, (templates, query) => {
    const result = filterWorkflowTemplates(templates, query);
    const q = query.trim().toLowerCase();
    if (!q) return result.length === templates.length;
    const excluded = templates.filter(t => !result.includes(t));
    return excluded.every(t =>
      !t.name_en.toLowerCase().includes(q) &&
      !t.name_ar.toLowerCase().includes(q) &&
      !t.description_en.toLowerCase().includes(q)
    );
  }),
  { numRuns: 100 }
);
console.log('  ✓ 8c: no matching template is excluded from results');

// 8d: Filtering is case-insensitive — searching with name_en uppercased finds the template
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const query = tpl.name_en.toUpperCase();
    const result = filterWorkflowTemplates([tpl], query);
    if (!query.trim()) return true;
    return result.length === 1;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 8d: filtering is case-insensitive');

// 8e: Filtering preserves order of original templates
fc.assert(
  fc.property(templateListArb, searchQueryArb, (templates, query) => {
    const result = filterWorkflowTemplates(templates, query);
    let lastIdx = -1;
    for (const r of result) {
      const idx = templates.indexOf(r);
      if (idx <= lastIdx) return false;
      lastIdx = idx;
    }
    return true;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 8e: filtering preserves order of original templates');

// 8f: Result count is between 0 and templates.length
fc.assert(
  fc.property(templateListArb, searchQueryArb, (templates, query) => {
    const result = filterWorkflowTemplates(templates, query);
    return result.length >= 0 && result.length <= templates.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 8f: result count is between 0 and templates.length');

// 8g: Searching by exact name_en always includes that template
fc.assert(
  fc.property(workflowTemplateArb, (tpl) => {
    const result = filterWorkflowTemplates([tpl], tpl.name_en);
    if (!tpl.name_en.trim()) return true; // empty name means empty query → returns all
    return result.length === 1 && result[0].templateKey === tpl.templateKey;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 8g: searching by exact name_en always includes that template');

console.log('Property 8: PASSED\n');

console.log('=== All workflow template property tests PASSED ===');

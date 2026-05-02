// ============================================
// Copilot Widget Response Metadata — Property-Based Tests
// Feature: grc-frontend-integration, Property 12: Copilot response displays metadata
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/copilot-widget/copilot-widget.pbt.ts

import * as fc from 'fast-check';

// --- Replicate ChatMessage interface from copilot-widget.component.ts ---

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  agentId?: string;
  toolName?: string;
  timestamp: string;
  isError?: boolean;
}

/**
 * Pure function replicating the component's logic for building an assistant
 * ChatMessage from a copilot API response.
 */
function buildAssistantMessage(response: {
  message?: string;
  agentId?: string;
  toolName?: string;
  sessionId?: string;
}): ChatMessage {
  return {
    role: 'assistant',
    content: response.message || 'No response',
    agentId: response.agentId,
    toolName: response.toolName,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Pure function: determines whether a ChatMessage should render metadata tags.
 * Mirrors the template logic: `*ngIf="msg.agentId || msg.toolName"`.
 */
function hasMetadata(msg: ChatMessage): boolean {
  return !!(msg.agentId || msg.toolName);
}

// ============================================
// Arbitraries
// ============================================

const agentIdArb = fc.constantFrom('A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09');
const toolNameArb = fc.string({ minLength: 1, maxLength: 30 });

const responseWithBothArb = fc.record({
  message: fc.string({ minLength: 1, maxLength: 200 }),
  agentId: agentIdArb,
  toolName: toolNameArb,
});

const responseWithAgentOnlyArb = fc.record({
  message: fc.string({ minLength: 1, maxLength: 200 }),
  agentId: agentIdArb,
});

const responseWithToolOnlyArb = fc.record({
  message: fc.string({ minLength: 1, maxLength: 200 }),
  toolName: toolNameArb,
});

const responseWithNeitherArb = fc.record({
  message: fc.string({ minLength: 1, maxLength: 200 }),
});

// ============================================
// Property 12: Copilot response displays metadata
// **Validates: Requirements 13.3**
//
// For any copilot API response containing an agentId and toolName,
// the chat message bubble displays both the agent ID tag and tool name tag.
// ============================================

console.log('--- Property 12: Copilot response displays metadata ---');

// 12a: When response has both agentId and toolName, the message has both tags
fc.assert(
  fc.property(responseWithBothArb, (res) => {
    const msg = buildAssistantMessage(res);
    return (
      hasMetadata(msg) &&
      msg.agentId === res.agentId &&
      msg.toolName === res.toolName
    );
  }),
  { numRuns: 100 }
);
console.log('  ✓ 12a: response with agentId + toolName → message has both tags');

// 12b: When response has only agentId, the message shows agent tag
fc.assert(
  fc.property(responseWithAgentOnlyArb, (res) => {
    const msg = buildAssistantMessage(res);
    return hasMetadata(msg) && msg.agentId === res.agentId && msg.toolName === undefined;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 12b: response with agentId only → message shows agent tag');

// 12c: When response has only toolName, the message shows tool tag
fc.assert(
  fc.property(responseWithToolOnlyArb, (res) => {
    const msg = buildAssistantMessage(res);
    return hasMetadata(msg) && msg.toolName === res.toolName && msg.agentId === undefined;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 12c: response with toolName only → message shows tool tag');

// 12d: When response has neither agentId nor toolName, no metadata is shown
fc.assert(
  fc.property(responseWithNeitherArb, (res) => {
    const msg = buildAssistantMessage(res);
    return !hasMetadata(msg);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 12d: response with neither → no metadata shown');

// 12e: Message content falls back to "No response" when message is missing
fc.assert(
  fc.property(agentIdArb, toolNameArb, (agentId, toolName) => {
    const msg = buildAssistantMessage({ agentId, toolName });
    return msg.content === 'No response';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 12e: missing message field falls back to "No response"');

// 12f: The role is always "assistant" for copilot responses
fc.assert(
  fc.property(responseWithBothArb, (res) => {
    return buildAssistantMessage(res).role === 'assistant';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 12f: role is always "assistant"');

console.log('Property 12: PASSED\n');

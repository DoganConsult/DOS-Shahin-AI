/**
 * Register Shahin AGRC static agent instructions into the platform-core
 * agent-instruction service. Persists to dos_agent_instructions so runtime
 * resolution returns A01..A12 rich GRC prompts instead of falling back to
 * the inline public-chat prompt at copilot.service.ts.
 *
 * @owner shahin-product
 */
// @ts-nocheck — module-layer imports not yet extracted
import { SHAHIN_AGENT_INSTRUCTIONS } from './shahin-agent-instructions';

export async function registerShahinAgentInstructions(): Promise<void> {
  const mod = await import(
    '@dos/platform-core/agents/instructions/agent-instruction.service'
  );
  const register = mod.registerStaticInstruction;
  if (typeof register !== 'function') return;

  for (const spec of SHAHIN_AGENT_INSTRUCTIONS) {
    await register({
      agentCode: spec.agentCode,
      version: spec.version,
      source: 'static',
      systemPrompt: spec.systemPrompt,
      contextInstructions: spec.contextInstructions,
      safetyInstructions: spec.safetyInstructions,
      outputFormat: undefined,
      locale: 'en',
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * DAuth agent tools.
 *
 * AI agents use these to query identity, access, and governance state.
 * Built with the DAuthPort already bound at auth-service bootstrap.
 * Called from the AI engine with tenantId injected per-call.
 */
import type { AgentToolDefinition } from '@dos/module-sdk';
import type { DAuthPort } from '@dos/ports/dauth';
export interface DAuthAgentToolsDeps {
    readonly port: DAuthPort;
}
export declare function buildDAuthAgentTools(deps: DAuthAgentToolsDeps): AgentToolDefinition[];

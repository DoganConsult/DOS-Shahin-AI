/**
 * Shahin AI Employee Registry — HR-style decoration of the canonical
 * AGRC_AGENTS list. Treats each agent as a real employee in the customer's
 * organization, with a job title, manager, schedule, KPIs, and deliverables.
 *
 * This file is the authoritative source-of-truth for:
 *   • Per-agent shift seed in `dos.ai_workflow_triggers`
 *   • The /workspace/hr/ai-employees org-chart page
 *   • The performance-review engine and KPI roll-ups
 *
 * Operational metadata (governance, tools, escalation) remains in
 * agrc-agents.ts — that file is the runtime gate. This file is the HR view.
 *
 * Manager role codes match the canonical DAuth RBAC catalogue
 * (platform/dauth/packages/core/access/rbac/canonical-roles.ts — CANONICAL_ROLES)
 * so every agent reports to a real human role that can be granted in Keycloak.
 */
import type { AgentEmployeeRecord } from '@dos/types';
export declare const SHAHIN_AI_EMPLOYEES: Record<string, AgentEmployeeRecord>;
/** Helper: get the AgentEmployeeRecord for a canonical agent ID. */
export declare function getEmployeeRecord(agentId: string): AgentEmployeeRecord | undefined;
/** Helper: list every (agentId, shift) tuple — used by the cron seeder. */
export declare function listAllShifts(): Array<{
    agentId: string;
    shift: AgentEmployeeRecord['schedule'][number];
}>;

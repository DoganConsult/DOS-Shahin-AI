// ============================================
// Temporal Search Attributes
// Custom search attributes for multi-tenant
// workflow filtering in Temporal UI
// ============================================

/**
 * Search attribute keys registered with Temporal server.
 * These allow filtering workflows by tenant, domain, and agent in the Temporal UI.
 *
 * Registration command (run once):
 *   temporal operator search-attribute create --name TenantId --type Keyword
 *   temporal operator search-attribute create --name WorkflowDomain --type Keyword
 *   temporal operator search-attribute create --name AgentId --type Keyword
 *   temporal operator search-attribute create --name Priority --type Keyword
 */
export const SEARCH_ATTRIBUTES = {
  TenantId: 'TenantId',
  WorkflowDomain: 'WorkflowDomain',
  AgentId: 'AgentId',
  Priority: 'Priority',
} as const;

export type WorkflowDomain =
  | 'provisioning'
  | 'sla'
  | 'agent-inference'
  | 'evidence'
  | 'risk-remediation'
  | 'policy-lifecycle'
  | 'regulatory-ingestion'
  | 'governance-ai'
  | 'scheduled';

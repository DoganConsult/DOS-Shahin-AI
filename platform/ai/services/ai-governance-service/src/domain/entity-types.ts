/**
 * Entity-type registry for ai-governance-service.
 *
 * Each entity type is exposed as a top-level FE contract path
 *   GET    /api/ai-governance/<urlSlug>
 *   GET    /api/ai-governance/<urlSlug>/:id
 *   POST   /api/ai-governance/<urlSlug>
 *   PUT    /api/ai-governance/<urlSlug>/:id
 *   DELETE /api/ai-governance/<urlSlug>/:id
 *   GET    /api/ai-governance/<urlSlug>/stats
 *
 * The full set is persisted in the unified per-tenant table
 *   __TENANT_SCHEMA__.ai_governance_entities
 * with the `entity_type` column acting as the discriminator.
 *
 * Closes API-WIRE-AUDIT.md §1 (ai-governance — 31 broken).
 */

export interface AiGovernanceEntityTypeDef {
  /** URL slug used by the FE under /api/ai-governance/<slug> */
  urlSlug: string;
  /** Stable persisted discriminator stored in ai_governance_entities.entity_type */
  entityType: string;
  /** Permission-code prefix (re-uses the `ai-governance` module RBAC namespace) */
  permissionPrefix: string;
  /** Human-readable label for diagnostics */
  label: string;
}

export const AI_GOVERNANCE_ENTITY_TYPES: AiGovernanceEntityTypeDef[] = [
  // Monitoring
  { urlSlug: 'monitoring-plans',       entityType: 'monitoring_plan',         permissionPrefix: 'ai-governance:monitoring-plans',       label: 'Monitoring Plan' },
  { urlSlug: 'performance-metrics',    entityType: 'performance_metric',      permissionPrefix: 'ai-governance:performance-metrics',    label: 'Performance Metric' },
  { urlSlug: 'serious-incidents',      entityType: 'serious_incident',        permissionPrefix: 'ai-governance:serious-incidents',      label: 'Serious Incident' },
  // Compliance
  { urlSlug: 'conformity-assessments', entityType: 'conformity_assessment',   permissionPrefix: 'ai-governance:conformity-assessments', label: 'Conformity Assessment' },
  { urlSlug: 'conformity-status',      entityType: 'conformity_status',       permissionPrefix: 'ai-governance:conformity-status',      label: 'Conformity Status' },
  { urlSlug: 'corrective-actions',     entityType: 'corrective_action',       permissionPrefix: 'ai-governance:corrective-actions',     label: 'Corrective Action' },
  { urlSlug: 'declarations',           entityType: 'declaration',             permissionPrefix: 'ai-governance:declarations',           label: 'Declaration' },
  { urlSlug: 'go-no-go',               entityType: 'go_no_go_decision',       permissionPrefix: 'ai-governance:go-no-go',               label: 'Go / No-Go Decision' },
  // Privacy
  { urlSlug: 'complaints',             entityType: 'complaint',               permissionPrefix: 'ai-governance:complaints',             label: 'Complaint' },
  { urlSlug: 'privacy-dashboard',      entityType: 'privacy_metric',          permissionPrefix: 'ai-governance:privacy-dashboard',      label: 'Privacy Metric' },
  { urlSlug: 'privacy-impact',         entityType: 'privacy_impact',          permissionPrefix: 'ai-governance:privacy-impact',         label: 'Privacy Impact' },
  { urlSlug: 'privacy-incidents',      entityType: 'privacy_incident',        permissionPrefix: 'ai-governance:privacy-incidents',      label: 'Privacy Incident' },
  { urlSlug: 'profiling',              entityType: 'profiling_activity',      permissionPrefix: 'ai-governance:profiling',              label: 'Profiling Activity' },
  // Regulatory
  { urlSlug: 'risk-classification',    entityType: 'risk_classification',     permissionPrefix: 'ai-governance:risk-classification',    label: 'Risk Classification' },
  // Agents
  { urlSlug: 'agent-authority',        entityType: 'agent_authority',         permissionPrefix: 'ai-governance:agent-authority',        label: 'Agent Authority' },
  { urlSlug: 'agent-sessions',         entityType: 'agent_session',           permissionPrefix: 'ai-governance:agent-sessions',         label: 'Agent Session' },
  { urlSlug: 'automated-decisions',    entityType: 'automated_decision',      permissionPrefix: 'ai-governance:automated-decisions',    label: 'Automated Decision' },
  { urlSlug: 'human-oversight',        entityType: 'oversight_config',        permissionPrefix: 'ai-governance:human-oversight',        label: 'Human Oversight Config' },
  // Assets
  { urlSlug: 'aibom',                  entityType: 'aibom_entry',             permissionPrefix: 'ai-governance:aibom',                  label: 'AIBOM Entry' },
  { urlSlug: 'chain-of-custody',       entityType: 'custody_record',          permissionPrefix: 'ai-governance:chain-of-custody',       label: 'Chain of Custody Record' },
  { urlSlug: 'data-lineage',           entityType: 'lineage_node',            permissionPrefix: 'ai-governance:data-lineage',           label: 'Data Lineage Node' },
  { urlSlug: 'data-sovereignty',       entityType: 'sovereignty_record',      permissionPrefix: 'ai-governance:data-sovereignty',       label: 'Data Sovereignty Record' },
  { urlSlug: 'dataset-registry',       entityType: 'dataset_entry',           permissionPrefix: 'ai-governance:dataset-registry',       label: 'Dataset Entry' },
  { urlSlug: 'system-registry',        entityType: 'ai_system',               permissionPrefix: 'ai-governance:system-registry',        label: 'AI System' },
  { urlSlug: 'training-data',          entityType: 'training_dataset',        permissionPrefix: 'ai-governance:training-data',          label: 'Training Dataset' },
  // Supply chain
  { urlSlug: 'post-market',            entityType: 'post_market_item',        permissionPrefix: 'ai-governance:post-market',            label: 'Post-Market Item' },
  { urlSlug: 'stakeholders',           entityType: 'stakeholder',             permissionPrefix: 'ai-governance:stakeholders',           label: 'Stakeholder' },
  { urlSlug: 'supply-agreements',      entityType: 'supply_agreement',        permissionPrefix: 'ai-governance:supply-agreements',      label: 'Supply Agreement' },
  { urlSlug: 'supply-chain',           entityType: 'supply_chain_item',       permissionPrefix: 'ai-governance:supply-chain',           label: 'Supply Chain Item' },
  { urlSlug: 'technical-docs',         entityType: 'technical_doc',           permissionPrefix: 'ai-governance:technical-docs',         label: 'Technical Doc' },
  // Models
  { urlSlug: 'model-provenance',       entityType: 'model_provenance',        permissionPrefix: 'ai-governance:model-provenance',       label: 'Model Provenance' },
];

const _bySlug = new Map<string, AiGovernanceEntityTypeDef>(
  AI_GOVERNANCE_ENTITY_TYPES.map((d) => [d.urlSlug, d]),
);

export function getEntityTypeBySlug(slug: string): AiGovernanceEntityTypeDef | undefined {
  return _bySlug.get(slug);
}

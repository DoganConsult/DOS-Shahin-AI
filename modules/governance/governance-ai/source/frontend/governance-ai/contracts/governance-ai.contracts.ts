export interface GovernanceAiRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateGovernanceAiDTO {
  title?: string;
  description?: string;
}

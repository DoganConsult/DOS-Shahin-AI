export interface AiGovernanceRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateAiGovernanceDTO {
  title?: string;
  description?: string;
}

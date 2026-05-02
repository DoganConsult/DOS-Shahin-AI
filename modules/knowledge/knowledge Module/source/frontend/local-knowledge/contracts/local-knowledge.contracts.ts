export interface LocalKnowledgeRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateLocalKnowledgeDTO {
  title?: string;
  description?: string;
}

export interface KnowledgeRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateKnowledgeDTO {
  title?: string;
  description?: string;
}

export interface AiRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateAiDTO {
  title?: string;
  description?: string;
}

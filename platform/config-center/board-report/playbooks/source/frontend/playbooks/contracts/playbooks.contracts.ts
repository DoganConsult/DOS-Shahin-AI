export interface PlaybooksRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreatePlaybooksDTO {
  title?: string;
  description?: string;
}

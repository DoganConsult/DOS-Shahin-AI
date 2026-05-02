export interface DoraRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateDoraDTO {
  title?: string;
  description?: string;
}

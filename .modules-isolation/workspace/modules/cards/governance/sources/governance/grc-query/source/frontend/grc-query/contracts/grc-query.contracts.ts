export interface GrcQueryRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateGrcQueryDTO {
  title?: string;
  description?: string;
}

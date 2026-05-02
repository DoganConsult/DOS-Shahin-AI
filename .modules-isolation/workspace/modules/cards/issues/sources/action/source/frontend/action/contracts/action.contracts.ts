export interface ActionRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateActionDTO {
  title?: string;
  description?: string;
}

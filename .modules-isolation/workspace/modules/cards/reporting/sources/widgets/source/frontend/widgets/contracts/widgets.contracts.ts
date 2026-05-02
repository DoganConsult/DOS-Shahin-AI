export interface WidgetsRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateWidgetsDTO {
  title?: string;
  description?: string;
}

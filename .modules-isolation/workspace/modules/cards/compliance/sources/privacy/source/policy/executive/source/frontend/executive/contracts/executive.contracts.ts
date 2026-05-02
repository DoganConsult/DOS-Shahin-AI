export interface ExecutiveRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateExecutiveDTO {
  title?: string;
  description?: string;
}

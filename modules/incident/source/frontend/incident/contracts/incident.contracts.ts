export interface IncidentRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateIncidentDTO {
  title?: string;
  description?: string;
}

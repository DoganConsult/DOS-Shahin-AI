export interface IntegrationsRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateIntegrationsDTO {
  title?: string;
  description?: string;
}

export interface AgrcEngineRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateAgrcEngineDTO {
  title?: string;
  description?: string;
}

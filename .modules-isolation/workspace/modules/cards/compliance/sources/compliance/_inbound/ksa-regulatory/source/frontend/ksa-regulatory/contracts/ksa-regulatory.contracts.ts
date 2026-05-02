export interface KsaRegulatoryRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateKsaRegulatoryDTO {
  title?: string;
  description?: string;
}

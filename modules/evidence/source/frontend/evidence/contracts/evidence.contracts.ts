export interface EvidenceRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateEvidenceDTO {
  title?: string;
  description?: string;
}

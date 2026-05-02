export interface AttestationRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateAttestationDTO {
  title?: string;
  description?: string;
}

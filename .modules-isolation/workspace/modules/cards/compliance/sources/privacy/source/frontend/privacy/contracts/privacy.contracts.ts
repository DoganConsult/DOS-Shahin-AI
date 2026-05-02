export interface PrivacyRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreatePrivacyDTO {
  title?: string;
  description?: string;
}

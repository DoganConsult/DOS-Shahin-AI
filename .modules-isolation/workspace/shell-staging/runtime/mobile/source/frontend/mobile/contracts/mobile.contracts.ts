export interface MobileRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateMobileDTO {
  title?: string;
  description?: string;
}

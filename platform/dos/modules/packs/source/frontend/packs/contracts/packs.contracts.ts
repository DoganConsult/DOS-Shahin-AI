export interface PacksRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreatePacksDTO {
  title?: string;
  description?: string;
}

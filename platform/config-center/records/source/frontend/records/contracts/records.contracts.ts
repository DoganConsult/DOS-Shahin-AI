export interface RecordsRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateRecordsDTO {
  title?: string;
  description?: string;
}

export interface InboxRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateInboxDTO {
  title?: string;
  description?: string;
}

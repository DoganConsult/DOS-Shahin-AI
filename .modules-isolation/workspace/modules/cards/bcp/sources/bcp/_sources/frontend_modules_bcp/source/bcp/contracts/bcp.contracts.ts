export interface BcpRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateBcpDTO {
  title?: string;
  description?: string;
}

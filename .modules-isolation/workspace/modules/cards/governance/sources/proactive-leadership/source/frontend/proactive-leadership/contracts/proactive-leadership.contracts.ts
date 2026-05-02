export interface ProactiveLeadershipRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateProactiveLeadershipDTO {
  title?: string;
  description?: string;
}

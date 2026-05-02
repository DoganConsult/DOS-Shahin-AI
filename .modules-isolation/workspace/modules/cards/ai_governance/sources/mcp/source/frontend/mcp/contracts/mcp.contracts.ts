export interface McpRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateMcpDTO {
  title?: string;
  description?: string;
}

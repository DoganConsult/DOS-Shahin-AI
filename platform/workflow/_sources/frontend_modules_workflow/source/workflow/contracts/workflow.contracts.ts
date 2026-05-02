export interface WorkflowRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateWorkflowDTO {
  title?: string;
  description?: string;
}

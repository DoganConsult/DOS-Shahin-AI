export interface ExceptionRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateExceptionDTO {
  title?: string;
  description?: string;
}

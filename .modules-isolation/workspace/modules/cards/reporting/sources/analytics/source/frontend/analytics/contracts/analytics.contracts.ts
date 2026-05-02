export interface AnalyticsRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateAnalyticsDTO {
  title?: string;
  description?: string;
}

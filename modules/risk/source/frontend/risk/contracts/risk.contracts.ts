export interface RiskRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateRiskDTO {
  title?: string;
  description?: string;
}

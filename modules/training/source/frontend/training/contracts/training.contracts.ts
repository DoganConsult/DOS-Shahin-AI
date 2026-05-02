export interface TrainingRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateTrainingDTO {
  title?: string;
  description?: string;
}

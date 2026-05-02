export interface AssetRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateAssetDTO {
  title?: string;
  description?: string;
}

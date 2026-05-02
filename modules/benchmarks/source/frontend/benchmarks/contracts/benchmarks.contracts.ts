export interface BenchmarksRecord {
  id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface CreateBenchmarksDTO {
  title?: string;
  description?: string;
}

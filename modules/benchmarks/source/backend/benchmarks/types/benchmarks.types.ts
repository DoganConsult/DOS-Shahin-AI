export interface BenchmarkCatalog {
  id: string;
  name: string;
  version: string;
  issuer: string;
  controlsCount: number;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BenchmarkEvaluation {
  id: string;
  catalogId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  score: number;
  tenantId: string;
  executedAt?: string;
}

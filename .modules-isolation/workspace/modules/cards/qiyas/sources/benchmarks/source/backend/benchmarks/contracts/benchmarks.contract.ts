// Benchmarks Contracts — Spec §6
export interface BenchmarkCatalogContract {
  benchmarkId: string;
  name: string;
  description: string | null;
  version: string;
  provider: string;
  frameworkCode: string | null;
  releaseDate: string | null;
  status: string;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BenchmarkMappingContract {
  mappingId: string;
  benchmarkId: string;
  internalControlId: string;
  weight: number;
  mappingStatus: string;
  notes: string | null;
  createdAt: string;
}

export interface BenchmarkScoreContract {
  scoreId: string;
  benchmarkId: string;
  tenantId: string;
  score: number;
  maxScore: number;
  computedAt: string;
  computationMethod: string;
  status: string;
  breakdownJson: Record<string, unknown>;
}

export interface BenchmarkDiagnosticsContract {
  totalBenchmarks: number;
  activeBenchmarks: number;
  totalMappings: number;
  unmappedControls: number;
  healthStatus: 'healthy' | 'degraded' | 'critical';
}

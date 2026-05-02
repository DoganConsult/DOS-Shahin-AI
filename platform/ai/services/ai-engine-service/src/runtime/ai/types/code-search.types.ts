export type CodeSearchEngineType = 'trigram' | 'regex' | 'semantic' | 'enterprise' | 'ui';
export type CodeSearchEngineRuntime = 'go' | 'python' | 'java' | 'cpp';
export type CodeSearchEngineStatus = 'enabled' | 'disabled' | 'maintenance';
export type CodeSearchSurfaceLayer = 'env' | 'config' | 'db' | 'platform' | 'dauth' | 'product' | 'module' | 'frontend' | 'shared' | 'devops' | 'test' | 'contract';
export type CodeSearchEngineName = 'zoekt' | 'hound' | 'seagoat' | 'opengrok' | 'codesearch';

export interface CodeSearchEngineRecord {
  engine_code: string;
  display_name: string;
  engine_type: CodeSearchEngineType;
  runtime: CodeSearchEngineRuntime;
  base_url: string;
  port: number;
  health_endpoint: string;
  search_endpoint: string;
  status: CodeSearchEngineStatus;
  indexed_surfaces: string[];
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CodeSearchSurfaceRecord {
  surface_code: string;
  display_name: string;
  source_path: string;
  layer: CodeSearchSurfaceLayer;
  description: string;
  created_at: string;
}

export interface CodeSearchQueryInput {
  query: string;
  engine?: CodeSearchEngineName | 'all';
  fileFilter?: string;
  maxResults?: number;
}

export interface CodeSearchResultItem {
  engine: string;
  file: string;
  line?: number;
  content: string;
  score?: number;
}

export interface CodeSearchHealthResult {
  engine: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  responseTimeMs: number;
}

export interface CodeSearchQueryResponse {
  query: string;
  engine: string;
  resultCount: number;
  results: CodeSearchResultItem[];
}

export interface CodeSearchHealthResponse {
  engines: CodeSearchHealthResult[];
  timestamp: string;
}

export interface CodeSearchEngineCreateDTO {
  engine_code: string;
  display_name: string;
  engine_type: CodeSearchEngineType;
  runtime: CodeSearchEngineRuntime;
  base_url: string;
  port: number;
  health_endpoint?: string;
  search_endpoint?: string;
  indexed_surfaces?: string[];
  config?: Record<string, unknown>;
}

export interface CodeSearchEngineUpdateDTO {
  display_name?: string;
  base_url?: string;
  port?: number;
  health_endpoint?: string;
  search_endpoint?: string;
  status?: CodeSearchEngineStatus;
  indexed_surfaces?: string[];
  config?: Record<string, unknown>;
}

export interface CodeSearchSurfaceCreateDTO {
  surface_code: string;
  display_name: string;
  source_path: string;
  layer: CodeSearchSurfaceLayer;
  description?: string;
}

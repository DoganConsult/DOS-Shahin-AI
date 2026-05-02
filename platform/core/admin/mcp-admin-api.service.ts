import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';

export interface McpInfoDto {
  status?: string;
  enabled?: boolean;
  db?: {
    agents: number;
    tools: number;
    prompts: number;
    resources: number;
  };
  modules?: Array<{
    code: string;
    functions: number;
  }>;
  [key: string]: unknown;
}

export interface McpAgentDto {
  agentId: string;
  name: string;
  nameAr?: string | null;
  summary?: string | null;
  ownerModuleCode?: string;
  domainCode?: string;
  moduleCodes?: string[];
  capabilities?: string[];
  isEnabled?: boolean;
}

export interface McpToolDto {
  name: string;
  description?: string;
  inputSchema?: unknown;
  metadata?: Record<string, unknown>;
  agentId?: string;
  ownerModuleCode?: string;
  handlerKey?: string;
  executionType?: string;
  riskLevel?: string;
  category?: string;
  approvalMode?: string;
}

export interface McpPromptDto {
  promptId: string;
  promptName: string;
  displayNameEn: string;
  displayNameAr?: string | null;
  descriptionEn?: string | null;
  ownerModuleCode: string;
  agentId?: string | null;
  outputMode: string;
  version: number;
  isEnabled: boolean;
}

export interface McpResourceDto {
  resourceId: string;
  resourceName: string;
  displayNameEn: string;
  displayNameAr?: string | null;
  uriPattern: string;
  ownerModuleCode: string;
  resolverKey: string;
  sensitivityLevel: string;
  version: number;
  isEnabled: boolean;
}

export interface McpApprovalDto {
  request_id: string;
  tool_name: string;
  requested_by: string;
  agent_id?: string | null;
  approval_mode: string;
  risk_level?: string | null;
  status: string;
  created_at: string;
  approver_id?: string | null;
  decision_reason?: string | null;
  decided_at?: string | null;
  [key: string]: unknown;
}

export interface McpStatDto {
  tool_name: string;
  call_count: number;
  avg_ms: number;
  error_count: number;
  last_called?: string | null;
}

export interface McpModuleDto {
  moduleCode: string;
  functionCount: number;
  functions?: string[];
}

export interface McpToolOverridePayload {
  is_enabled?: boolean;
  approval_mode?: string;
  min_autonomy?: string;
  max_autonomy?: string;
  default_autonomy?: string;
  max_calls_per_min?: number;
  custom_input_schema?: Record<string, unknown>;
  execution_config?: Record<string, unknown>;
  notes?: string;
}

export interface McpWorkflowBindingPayload {
  workflow_id: string;
  workflow_version?: number;
  step_id: string;
  step_type?: string | null;
  tool_name: string;
  trigger_event?: string | null;
  execution_mode?: string;
  condition_expr?: Record<string, unknown> | null;
  fallback_tool?: string | null;
  input_mapping?: Record<string, unknown>;
  output_mapping?: Record<string, unknown>;
  context_mapping?: Record<string, unknown>;
  failure_strategy?: string;
  run_as_mode?: string;
  is_enabled?: boolean;
  sort_order?: number;
}

export interface McpAgentsResponse {
  agents: McpAgentDto[];
  source: string;
  count: number;
}

export interface McpToolsResponse {
  tools: McpToolDto[];
  source: string;
  count: number;
}

export interface McpPromptsResponse {
  prompts: McpPromptDto[];
  count: number;
}

export interface McpResourcesResponse {
  resources: McpResourceDto[];
  count: number;
}

export interface McpApprovalsResponse {
  approvals: McpApprovalDto[];
  count: number;
}

export interface McpStatsResponse {
  stats: McpStatDto[];
  count: number;
}

export interface McpModulesResponse {
  modules: McpModuleDto[];
  totalModules: number;
  totalFunctions: number;
}

export interface McpWorkflowBindingsResponse {
  bindings: Array<Record<string, unknown>>;
  count: number;
}

export interface McpCacheClearResponse {
  cleared: boolean;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class McpAdminApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/mcp`;

  getInfo(): Observable<McpInfoDto> {
    return this.http.get<McpInfoDto>(`${this.base}/info`);
  }

  getAgents(): Observable<McpAgentsResponse> {
    return this.http.get<McpAgentsResponse>(`${this.base}/agents`);
  }

  getTools(): Observable<McpToolsResponse> {
    return this.http
      .get<{ tools: unknown[]; source: string; count: number }>(`${this.base}/tools`)
      .pipe(map(response => ({
        ...response,
        tools: response.tools.map(tool => normalizeTool(tool)),
      })));
  }

  getTool(toolName: string): Observable<{ tool: McpToolDto }> {
    return this.http
      .get<{ tool: unknown }>(`${this.base}/tools/${encodeURIComponent(toolName)}`)
      .pipe(map(response => ({ tool: normalizeTool(response.tool) })));
  }

  getAgentTools(agentId: string): Observable<McpToolsResponse> {
    return this.http
      .get<{ agentId: string; tools: unknown[]; count: number }>(`${this.base}/agents/${encodeURIComponent(agentId)}/tools`)
      .pipe(map(response => ({
        source: response.agentId,
        count: response.count,
        tools: response.tools.map(tool => normalizeTool(tool)),
      })));
  }

  getPrompts(): Observable<McpPromptsResponse> {
    return this.http.get<McpPromptsResponse>(`${this.base}/prompts`);
  }

  getResources(): Observable<McpResourcesResponse> {
    return this.http.get<McpResourcesResponse>(`${this.base}/resources`);
  }

  createTool(payload: Record<string, unknown>): Observable<{ tool: McpToolDto }> {
    return this.http
      .post<{ tool: unknown }>(`${this.base}/admin/tools`, payload)
      .pipe(map(response => ({ tool: normalizeTool(response.tool) })));
  }

  updateTool(toolName: string, payload: Record<string, unknown>): Observable<{ tool: McpToolDto }> {
    return this.http
      .put<{ tool: unknown }>(`${this.base}/admin/tools/${encodeURIComponent(toolName)}`, payload)
      .pipe(map(response => ({ tool: normalizeTool(response.tool) })));
  }

  deleteTool(toolName: string): Observable<{ deleted: string }> {
    return this.http.delete<{ deleted: string }>(`${this.base}/admin/tools/${encodeURIComponent(toolName)}`);
  }

  upsertOverride(toolName: string, payload: McpToolOverridePayload): Observable<{ override: Record<string, unknown> }> {
    return this.http.put<{ override: Record<string, unknown> }>(`${this.base}/admin/overrides/${encodeURIComponent(toolName)}`, payload);
  }

  deleteOverride(toolName: string): Observable<{ deleted: string }> {
    return this.http.delete<{ deleted: string }>(`${this.base}/admin/overrides/${encodeURIComponent(toolName)}`);
  }

  getApprovals(status = 'pending'): Observable<McpApprovalsResponse> {
    const params = status ? { status } : undefined;
    return this.http.get<McpApprovalsResponse>(`${this.base}/admin/approvals`, { params });
  }

  decideApproval(requestId: string, decision: 'approved' | 'rejected', reason?: string): Observable<{ approval: McpApprovalDto }> {
    const body = reason ? { decision, reason } : { decision };
    return this.http.post<{ approval: McpApprovalDto }>(`${this.base}/admin/approvals/${encodeURIComponent(requestId)}/decide`, body);
  }

  getStats(tool?: string, limit?: number): Observable<McpStatsResponse> {
    const params: Record<string, string> = {};
    if (tool) {
      params['tool'] = tool;
    }
    if (limit !== undefined) {
      params['limit'] = String(limit);
    }

    return this.http.get<McpStatsResponse>(`${this.base}/admin/stats`, {
      params: Object.keys(params).length > 0 ? params : undefined,
    });
  }

  getModules(): Observable<McpModulesResponse> {
    return this.http
      .get<{ modules: unknown[]; totalModules: number; totalFunctions: number }>(`${this.base}/admin/modules`)
      .pipe(map(response => ({
        ...response,
        modules: response.modules.map(moduleDef => normalizeModule(moduleDef)),
      })));
  }

  getWorkflowBindings(workflowId?: string): Observable<McpWorkflowBindingsResponse> {
    const params = workflowId ? { workflow_id: workflowId } : undefined;
    return this.http.get<McpWorkflowBindingsResponse>(`${this.base}/admin/workflow-bindings`, { params });
  }

  upsertWorkflowBinding(payload: McpWorkflowBindingPayload): Observable<{ binding: Record<string, unknown> }> {
    return this.http.post<{ binding: Record<string, unknown> }>(`${this.base}/admin/workflow-bindings`, payload);
  }

  clearCache(): Observable<McpCacheClearResponse> {
    return this.http.post<McpCacheClearResponse>(`${this.base}/admin/cache/clear`, {});
  }
}

function normalizeTool(tool: unknown): McpToolDto {
  const record = asRecord(tool);
  const metadata = asRecord(record['metadata']);

  return {
    name: readString(record, 'name') ?? readString(record, 'toolName') ?? '',
    description: readString(record, 'description') ?? readString(record, 'descriptionEn'),
    inputSchema: record['inputSchema'] ?? record['input_schema'],
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    agentId: readString(record, 'agentId') ?? readString(metadata, 'agentId'),
    ownerModuleCode: readString(record, 'ownerModuleCode') ?? readString(metadata, 'ownerModuleCode'),
    handlerKey: readString(record, 'handlerKey') ?? readString(metadata, 'handlerKey'),
    executionType: readString(record, 'executionType') ?? readString(metadata, 'executionType'),
    riskLevel: readString(record, 'riskLevel') ?? readString(metadata, 'riskLevel'),
    category: readString(record, 'category') ?? readString(metadata, 'category'),
    approvalMode: readString(record, 'approvalMode') ?? readString(metadata, 'approvalMode'),
  };
}

function normalizeModule(moduleDef: unknown): McpModuleDto {
  const record = asRecord(moduleDef);
  const functions = Array.isArray(record['functions'])
    ? record['functions'].filter((value): value is string => typeof value === 'string')
    : undefined;
  const explicitCount = readNumber(record, 'functionCount') ?? readNumber(record, 'function_count') ?? readNumber(record, 'functions');

  return {
    moduleCode: readString(record, 'moduleCode') ?? readString(record, 'module_code') ?? readString(record, 'code') ?? '',
    functionCount: explicitCount ?? functions?.length ?? 0,
    functions,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
}

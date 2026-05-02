export interface McpToolContract {
  toolId: string;
  name: string;
  description: string | null;
  parametersSchema: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface McpAgentContract {
  agentId: string;
  name: string;
  description: string | null;
  systemPrompt: string | null;
  isActive: boolean;
  boundTools: McpToolContract[];
  createdAt: string;
  updatedAt: string;
}

export interface McpExecutionLogContract {
  logId: string;
  agentId: string;
  toolId: string | null;
  userId: string | null;
  executionPayload: Record<string, unknown>;
  executionResult: Record<string, unknown>;
  status: string;
  executionTimeMs: number;
  createdAt: string;
}

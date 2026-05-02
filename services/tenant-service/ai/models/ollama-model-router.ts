export interface OllamaModelConfig {
  model: string;
  contextWindow: number;
  maxTokens: number;
  supportsVision: boolean;
  supportsTools: boolean;
  quantization?: string;
}

const DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2:3b';
const FAST_MODEL = process.env.OLLAMA_FAST_MODEL || 'llama3.2:1b';
const CODE_MODEL = process.env.OLLAMA_CODE_MODEL || 'qwen2.5-coder:7b';
const REASONING_MODEL = process.env.OLLAMA_REASONING_MODEL || 'llama3.1:8b';

const AGENT_MODEL_OVERRIDES: Record<string, OllamaModelConfig> = {
  'code-assistant': {
    model: CODE_MODEL,
    contextWindow: 32768,
    maxTokens: 4096,
    supportsVision: false,
    supportsTools: true,
  },
  'compliance-agent': {
    model: REASONING_MODEL,
    contextWindow: 32768,
    maxTokens: 2048,
    supportsVision: false,
    supportsTools: true,
  },
  'risk-agent': {
    model: REASONING_MODEL,
    contextWindow: 32768,
    maxTokens: 2048,
    supportsVision: false,
    supportsTools: true,
  },
  'audit-agent': {
    model: REASONING_MODEL,
    contextWindow: 32768,
    maxTokens: 2048,
    supportsVision: false,
    supportsTools: true,
  },
  'fast-agent': {
    model: FAST_MODEL,
    contextWindow: 8192,
    maxTokens: 1024,
    supportsVision: false,
    supportsTools: false,
  },
};

const DEFAULT_CONFIG: OllamaModelConfig = {
  model: DEFAULT_MODEL,
  contextWindow: 16384,
  maxTokens: 2048,
  supportsVision: false,
  supportsTools: true,
};

export function resolveOllamaModelForAgent(agentId?: string, taskType?: string): OllamaModelConfig {
  if (agentId && AGENT_MODEL_OVERRIDES[agentId]) {
    return AGENT_MODEL_OVERRIDES[agentId];
  }

  if (taskType === 'code_generation') {
    return { ...DEFAULT_CONFIG, model: CODE_MODEL };
  }
  if (taskType === 'agent_inference' || taskType === 'structured') {
    return { ...DEFAULT_CONFIG, model: REASONING_MODEL };
  }
  if (taskType === 'classification' || taskType === 'summarization') {
    return { ...DEFAULT_CONFIG, model: FAST_MODEL };
  }

  return DEFAULT_CONFIG;
}

export function getOllamaModelName(agentId?: string, taskType?: string): string {
  return resolveOllamaModelForAgent(agentId, taskType).model;
}

import { safeQuery } from "@dos/db";

export type {
  LLMMessage,
  LLMCompletionResult,
  PremiumProvider,
  FreeProvider,
  LocalProvider,
  MetaProvider,
  AnyProvider,
  FreeProviderConfig,
  LLMConfig,
} from './provider.interface';

export { callClaude } from './claude.provider';
export { callAzureOpenAI } from './azure-openai.provider';
export { callOllama } from './ollama.provider';
export {
  DEFAULT_FREE_ORDER,
  FREE_PROVIDER_DEFAULTS,
  buildFreeProvider,
  callOpenAICompatible,
  callGemini,
  callFreeProvider,
} from './free.provider';

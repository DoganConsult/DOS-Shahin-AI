/**
 * AI port — outbound interface for LLM/chat completion adapter.
 * Host injects a real provider (Claude, OpenAI, etc.); default throws so
 * AI features fail-closed when unbound.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  [k: string]: unknown;
}

export interface ChatCompletionResponse {
  content: string;
  model?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  raw?: unknown;
}

export type CreateChatCompletionFn = (
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
) => Promise<ChatCompletionResponse>;

let _createChatCompletion: CreateChatCompletionFn = async () => {
  throw new Error('[foundation] ai port not bound: call bindAiPort()');
};

export function bindAiPort(impl: { createChatCompletion?: CreateChatCompletionFn }) {
  if (impl.createChatCompletion) _createChatCompletion = impl.createChatCompletion;
}

export const createChatCompletion: CreateChatCompletionFn = (messages, options) =>
  _createChatCompletion(messages, options);

import { describe, it, expect, vi as _vi, beforeEach } from 'vitest';
import {
  buildFreeProvider,
  DEFAULT_FREE_ORDER,
  FREE_PROVIDER_DEFAULTS,
  type FreeProvider as _FreeProvider,
  type LLMMessage,
  type LLMCompletionResult,
  type LLMConfig as _LLMConfig,
  type AnyProvider,
} from './llm-providers';

describe('llm-providers', () => {
  describe('buildFreeProvider', () => {
    beforeEach(() => {
      for (const key of Object.keys(process.env)) {
        if (key.endsWith('_API_KEY') && key !== 'CLAUDE_API_KEY') {
          delete process.env[key];
        }
      }
    });

    it('returns undefined when no apiKey available', () => {
      expect(buildFreeProvider('groq', undefined)).toBeUndefined();
      expect(buildFreeProvider('groq', {})).toBeUndefined();
    });

    it('builds config from raw object with apiKey', () => {
      const result = buildFreeProvider('groq', { apiKey: 'test-key' });
      expect(result).toBeDefined();
      expect(result!.apiKey).toBe('test-key');
      expect(result!.model).toBe(FREE_PROVIDER_DEFAULTS.groq.model);
      expect(result!.endpoint).toBe(FREE_PROVIDER_DEFAULTS.groq.endpoint);
      expect(result!.enabled).toBe(true);
    });

    it('uses environment variable when raw has no apiKey', () => {
      process.env.GROQ_API_KEY = 'env-key';
      const result = buildFreeProvider('groq', undefined);
      expect(result).toBeDefined();
      expect(result!.apiKey).toBe('env-key');
      delete process.env.GROQ_API_KEY;
    });

    it('respects raw overrides for model and endpoint', () => {
      const result = buildFreeProvider('mistral', {
        apiKey: 'key',
        model: 'custom-model',
        endpoint: 'https://custom.api/v1',
      });
      expect(result!.model).toBe('custom-model');
      expect(result!.endpoint).toBe('https://custom.api/v1');
    });

    it('respects enabled: false', () => {
      const result = buildFreeProvider('deepseek', { apiKey: 'key', enabled: false });
      expect(result!.enabled).toBe(false);
    });

    it('passes through extraHeaders and maxTokens', () => {
      const result = buildFreeProvider('openrouter', {
        apiKey: 'key',
        maxTokens: 2048,
        extraHeaders: { 'X-Custom': 'val' },
      });
      expect(result!.maxTokens).toBe(2048);
      expect(result!.extraHeaders).toEqual({ 'X-Custom': 'val' });
    });
  });

  describe('DEFAULT_FREE_ORDER', () => {
    it('contains all 8 free providers', () => {
      expect(DEFAULT_FREE_ORDER).toHaveLength(8);
      expect(DEFAULT_FREE_ORDER).toContain('groq');
      expect(DEFAULT_FREE_ORDER).toContain('gemini');
      expect(DEFAULT_FREE_ORDER).toContain('sambanova');
    });
  });

  describe('FREE_PROVIDER_DEFAULTS', () => {
    it('has defaults for every provider in DEFAULT_FREE_ORDER', () => {
      for (const name of DEFAULT_FREE_ORDER) {
        expect(FREE_PROVIDER_DEFAULTS[name]).toBeDefined();
        expect(FREE_PROVIDER_DEFAULTS[name].endpoint).toBeTruthy();
        expect(FREE_PROVIDER_DEFAULTS[name].model).toBeTruthy();
      }
    });
  });

  describe('type exports', () => {
    it('LLMMessage has expected shape', () => {
      const msg: LLMMessage = { role: 'user', content: 'hello' };
      expect(msg.role).toBe('user');
    });

    it('LLMCompletionResult has expected shape', () => {
      const r: LLMCompletionResult = { content: 'hi', provider: 'claude', model: 'sonnet', latencyMs: 100 };
      expect(r.latencyMs).toBe(100);
    });

    it('AnyProvider includes all provider types', () => {
      const providers: AnyProvider[] = ['claude', 'azure-openai', 'groq', 'ollama', 'auto', 'free-first'];
      expect(providers.length).toBe(6);
    });
  });
});

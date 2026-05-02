export const DEFAULT_FREE_ORDER = [
    'groq', 'gemini', 'openrouter', 'together',
    'cerebras', 'mistral', 'deepseek', 'sambanova',
];
export const FREE_PROVIDER_DEFAULTS = {
    groq: { endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
    gemini: { endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash' },
    openrouter: { endpoint: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-3.3-70b-instruct:free' },
    together: { endpoint: 'https://api.together.xyz/v1/chat/completions', model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' },
    cerebras: { endpoint: 'https://api.cerebras.ai/v1/chat/completions', model: 'llama-3.3-70b' },
    mistral: { endpoint: 'https://api.mistral.ai/v1/chat/completions', model: 'mistral-small-latest' },
    deepseek: { endpoint: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
    sambanova: { endpoint: 'https://api.sambanova.ai/v1/chat/completions', model: 'Meta-Llama-3.1-70B-Instruct' },
};
const ENV_KEY_MAP = {
    groq: 'GROQ_API_KEY',
    gemini: 'GOOGLE_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    together: 'TOGETHER_API_KEY',
    cerebras: 'CEREBRAS_API_KEY',
    mistral: 'MISTRAL_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    sambanova: 'SAMBANOVA_API_KEY',
};
export function buildFreeProvider(name, raw) {
    const apiKey = raw?.apiKey || process.env[ENV_KEY_MAP[name]] || '';
    if (!apiKey)
        return undefined;
    const defaults = FREE_PROVIDER_DEFAULTS[name];
    return {
        apiKey,
        model: raw?.model || defaults.model,
        endpoint: raw?.endpoint || defaults.endpoint,
        enabled: raw?.enabled !== false,
        maxTokens: raw?.maxTokens,
        extraHeaders: raw?.extraHeaders,
    };
}
//# sourceMappingURL=llm-config.js.map
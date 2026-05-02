import * as http from 'http';
import * as https from 'https';
import { toErrorMessage } from '@dos/module-sdk';
export function callOpenAIApi(config, messages, maxTokens, overrideModel) {
    const selectedModel = overrideModel || config.model;
    return new Promise((resolve, reject) => {
        let url;
        try {
            url = new URL(config.endpoint);
        }
        catch {
            return reject(new Error('Invalid OpenAI endpoint URL'));
        }
        const body = JSON.stringify({
            model: selectedModel,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            max_tokens: maxTokens,
            temperature: 0.3,
        });
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
        };
        const isHttps = url.protocol === 'https:';
        const requestModule = isHttps ? https : http;
        const defaultPort = isHttps ? 443 : 80;
        const req = requestModule.request({
            hostname: url.hostname,
            port: parseInt(url.port, 10) || defaultPort,
            path: url.pathname.endsWith('/chat/completions') ? url.pathname : `${url.pathname.replace(/\/$/, '')}/chat/completions`,
            method: 'POST',
            headers,
            timeout: 120000, // 2 minutes for large local models
        }, res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        reject(new Error(`[openai] ${toErrorMessage(parsed.error) || JSON.stringify(parsed.error)}`));
                        return;
                    }
                    resolve({
                        content: parsed.choices?.[0]?.message?.content || '',
                        provider: 'openai',
                        model: selectedModel,
                        tokensUsed: parsed.usage?.total_tokens,
                    });
                }
                catch {
                    reject(new Error(`[openai] Failed to parse response`));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('[openai] Request timed out')); });
        req.write(body);
        req.end();
    });
}
//# sourceMappingURL=openai.provider.js.map
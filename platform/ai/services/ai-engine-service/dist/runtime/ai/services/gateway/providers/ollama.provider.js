import * as http from 'http';
export function callOllama(config, messages, modelOverride) {
    const selectedModel = modelOverride || config.model;
    return new Promise((resolve, reject) => {
        const url = new URL(config.endpoint);
        const body = JSON.stringify({
            model: selectedModel,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            stream: false,
        });
        const req = http.request({
            hostname: url.hostname,
            port: parseInt(url.port) || 11434,
            path: '/api/chat',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000,
        }, res => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ content: parsed.message?.content || '', provider: 'ollama', model: selectedModel, tokensUsed: parsed.eval_count });
                }
                catch {
                    reject(new Error('Failed to parse Ollama response'));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Ollama request timed out')); });
        req.write(body);
        req.end();
    });
}
//# sourceMappingURL=ollama.provider.js.map
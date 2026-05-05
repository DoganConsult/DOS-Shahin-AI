import { logger } from '../../ports/logger.port';
import http from 'http';
import https from 'https';
import { getClaudeClient, CLAUDE_MODEL, CLAUDE_MAX_TOKENS } from '../../ports/ai.port';
import { gatewayAcquireSlot, gatewayReleaseSlot } from '../gateway/ai-gateway.service';
import { toErrorMessage } from '@dos/module-sdk';
export function initSSEResponse(res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
}
export function sendSSEEvent(res, event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
export function endSSE(res) {
    res.write('event: done\ndata: {}\n\n');
    res.end();
}
export async function streamClaudeResponse(messages, res, opts) {
    const tenantId = opts?.tenantId || 'global';
    const model = opts?.model || CLAUDE_MODEL;
    const maxTokens = opts?.maxTokens || CLAUDE_MAX_TOKENS;
    initSSEResponse(res);
    sendSSEEvent(res, 'start', { model, agentId: opts?.agentId });
    const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content);
    const systemPrompt = systemParts.length > 0 ? systemParts.join('\n') : undefined;
    const claudeMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));
    await gatewayAcquireSlot(tenantId);
    try {
        const client = getClaudeClient();
        const canStream = client?.messages?.stream && typeof client.messages.stream === 'function';
        if (!canStream) {
            const created = await client.messages.create({
                model,
                max_tokens: maxTokens,
                temperature: 0.3,
                system: systemPrompt,
                messages: claudeMessages,
            });
            const text = (created?.content || [])
                .filter((b) => b?.type === 'text')
                .map((b) => b.text)
                .join('');
            if (text)
                sendSSEEvent(res, 'token', { text });
            const totalTokens = (created?.usage?.input_tokens || 0) + (created?.usage?.output_tokens || 0);
            sendSSEEvent(res, 'usage', { totalTokens });
            endSSE(res);
            return { totalTokens, provider: 'anthropic', model };
        }
        let totalTokens = 0;
        const stream = client.messages.stream({
            model,
            max_tokens: maxTokens,
            temperature: 0.3,
            system: systemPrompt,
            messages: claudeMessages,
        });
        const onText = (deltaText) => {
            if (!deltaText)
                return;
            sendSSEEvent(res, 'token', { text: deltaText });
        };
        try {
            for await (const event of stream) {
                const type = event?.type;
                if (type === 'content_block_delta' && event?.delta?.type === 'text_delta') {
                    onText(event.delta.text);
                }
                if (type === 'message_delta' && event?.usage) {
                    totalTokens = (event.usage.input_tokens || 0) + (event.usage.output_tokens || 0);
                }
            }
        }
        catch (err) {
            sendSSEEvent(res, 'error', { message: toErrorMessage(err) });
            endSSE(res);
            return { totalTokens: 0, provider: 'anthropic', model };
        }
        try {
            const finalMsg = await stream.finalMessage?.();
            if (finalMsg?.usage) {
                totalTokens = (finalMsg.usage.input_tokens || 0) + (finalMsg.usage.output_tokens || 0);
            }
        }
        catch { /* ignore */ }
        sendSSEEvent(res, 'usage', { totalTokens });
        endSSE(res);
        return { totalTokens, provider: 'anthropic', model };
    }
    catch (err) {
        logger.warn(`[LLMStream] Claude stream failed: ${toErrorMessage(err)}`);
        sendSSEEvent(res, 'error', { message: toErrorMessage(err) });
        endSSE(res);
        return { totalTokens: 0, provider: 'anthropic', model };
    }
    finally {
        gatewayReleaseSlot(tenantId);
    }
}
export async function streamOpenAICompatible(endpoint, apiKey, model, messages, res, opts) {
    initSSEResponse(res);
    sendSSEEvent(res, 'start', { model, agentId: opts?.agentId });
    return new Promise((resolve) => {
        const url = new URL(endpoint);
        const body = JSON.stringify({
            model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            max_tokens: opts?.maxTokens || 4096,
            temperature: 0.3,
            stream: true,
        });
        let totalTokens = 0;
        const req = https.request({
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            timeout: 60000,
        }, (upstream) => {
            let buffer = '';
            upstream.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (!line.startsWith('data: '))
                        continue;
                    const data = line.slice(6).trim();
                    if (data === '[DONE]')
                        continue;
                    try {
                        const parsed = JSON.parse(data);
                        const text = parsed.choices?.[0]?.delta?.content;
                        if (text)
                            sendSSEEvent(res, 'token', { text });
                        if (parsed.usage)
                            totalTokens = parsed.usage.total_tokens || 0;
                    }
                    catch { /* partial JSON */ }
                }
            });
            upstream.on('end', () => {
                sendSSEEvent(res, 'usage', { totalTokens });
                endSSE(res);
                resolve({ totalTokens, provider: 'openai-compatible', model });
            });
        });
        req.on('error', (err) => {
            sendSSEEvent(res, 'error', { message: toErrorMessage(err) });
            endSSE(res);
            resolve({ totalTokens: 0, provider: 'openai-compatible', model });
        });
        req.on('timeout', () => {
            req.destroy();
            sendSSEEvent(res, 'error', { message: 'Stream timeout' });
            endSSE(res);
            resolve({ totalTokens: 0, provider: 'openai-compatible', model });
        });
        req.write(body);
        req.end();
    });
}
export async function streamOllamaResponse(messages, res, opts) {
    const host = process.env.OLLAMA_HOST || '127.0.0.1:11434';
    const model = opts?.model || 'llama3.2:3b';
    const [hostname, port] = host.split(':');
    sendSSEEvent(res, 'provider_switch', { provider: 'ollama', model });
    return new Promise((resolve) => {
        const body = JSON.stringify({
            model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            stream: true,
        });
        let totalTokens = 0;
        const req = http.request({
            hostname: hostname || '127.0.0.1',
            port: parseInt(port || '11434', 10),
            path: '/api/chat',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000,
        }, (upstream) => {
            let buffer = '';
            upstream.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (!line.trim())
                        continue;
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.message?.content) {
                            sendSSEEvent(res, 'token', { text: parsed.message.content });
                        }
                        if (parsed.done && parsed.eval_count) {
                            totalTokens = parsed.eval_count;
                        }
                    }
                    catch { /* partial JSON */ }
                }
            });
            upstream.on('end', () => {
                sendSSEEvent(res, 'usage', { totalTokens });
                resolve({ totalTokens, provider: 'ollama', model });
            });
        });
        req.on('error', (err) => {
            sendSSEEvent(res, 'error', { message: `Ollama stream error: ${toErrorMessage(err)}` });
            resolve({ totalTokens: 0, provider: 'ollama', model });
        });
        req.on('timeout', () => {
            req.destroy();
            sendSSEEvent(res, 'error', { message: 'Ollama stream timeout' });
            resolve({ totalTokens: 0, provider: 'ollama', model });
        });
        req.write(body);
        req.end();
    });
}
//# sourceMappingURL=llm-stream.service.js.map
import { CLAUDE_MODEL, CLAUDE_MAX_TOKENS } from '../../../ports/ai.port';
export async function callClaude(messages, model, maxTokens) {
    const { getClaudeClient } = await import('../../../../../config/claude-client');
    const client = getClaudeClient();
    const systemMessages = messages.filter(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');
    const systemPrompt = systemMessages.map(m => m.content).join('\n\n');
    const apiMessages = chatMessages.length > 0
        ? chatMessages.map(m => ({ role: m.role, content: m.content }))
        : [{ role: 'user', content: '(no user message)' }];
    const resp = await client.messages.create({
        model: model || CLAUDE_MODEL,
        max_tokens: maxTokens || CLAUDE_MAX_TOKENS,
        temperature: 0.3,
        system: systemPrompt || undefined,
        messages: apiMessages,
    });
    const block = resp.content[0];
    return {
        content: block.type === 'text' ? block.text : JSON.stringify(block),
        provider: 'claude',
        model: model || CLAUDE_MODEL,
        tokensUsed: (resp.usage?.input_tokens || 0) + (resp.usage?.output_tokens || 0),
    };
}
//# sourceMappingURL=claude.provider.js.map
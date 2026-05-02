export async function invokeAI(
  _tenantId: string,
  opts: { prompt: string; maxTokens?: number },
): Promise<string> {
  const mod = await import('../../../ai/chains/structured-output.chain' as string);
  const result = await mod.claudeJSON({
    systemPrompt: 'You are a compliance narrative generator.',
    userPrompt: opts.prompt,
    schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  });
  return (result as any)?.text || '';
}

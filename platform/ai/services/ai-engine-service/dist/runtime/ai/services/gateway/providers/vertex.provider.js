/**
 * Google Vertex AI provider (draft — confirm before shipping).
 *
 * Uses the Gemini generateContent REST endpoint with a service-account
 * bearer token (short-lived, minted via google-auth-library at request time).
 *
 * Env:
 *   VERTEX_PROJECT_ID
 *   VERTEX_LOCATION       (default us-central1)
 *   VERTEX_MODEL          (e.g. gemini-1.5-pro-002)
 *   GOOGLE_APPLICATION_CREDENTIALS  (path to SA key file)
 */
export function getVertexConfig() {
    const projectId = process.env.VERTEX_PROJECT_ID;
    const model = process.env.VERTEX_MODEL;
    if (!projectId || !model)
        return null;
    return {
        projectId,
        location: process.env.VERTEX_LOCATION || 'us-central1',
        model,
    };
}
export async function callVertexApi(config, messages, maxTokens, overrideModel) {
    try {
        // Module name held in a runtime-only variable so tsc does not resolve
        // types for an optional peer dependency (google-auth-library is only
        // installed when Vertex is the configured AI provider).
        const googleAuthModuleName = 'google-auth-library';
        const authMod = await import(googleAuthModuleName);
        const auth = new authMod.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        if (!token.token)
            throw new Error('Failed to obtain Vertex access token');
        const selectedModel = overrideModel || config.model;
        const url = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}` +
            `/locations/${config.location}/publishers/google/models/${selectedModel}:generateContent`;
        const systemMsg = messages.find((m) => m.role === 'system')?.content;
        const contents = messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));
        const body = JSON.stringify({
            contents,
            systemInstruction: systemMsg
                ? { role: 'system', parts: [{ text: systemMsg }] }
                : undefined,
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
        });
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token.token}`,
                'Content-Type': 'application/json',
            },
            body,
        });
        const parsed = (await res.json());
        if (parsed.error)
            throw new Error(parsed.error.message || 'Vertex API error');
        const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
        return {
            content: text,
            provider: 'vertex',
            model: selectedModel,
            tokensUsed: parsed.usageMetadata?.totalTokenCount,
        };
    }
    catch (err) {
        throw new Error(`[vertex] Provider unavailable (install google-auth-library and set GOOGLE_APPLICATION_CREDENTIALS): ${err.message}`);
    }
}
//# sourceMappingURL=vertex.provider.js.map
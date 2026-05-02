import { logger } from '@dos/platform-core/observability';
let LangfuseCallbackHandler = null;
let langfuseClient = null;
export function initLangfuse() {
    if (process.env.LANGFUSE_ENABLED !== 'true') {
        return null;
    }
    try {
        // Dynamic import to avoid breaking if langfuse is not installed
        const langfuse = require('langfuse');
        const { CallbackHandler } = require('langfuse/langchain');
        const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
        const secretKey = process.env.LANGFUSE_SECRET_KEY;
        const host = process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com';
        if (!publicKey || !secretKey) {
            logger.warn('[Langfuse] LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY required when LANGFUSE_ENABLED=true');
            return null;
        }
        langfuseClient = new langfuse.Langfuse({
            publicKey,
            secretKey,
            host,
        });
        LangfuseCallbackHandler = CallbackHandler;
        logger.info(`[Langfuse] Initialized → ${host}`);
        return LangfuseCallbackHandler;
    }
    catch (err) {
        logger.warn(`[Langfuse] Package not installed — install with: pnpm add langfuse (${err instanceof Error ? err.message : String(err)})`);
        return null;
    }
}
/**
 * Get Langfuse callback handler for LangGraph invoke.
 * Returns undefined if Langfuse is not enabled.
 */
export function getLangfuseCallbacks(config) {
    if (!LangfuseCallbackHandler) {
        return undefined;
    }
    const Handler = LangfuseCallbackHandler;
    const handler = new Handler({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        host: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
        sessionId: config?.configurable?.thread_id,
        userId: config?.configurable?.tenantId,
        metadata: {
            agentId: config?.configurable?.agentId,
            runId: config?.configurable?.runId,
            tenantId: config?.configurable?.tenantId,
        },
    });
    return [handler];
}
/**
 * Create a trace in Langfuse for manual instrumentation.
 * Useful for non-LangChain code paths.
 */
export function createLangfuseTrace(params) {
    if (!langfuseClient) {
        return null;
    }
    const trace = langfuseClient;
    if (typeof trace.trace !== 'function')
        return null;
    return trace.trace({
        name: params.name,
        userId: params.userId,
        sessionId: params.sessionId,
        metadata: params.metadata,
    });
}
//# sourceMappingURL=langfuse-adapter.js.map
import { logger } from '@dos/platform-core/observability';
// ============================================
// Langfuse Adapter — Open-Source LLM Observability
// Alternative to LangSmith (fully open-source, MIT licensed)
// ============================================

/**
 * Langfuse integration for LangChain/LangGraph.
 *
 * Langfuse is a fully open-source (MIT) alternative to LangSmith.
 * It provides:
 * - LLM tracing and observability
 * - Token usage tracking
 * - Performance metrics
 * - Self-hostable natively (systemd-managed) — this platform does not use containers.
 *
 * Installation:
 *   pnpm add langfuse
 *
 * Configuration (environment variables):
 *   LANGFUSE_ENABLED=true
 *   LANGFUSE_PUBLIC_KEY=<public_key>
 *   LANGFUSE_SECRET_KEY=<secret_key>
 *   LANGFUSE_HOST=https://cloud.langfuse.com  # or self-hosted URL
 *
 * Self-hosted setup: run Langfuse natively (systemd unit) on the obs host and
 * point LANGFUSE_HOST at it. See https://docs.langfuse.com/self-hosting for
 * native install (skip the container instructions).
 */

import type { RunnableConfig } from '@langchain/core/runnables';

let LangfuseCallbackHandler: any = null;
let langfuseClient: Record<string, unknown> | null = null;

export function initLangfuse(): unknown {
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

    langfuseClient = new (langfuse.Langfuse as new (opts: Record<string, string>) => Record<string, unknown>)({
      publicKey,
      secretKey,
      host,
    });

    LangfuseCallbackHandler = CallbackHandler;

    logger.info(`[Langfuse] Initialized → ${host}`);
    return LangfuseCallbackHandler;
  } catch (err: unknown) {
    logger.warn(`[Langfuse] Package not installed — install with: pnpm add langfuse (${err instanceof Error ? err.message : String(err)})`);
    return null;
  }
}

/**
 * Get Langfuse callback handler for LangGraph invoke.
 * Returns undefined if Langfuse is not enabled.
 */
export function getLangfuseCallbacks(config?: RunnableConfig): unknown[] | undefined {
  if (!LangfuseCallbackHandler) {
    return undefined;
  }

  const Handler = LangfuseCallbackHandler as new (opts: Record<string, unknown>) => any;
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
export function createLangfuseTrace(params: {
  name: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): unknown {
  if (!langfuseClient) {
    return null;
  }

  const trace = langfuseClient as { trace?: (opts: Record<string, unknown>) => unknown };
  if (typeof trace.trace !== 'function') return null;
  return trace.trace({
    name: params.name,
    userId: params.userId,
    sessionId: params.sessionId,
    metadata: params.metadata,
  });
}

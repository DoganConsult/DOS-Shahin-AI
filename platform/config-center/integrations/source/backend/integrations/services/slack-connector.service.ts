// ============================================
// Shahin — Slack Connector Service
// Posts formatted messages to Slack channels
// using webhook URLs or the chat.postMessage API.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';

// === Types ===

export interface SlackConfig {
  webhookUrl?: string;   // Incoming webhook URL
  botToken?: string;     // Bot OAuth token (for chat.postMessage)
}

export interface SlackMessage {
  text: string;
  blocks?: Record<string, unknown>[];
}

export interface SlackErrorResult {
  error: string;
}

// === Config Retrieval ===

/**
 * Reads Slack integration config from the integration_configs
 * tenant table where type = 'slack'.
 */
export async function getSlackConfig(
  tenantId: string
): Promise<SlackConfig | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT config FROM "${schema}".integration_configs
     WHERE type = 'slack' AND enabled = true
     LIMIT 1`,
    []
  );
  if (result.rows.length === 0) return null;
  return getFirstRow(result)?.config as SlackConfig;
}

// === Slack Operations ===

/**
 * Posts a message to a Slack channel.
 *
 * Strategy:
 * - If a webhookUrl is configured, POST directly to the webhook (channel is ignored by Slack webhooks).
 * - If a botToken is configured, POST to the Slack chat.postMessage API with the channel parameter.
 * - Returns void on success or { error } on failure.
 *
 * Validates: Requirements 9.5
 */
export async function postMessage(
  tenantId: string,
  channel: string,
  message: SlackMessage
): Promise<void | SlackErrorResult> {
  const config = await getSlackConfig(tenantId);
  if (!config) {
    return { error: "Slack integration is not configured for this tenant" };
  }

  // Prefer webhook URL if available
  if (config.webhookUrl) {
    return postViaWebhook(config.webhookUrl, message);
  }

  // Fall back to Bot Token + chat.postMessage
  if (config.botToken) {
    return postViaBotApi(config.botToken, channel, message);
  }

  return { error: "Slack config has neither webhookUrl nor botToken" };
}

/**
 * Posts a message using a Slack Incoming Webhook URL.
 */
async function postViaWebhook(
  webhookUrl: string,
  message: SlackMessage
): Promise<void | SlackErrorResult> {
  const body: Record<string, unknown> = { text: message.text };
  if (message.blocks) {
    body.blocks = message.blocks;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const text = await response.text();
      return { error: `Slack webhook error (${response.status}): ${text}` };
    }
  } catch (err: unknown) {
    return { error: `Slack webhook request failed: ${toErrorMessage(err)}` };
  }
}

/**
 * Posts a message using the Slack chat.postMessage API with a Bot token.
 */
async function postViaBotApi(
  botToken: string,
  channel: string,
  message: SlackMessage
): Promise<void | SlackErrorResult> {
  const body: Record<string, unknown> = {
    channel,
    text: message.text,
  };
  if (message.blocks) {
    body.blocks = message.blocks;
  }

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${botToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const text = await response.text();
      return { error: `Slack API error (${response.status}): ${text}` };
    }

    const result = await response.json() as Promise<Record<string, unknown>>;

    if (!result.ok) {

      return { error: `Slack API returned error: ${result.error}` };
    }
  } catch (err: unknown) {
    return { error: `Slack API request failed: ${toErrorMessage(err)}` };
  }
}

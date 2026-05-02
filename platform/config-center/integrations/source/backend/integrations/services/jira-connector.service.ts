// ============================================
// Shahin — Jira Connector Service
// Creates Jira issues from remediation tasks and
// syncs issue status using Jira REST API v3.
// Uses Basic Auth with base64-encoded email:apiToken.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';

// === Types ===

export interface JiraConfig {
  baseUrl: string;       // e.g. "https://yourorg.atlassian.net"
  email: string;         // Jira account email
  apiToken: string;      // Jira API token
  projectKey: string;    // e.g. "GRC"
}

export interface JiraIssueData {
  title: string;
  description: string;
  priority: string;
  assignee?: string;
}

export interface JiraCreateResult {
  issueKey: string;
  url: string;
}

export interface JiraSyncResult {
  status: string;
}

export interface JiraErrorResult {
  error: string;
}

// === Config Retrieval ===

/**
 * Reads Jira integration config from the integration_configs
 * tenant table where type = 'jira'.
 */
export async function getJiraConfig(
  tenantId: string
): Promise<JiraConfig | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT config FROM "${schema}".integration_configs
     WHERE type = 'jira' AND enabled = true
     LIMIT 1`,
    []
  );
  if (result.rows.length === 0) return null;
  return getFirstRow(result)?.config as JiraConfig;
}

// === Helper ===

/**
 * Builds the Basic Auth header value from email and apiToken.
 */
function buildAuthHeader(email: string, apiToken: string): string {
  const encoded = Buffer.from(`${email}:${apiToken}`).toString("base64");
  return `Basic ${encoded}`;
}

// === Jira Operations ===

/**
 * Creates a Jira issue via REST API v3.
 * Maps title → summary, description → ADF body, priority, and optional assignee.
 *
 * Returns { issueKey, url } on success or { error } on failure.
 *
 * Validates: Requirements 9.4
 */
export async function createIssue(
  tenantId: string,
  data: JiraIssueData
): Promise<JiraCreateResult | JiraErrorResult> {
  const config = await getJiraConfig(tenantId);
  if (!config) {
    return { error: "Jira integration is not configured for this tenant" };
  }

  const body: Record<string, unknown> = {
    fields: {
      project: { key: config.projectKey },
      summary: data.title,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: data.description }],
          },
        ],
      },
      issuetype: { name: "Task" },
      priority: { name: data.priority },
    },
  };

  if (data.assignee) {

    body.fields.assignee = { accountId: data.assignee };
  }

  try {
    const response = await fetch(
      `${config.baseUrl}/rest/api/3/issue`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: buildAuthHeader(config.email, config.apiToken),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { error: `Jira API error (${response.status}): ${text}` };
    }

    const result = await response.json() as Promise<Record<string, unknown>>;
    return {

      issueKey: result.key,

      url: `${config.baseUrl}/browse/${result.key}`,
    };
  } catch (err: unknown) {
    return { error: `Jira request failed: ${toErrorMessage(err)}` };
  }
}

/**
 * Syncs the status of a Jira issue by its key (e.g. "GRC-42").
 * GETs the issue from Jira REST API and returns the current status name.
 *
 * Returns { status } on success or { error } on failure.
 *
 * Validates: Requirements 9.4
 */
export async function syncStatus(
  tenantId: string,
  issueKey: string
): Promise<JiraSyncResult | JiraErrorResult> {
  const config = await getJiraConfig(tenantId);
  if (!config) {
    return { error: "Jira integration is not configured for this tenant" };
  }

  try {
    const response = await fetch(
      `${config.baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=status`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: buildAuthHeader(config.email, config.apiToken),
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { error: `Jira API error (${response.status}): ${text}` };
    }

    const result = await response.json() as Promise<Record<string, unknown>>;
    return {

      status: result.fields?.status?.name ?? "Unknown",
    };
  } catch (err: unknown) {
    return { error: `Jira request failed: ${toErrorMessage(err)}` };
  }
}

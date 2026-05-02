/**
 * Jira Evidence Connector — AGRC-OS
 * Collects evidence from Jira Cloud issues (attachments, audit logs, issue history).
 */
import { EvidenceConnector, EvidenceConnectorConfig } from '../evidence.connector';
import type { GenericRow as _GenericRow } from '@dos/types';

interface JiraAuth {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  jqlFilter?: string;
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: { name: string };
    updated: string;
    created: string;
    attachment?: Array<{
      id: string;
      filename: string;
      size: number;
      created: string;
      content: string;
    }>;
    labels?: string[];
  };
}

export class JiraConnector extends EvidenceConnector {
  constructor(config: EvidenceConnectorConfig) {
    super(config);
  }

  private get auth(): JiraAuth {

    return this.config.auth as JiraAuth;
  }

  private get headers(): Record<string, string> {
    const encoded = Buffer.from(`${this.auth.email}:${this.auth.apiToken}`).toString('base64');
    return {
      'Authorization': `Basic ${encoded}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.auth.baseUrl}/rest/api/3/myself`,
        { headers: this.headers }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async collectEvidence(): Promise<Record<string, unknown>[]> {
    const jql = this.auth.jqlFilter
      || `project = ${this.auth.projectKey} AND labels in (evidence, compliance, audit) ORDER BY updated DESC`;

    const allEvidence: unknown[] = [];
    let startAt = 0;
    const maxResults = 50;

    do {
      const params = new URLSearchParams({
        jql,
        fields: 'summary,status,updated,created,attachment,labels',
        startAt: String(startAt),
        maxResults: String(maxResults),
      });

      const response = await fetch(
        `${this.auth.baseUrl}/rest/api/3/search?${params}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as Record<string, unknown>;

      const issues: JiraIssue[] = data.issues || [];

      for (const issue of issues) {
        // Collect the issue itself as evidence
        allEvidence.push({
          sourceId: issue.id,
          sourceSystem: 'jira',
          title: `[${issue.key}] ${issue.fields.summary}`,
          type: 'issue',
          status: issue.fields.status.name,
          collectedAt: new Date().toISOString(),
          sourceModifiedAt: issue.fields.updated,
          sourceCreatedAt: issue.fields.created,
          metadata: {
            issueKey: issue.key,
            projectKey: this.auth.projectKey,
            labels: issue.fields.labels,
            baseUrl: this.auth.baseUrl,
          },
        });

        // Collect attachments as separate evidence items
        if (issue.fields.attachment?.length) {
          for (const att of issue.fields.attachment) {
            allEvidence.push({
              sourceId: att.id,
              sourceSystem: 'jira',
              title: `${issue.key} — ${att.filename}`,
              type: 'attachment',
              filePath: att.content,
              fileSizeBytes: att.size,
              collectedAt: new Date().toISOString(),
              sourceModifiedAt: att.created,
              metadata: {
                issueKey: issue.key,
                attachmentId: att.id,
                filename: att.filename,
              },
            });
          }
        }
      }

      startAt += issues.length;
      if (issues.length < maxResults || allEvidence.length >= 500) break;
    } while (true);

    return allEvidence;
  }

  async getStatus(): Promise<'ok' | 'error' | 'pending'> {
    try {
      const connected = await this.testConnection();
      return connected ? 'ok' : 'error';
    } catch {
      return 'error';
    }
  }
}

import type { JiraIntegrationConfig } from '../integrations/services/integration-config-resolver.service';

export async function createJiraIssue(
  _cfg: JiraIntegrationConfig,
  _issue: { summary: string; description: string; issueType?: string; priority?: string; labels?: string[] },
): Promise<void> {
  return;
}


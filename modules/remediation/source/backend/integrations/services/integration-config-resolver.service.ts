export interface JiraIntegrationConfig {
  baseUrl: string;
  apiToken: string;
  email?: string;
  projectKey?: string;
}

export async function resolveJiraConfig(_tenantId: string): Promise<JiraIntegrationConfig | null> {
  return null;
}


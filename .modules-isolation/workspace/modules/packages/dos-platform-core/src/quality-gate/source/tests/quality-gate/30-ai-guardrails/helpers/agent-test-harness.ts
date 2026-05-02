export interface AgentTestHarnessOptions {
  baseUrl?: string;
  apiKey?: string;
  tenantId?: string;
  timeoutMs?: number;
}

export interface AgentTestHarness {
  call(prompt: string): Promise<string>;
  callForTenant(tenantId: string, prompt: string): Promise<string>;
  cleanup(): Promise<void>;
}

async function postToAgent(
  baseUrl: string,
  apiKey: string,
  tenantId: string,
  prompt: string,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify({ message: prompt }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`Agent returned ${resp.status}: ${await resp.text()}`);
    }
    const json = (await resp.json()) as { response?: string; content?: string; message?: string };
    return json.response ?? json.content ?? json.message ?? '';
  } finally {
    clearTimeout(timer);
  }
}

export function createAgentTestHarness(opts: AgentTestHarnessOptions = {}): AgentTestHarness {
  const baseUrl = opts.baseUrl ?? process.env['AGENT_TEST_BASE_URL'] ?? 'http://localhost:3000';
  const apiKey = opts.apiKey ?? process.env['AGENT_TEST_API_KEY'] ?? 'test-key';
  const defaultTenantId = opts.tenantId ?? process.env['AGENT_TEST_TENANT_ID'] ?? 'test-tenant';
  const timeoutMs = opts.timeoutMs ?? 30_000;

  return {
    async call(prompt: string): Promise<string> {
      return postToAgent(baseUrl, apiKey, defaultTenantId, prompt, timeoutMs);
    },
    async callForTenant(tenantId: string, prompt: string): Promise<string> {
      return postToAgent(baseUrl, apiKey, tenantId, prompt, timeoutMs);
    },
    async cleanup(): Promise<void> {
      // no-op for HTTP harness
    },
  };
}

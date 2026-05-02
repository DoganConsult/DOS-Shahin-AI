import { ServiceClient } from '@dos/service-client';

const aiClient = new ServiceClient({
  baseUrl: process.env.AI_ENGINE_SERVICE_URL || process.env.AI_GATEWAY_SERVICE_URL || 'http://127.0.0.1:4020',
  timeout: 10000,
  retries: 1,
});

export async function orchestratedAssessRisk(tenantId: string, riskId: string): Promise<unknown> {
  try {
    const res = await aiClient.post('/api/ai/orchestration/assess-risk', { tenantId, riskId }, { 'x-tenant-id': tenantId });
    return res;
  } catch {
    return null;
  }
}

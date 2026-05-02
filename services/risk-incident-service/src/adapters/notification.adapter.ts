import { ServiceClient } from '@dos/service-client';

const notificationClient = new ServiceClient({
  baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:4005',
  timeout: 5000,
  retries: 1,
});

export async function sendNotification(
  tenantId: string,
  userId: string,
  title: string,
  body: string,
  type: string = 'info',
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await notificationClient.post('/api/notifications', {
      tenantId,
      userId,
      title,
      body,
      type,
      source: 'risk-incident-service',
      metadata: metadata || {},
    }, { 'x-tenant-id': tenantId });
  } catch {}
}

// Phase 0.5: Build-only stubs. Risk notifications are not user-certified in Wave 1.
// These satisfy TypeScript imports so the service builds; runtime behaviour is
// a no-op until Wave 2 restores the full notification surface.
export async function createNotification(
  _tenantId: string,
  _payload: Record<string, unknown>,
): Promise<void> {
  return;
}

export function buildRiskScoreChangeNotifications(
  ..._args: unknown[]
): Array<{ userId: string; type: string; [k: string]: unknown }> {
  return [];
}

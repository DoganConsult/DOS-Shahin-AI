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
    await notificationClient.post(
      '/api/notifications',
      {
        tenantId,
        userId,
        title,
        body,
        type,
        source: 'risk',
        metadata: metadata || {},
      },
      { 'x-tenant-id': tenantId },
    );
  } catch {}
}

export async function createNotification(
  tenantId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await notificationClient.post('/api/notifications', { tenantId, source: 'risk', ...payload }, { 'x-tenant-id': tenantId });
  } catch {}
}

export function buildRiskScoreChangeNotifications(
  userId: string,
  oldScore: number,
  newScore: number,
): Array<{ userId: string; type: string }> {
  if (oldScore === newScore) return [];

  const band = (s: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (s >= 20) return 'critical';
    if (s >= 12) return 'high';
    if (s >= 6) return 'medium';
    return 'low';
  };

  const from = band(oldScore);
  const to = band(newScore);
  if (from === to) return [];

  return [{ userId, type: to === 'critical' ? 'warning' : 'info' }];
}


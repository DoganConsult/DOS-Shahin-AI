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
      source: 'analytics-service',
      metadata: metadata || {},
    }, { 'x-tenant-id': tenantId });
  } catch {}
}

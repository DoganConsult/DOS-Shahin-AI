export const notificationService = {
  send: async (_tenantId: string, _notification: Record<string, unknown>) => {},
  broadcast: async (_tenantId: string, _message: Record<string, unknown>) => {},
};

export async function createNotification(
  tenantId: string,
  notification: Record<string, unknown>,
): Promise<void> {
  await notificationService.send(tenantId, notification);
}

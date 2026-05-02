export const notificationService = {
  send: async (_tenantId: string, _notification: Record<string, unknown>) => {},
  broadcast: async (_tenantId: string, _message: Record<string, unknown>) => {},
};
export const createNotification = notificationService.send;

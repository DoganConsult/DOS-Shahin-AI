export type InboxItemStatus = 'unread' | 'read' | 'actioned' | 'snoozed' | 'archived';
export type InboxItemType = 'notification' | 'approval_request' | 'task_assignment' | 'escalation' | 'system_alert' | 'reminder';
export type InboxPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface InboxItemContract {
  itemId: string; tenantId: string; userId: string;
  itemType: InboxItemType; priority: InboxPriority; status: InboxItemStatus;
  titleEn: string; titleAr: string | null;
  bodyEn: string; bodyAr: string | null;
  sourceModule: string; sourceId: string | null; actionUrl: string | null;
  snoozedUntil: string | null; readAt: string | null; actionedAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface InboxDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalItems: number; unreadCount: number;
  urgentUnread: number; staleItemCount: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface InboxDashboardContract {
  totalItems: number; byStatus: Record<string, number>; byType: Record<string, number>;
  unreadCount: number; urgentCount: number; avgResponseTimeHours: number | null;
}

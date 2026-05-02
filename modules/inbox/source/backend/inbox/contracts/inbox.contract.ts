export interface InboxListParams {
  tenantId: string;
  userId: string;
  page?: number;
  limit?: number;
  status?: string;
  itemType?: string;
  sourceModule?: string;
  priority?: string;
  readStatus?: 'read' | 'unread' | 'all';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface InboxListResponse {
  success: boolean;
  data: InboxItemContract[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface InboxDetailResponse {
  success: boolean;
  data: InboxItemContract | null;
  actions?: InboxActionContract[];
}

export interface InboxMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export type InboxItemStatus = 'unread' | 'read' | 'actioned' | 'snoozed' | 'dismissed' | 'expired';
export type InboxItemType = 'approval' | 'task' | 'notification' | 'alert' | 'escalation' | 'mention' | 'system';

export interface InboxItemContract {
  itemId: string;
  tenantId: string;
  userId: string;
  itemType: InboxItemType;
  status: InboxItemStatus;
  priority: 'critical' | 'high' | 'normal' | 'low';
  title: string;
  summary?: string;
  sourceModule: string;
  sourceEntityId?: string;
  sourceEntityType?: string;
  sourceEvent?: string;
  actionRequired: boolean;
  actionUrl?: string;
  actionDeadline?: string;
  snoozedUntil?: string;
  readAt?: string;
  actionedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface InboxActionContract {
  actionId: string;
  itemId: string;
  actionType: 'approve' | 'reject' | 'delegate' | 'complete' | 'dismiss' | 'snooze' | 'navigate';
  label: string;
  requiresConfirmation: boolean;
  dangerLevel: 'safe' | 'moderate' | 'destructive';
  targetUrl?: string;
}

export interface InboxTriageContract {
  userId: string;
  tenantId: string;
  totalItems: number;
  unreadCount: number;
  actionRequiredCount: number;
  overdueCount: number;
  priorityBreakdown: Record<string, number>;
  typeBreakdown: Record<InboxItemType, number>;
  oldestUnactioned?: string;
}

export interface InboxBulkOperationContract {
  operation: 'mark_read' | 'dismiss' | 'snooze' | 'archive';
  itemIds: string[];
  targetValue?: string;
  performedBy: string;
  performedAt: string;
  results: { id: string; success: boolean; error?: string }[];
}

export interface InboxAggregationContract {
  userId: string;
  tenantId: string;
  sources: { moduleCode: string; pendingCount: number; lastUpdatedAt: string }[];
  totalPending: number;
  refreshedAt: string;
}

export interface InboxDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  aggregationHealth: {
    sourceModulesConnected: number;
    staleSources: number;
    aggregationLagMs: number;
  };
  itemHealth: {
    expiredUnactioned: number;
    overdueActions: number;
    staleItems90Days: number;
  };
  deliveryHealth: {
    failedDeliveries: number;
    duplicateItems: number;
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface InboxDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  statusBreakdown: Record<InboxItemStatus, number>;
  typeBreakdown: Record<InboxItemType, number>;
  totalUnread: number;
  totalActionRequired: number;
  averageResponseTimeMinutes: number;
  sourceModuleBreakdown: Record<string, number>;
  trends: { date: string; receivedCount: number; actionedCount: number }[];
}

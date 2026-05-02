import type { InboxItemContract, InboxDiagnosticsContract } from '../contracts/inbox.contracts';
export function mockInboxItem(overrides?: Partial<InboxItemContract>): InboxItemContract {
  return { itemId: 'ibx-001', tenantId: 'tenant-001', userId: 'user-001', itemType: 'approval_request', priority: 'high',
    status: 'unread', titleEn: 'Risk Assessment Approval Required', titleAr: null,
    bodyEn: 'A new risk assessment requires your review and approval', bodyAr: null,
    sourceModule: 'risk', sourceId: 'risk-001', actionUrl: '/risk/assessments/risk-001',
    snoozedUntil: null, readAt: null, actionedAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockInboxDiagnostics(overrides?: Partial<InboxDiagnosticsContract>): InboxDiagnosticsContract {
  return { moduleCode: 'inbox', healthy: true, totalItems: 150, unreadCount: 23, urgentUnread: 3, staleItemCount: 5,
    checks: [{ name: 'inbox-delivery', passed: true }, { name: 'stale-items', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
export function mockInboxList(count = 5): InboxItemContract[] { return Array.from({ length: count }, (_, i) => mockInboxItem({ itemId: `ibx-${String(i+1).padStart(3,'0')}`, titleEn: `Inbox Item ${i+1}` })); }

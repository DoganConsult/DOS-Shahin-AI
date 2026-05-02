import type { RecordContract, RecordsDiagnosticsContract } from '../contracts/records.contracts';
export function mockRecord(overrides?: Partial<RecordContract>): RecordContract {
  return { recordId: 'rec-001', tenantId: 'tenant-001', code: 'REC-AUD-001', titleEn: 'Annual Audit Report 2025', titleAr: null,
    status: 'retention', classification: 'confidential', retentionPolicy: 'long_term',
    ownerId: 'user-001', custodianId: 'user-002', sourceModule: 'audit', sourceId: 'eng-001',
    retentionEndDate: new Date(Date.now() + 365 * 5 * 86400000).toISOString(), disposalDate: null,
    legalHoldReason: null, legalHoldAppliedById: null,
    lastReviewedAt: new Date().toISOString(), nextReviewDate: new Date(Date.now() + 365 * 86400000).toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockRecordsDiagnostics(overrides?: Partial<RecordsDiagnosticsContract>): RecordsDiagnosticsContract {
  return { moduleCode: 'records', healthy: true, totalRecords: 500, retentionExpiredCount: 12, legalHoldCount: 3,
    pendingDisposal: 8, unclassifiedCount: 5,
    checks: [{ name: 'retention-pipeline', passed: true }, { name: 'disposal-review', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
export function mockRecordList(count = 5): RecordContract[] { return Array.from({ length: count }, (_, i) => mockRecord({ recordId: `rec-${String(i+1).padStart(3,'0')}`, titleEn: `Record ${i+1}` })); }

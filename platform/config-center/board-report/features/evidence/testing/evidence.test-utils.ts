import type { EvidenceItemContract, EvidenceCollectionContract } from '../contracts/evidence.contracts';

export function mockEvidenceItem(overrides?: Partial<EvidenceItemContract>): EvidenceItemContract {
  return {
    evidenceId: 'ev-001',
    code: 'EV-2024-001',
    nameEn: 'Firewall Configuration Screenshot',
    nameAr: null,
    evidenceType: 'screenshot',
    state: 'approved',
    linkedEntityType: 'controls',
    linkedEntityId: 'ctrl-001',
    collectedAt: new Date().toISOString(),
    expiresAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockEvidenceCollection(overrides?: Partial<EvidenceCollectionContract>): EvidenceCollectionContract {
  return {
    collectionId: 'coll-001',
    name: 'Q1 2025 Evidence Collection',
    state: 'completed',
    itemCount: 42,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

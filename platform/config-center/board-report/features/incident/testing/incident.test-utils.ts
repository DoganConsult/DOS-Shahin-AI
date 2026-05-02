import type { IncidentContract, IncidentTimelineEntryContract, IncidentResponseActionContract, PostIncidentReviewContract, IncidentDiagnosticsContract } from '../contracts/incident.contracts';

export function mockIncident(overrides?: Partial<IncidentContract>): IncidentContract {
  return {
    incidentId: 'inc-001',
    tenantId: 'tenant-001',
    titleEn: 'Data Center Power Outage',
    titleAr: null,
    description: 'Primary data center experienced unexpected power failure',
    severity: 'critical',
    status: 'investigating',
    category: 'system_failure',
    reportedById: 'user-001',
    assignedToId: 'user-002',
    triageOwnerId: 'user-003',
    detectedAt: new Date().toISOString(),
    reportedAt: new Date().toISOString(),
    resolvedAt: null,
    closedAt: null,
    impactSummary: 'Multiple systems impacted',
    rootCause: null,
    linkedRiskIds: ['risk-001'],
    linkedControlIds: [],
    linkedEvidenceIds: [],
    isRepeat: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockTimelineEntry(overrides?: Partial<IncidentTimelineEntryContract>): IncidentTimelineEntryContract {
  return {
    entryId: 'entry-001',
    incidentId: 'inc-001',
    entryType: 'action',
    description: 'Initial triage completed',
    actorId: 'user-001',
    timestamp: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

export function mockResponseAction(overrides?: Partial<IncidentResponseActionContract>): IncidentResponseActionContract {
  return {
    actionId: 'action-001',
    incidentId: 'inc-001',
    title: 'Isolate affected systems',
    description: 'Disconnect compromised network segments',
    assignedToId: 'user-002',
    status: 'in_progress',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    completedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockPostIncidentReview(overrides?: Partial<PostIncidentReviewContract>): PostIncidentReviewContract {
  return {
    reviewId: 'pir-001',
    incidentId: 'inc-001',
    lessonsLearned: 'Need redundant power supply',
    rootCauseAnalysis: 'Single point of failure in power grid',
    preventiveMeasures: ['Install UPS backup', 'Add generator failover'],
    reviewedById: 'user-003',
    reviewedAt: new Date().toISOString(),
    status: 'draft',
    ...overrides,
  };
}

export function mockIncidentDiagnostics(overrides?: Partial<IncidentDiagnosticsContract>): IncidentDiagnosticsContract {
  return {
    moduleCode: 'incident',
    healthy: true,
    totalIncidents: 45,
    openIncidents: 12,
    criticalOpen: 2,
    stuckInvestigations: 1,
    overdueResponseActions: 3,
    repeatIncidentCount: 4,
    avgResolutionHours: 18.5,
    checks: [
      { name: 'incident-intake', passed: true },
      { name: 'triage-pipeline', passed: true },
      { name: 'escalation-policy', passed: true },
    ],
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockIncidentList(count = 5): IncidentContract[] {
  return Array.from({ length: count }, (_, i) =>
    mockIncident({ incidentId: `inc-${String(i + 1).padStart(3, '0')}`, titleEn: `Incident ${i + 1}` })
  );
}

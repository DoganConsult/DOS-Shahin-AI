import type { GovAiSignalContract, GovAiInsightContract, GovAiDiagnosticsContract } from '../contracts/governance-ai.contracts';
export function mockGovAiSignal(overrides?: Partial<GovAiSignalContract>): GovAiSignalContract {
  return { signalId: 'sig-001', tenantId: 'tenant-001', category: 'regulatory_change', status: 'interpreted',
    titleEn: 'DORA Article 6 Compliance Gap Detected', titleAr: null, summary: 'ICT risk management framework shows non-compliance with DORA Art. 6',
    confidence: 0.87, sourceModules: ['dora', 'controls'], detectedAt: new Date().toISOString(),
    escalatedToId: null, dismissedById: null, linkedInsightIds: ['ins-001'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockGovAiInsight(overrides?: Partial<GovAiInsightContract>): GovAiInsightContract {
  return { insightId: 'ins-001', signalId: 'sig-001', narrative: 'Analysis indicates gaps in ICT risk framework', recommendation: 'Initiate remediation plan for DORA Art. 6 controls',
    impactLevel: 'high', generatedAt: new Date().toISOString(), modelVersion: 'v2.1', ...overrides };
}
export function mockGovAiDiagnostics(overrides?: Partial<GovAiDiagnosticsContract>): GovAiDiagnosticsContract {
  return { moduleCode: 'governance-ai', healthy: true, totalSignals: 45, pendingAnalysis: 3, escalatedCount: 5, avgConfidence: 0.78,
    checks: [{ name: 'signal-pipeline', passed: true }, { name: 'model-health', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}

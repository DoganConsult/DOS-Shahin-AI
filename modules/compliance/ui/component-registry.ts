/**
 * Compliance UI component registry.
 *
 * Single source of truth for the Angular `COMPONENT_MAP` allowlist. The list
 * is sourced from the W1.5 Dynamic-UI seed manifest so the runtime nav/routes
 * (database) and the SPA registration (this file) cannot drift.
 *
 * Each entry declares:
 *   - componentKey: the platform-stable identifier used by Dynamic UI
 *   - readiness:    READY | PARTIAL | STUB | BLOCKED (W6 lifecycle)
 *   - permissionKey: optional gate inherited from the seed
 *
 * Module loaders (host SPA) import COMPLIANCE_COMPONENT_KEYS to populate their
 * compile-time map. The runtime backend surfaces the same data through
 * /api/compliance/ui/components for discovery & UPOR shadow checks.
 */
import seedManifest from '../db/seeds/dynamic-ui/index.json';
import { COMPONENT_CLASS_RESOLVER, COMPONENT_PLACEHOLDERS } from './component-class-resolver';

// Re-export the resolver so consumers (and the contract test) can pull it via
// the same barrel that owns the registry. The dist build needs the resolver
// emitted; the import below transitively includes it.
export { COMPONENT_CLASS_RESOLVER, COMPONENT_PLACEHOLDERS };

export type ComponentReadiness = 'READY' | 'PARTIAL' | 'STUB' | 'BLOCKED';

export interface ComponentRegistryEntry {
  componentKey: string;
  moduleCode: 'compliance';
  source: 'compliance-ui-library';
  readiness: ComponentReadiness;
  permissionKey?: string | null;
}

const PERMISSION_BY_KEY: Record<string, string> = {
  ComplianceOverviewPage: 'compliance.read',
  CompliancePosturePage: 'compliance.read',
  ComplianceWorkQueuePage: 'compliance.read',
  ComplianceCalendarPage: 'compliance.read',
  ComplianceHeatmapPage: 'compliance.read',
  ComplianceRoadmapPage: 'compliance.read',
  ComplianceTemplatesPage: 'compliance.read',
  ComplianceFrameworksPage: 'framework.record.read',
  ComplianceObligationsPage: 'compliance.read',
  ObligationDetailPage: 'compliance.read',
  ObligationWorkspacePage: 'compliance.read',
  ComplianceRegulatoryChangesPage: 'compliance.read',
  ComplianceAssessmentsPage: 'assessment.record.read',
  ComplianceAttestationsPage: 'compliance.read',
  ComplianceFindingsPage: 'compliance.read',
  ComplianceGapsPage: 'compliance.read',
  ComplianceExceptionsPage: 'compliance.read',
  ComplianceEvidenceOpsPage: 'compliance.read',
  ComplianceReportsPage: 'compliance.read',
  GenericModuleLifecycle: 'compliance.admin',
  ComplianceAdminPage: 'compliance.admin',
  AssertionDashboardPage: 'compliance.read',
  RcsaCampaignsPage: 'assessment.record.read',
  RegulatoryReasoningStudioPage: 'compliance.read',
  ComplianceControlsPage: 'compliance.read',
  ComplianceControlDetailPage: 'compliance.read',
  ComplianceEvidencePage: 'compliance.read',
  ComplianceRegulatorPage: 'compliance.export',
  ComplianceKsaPage: 'compliance.read',
  ComplianceDiagnosticsPage: 'compliance.admin',
  FrameworkHubPage: 'compliance.read',
  FrameworkMappingPage: 'compliance.read',
  FrameworkScorecardPage: 'compliance.read',
  UcfBrowserPage: 'compliance.read',
  AssessmentTemplatesPage: 'compliance.read',
  AssessmentsListPage: 'compliance.read',
  NcaAssessmentPage: 'compliance.read',
  SamaAssessmentPage: 'compliance.read',
  MaturityJourneyPage: 'compliance.read',
  MaturityWizardPage: 'compliance.write',
  ScoringPage: 'compliance.read',
  ScoringPoliciesPage: 'compliance.read',
  ScoringPolicyDetailPage: 'compliance.read',
  ControlPosturePage: 'compliance.read',
  ControlTestingPage: 'compliance.write',
  ControlsMonitoringPage: 'compliance.read',
  RegulationCompilerPage: 'compliance.write',
  RegulatoryDeltaDashboardPage: 'compliance.read',
  RegulatoryFeedsPage: 'compliance.read',
  ExceptionManagerPage: 'compliance.write',
  EsgPage: 'compliance.read',
  EthicsIntegrityPage: 'compliance.read',
  SoxCompliancePage: 'compliance.read',
  KsaHubPage: 'compliance.read',
  IntelligenceHubPage: 'compliance.read',
  ContentPackPage: 'compliance.admin',
  MappingPage: 'compliance.read',
  TaxonomyPage: 'compliance.read',
  RegistryPage: 'compliance.read',
  OntologyCatalogPage: 'compliance.read',
  ComplianceSavingsPage: 'compliance.read',
};

/**
 * READY components have a real backing implementation in the host SPA.
 * Until each is verified end-to-end, all start as STUB (matches W1.5 seed
 * `004_seed_compliance_readiness.sql`). W6.x flips entries individually as
 * the corresponding pages are wired and proven.
 */
const READY_COMPONENT_KEYS = new Set<string>([
  // intentionally empty until per-page proof lands
]);

const seedKeys = ((seedManifest as { componentKeys?: string[] }).componentKeys ?? []) as string[];

export const COMPLIANCE_COMPONENT_KEYS: ComponentRegistryEntry[] = seedKeys.map((componentKey) => ({
  componentKey,
  moduleCode: 'compliance' as const,
  source: 'compliance-ui-library' as const,
  readiness: READY_COMPONENT_KEYS.has(componentKey) ? 'READY' : 'STUB',
  permissionKey: PERMISSION_BY_KEY[componentKey] ?? null,
}));

export const componentRegistryByKey: Readonly<Record<string, ComponentRegistryEntry>> =
  Object.freeze(
    COMPLIANCE_COMPONENT_KEYS.reduce<Record<string, ComponentRegistryEntry>>((acc, e) => {
      acc[e.componentKey] = e;
      return acc;
    }, {}),
  );

export function listComponentKeys(): string[] {
  return COMPLIANCE_COMPONENT_KEYS.map((e) => e.componentKey);
}

export function getComponentEntry(key: string): ComponentRegistryEntry | null {
  return componentRegistryByKey[key] ?? null;
}

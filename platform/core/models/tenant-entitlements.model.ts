export type PlatformMode = 'human' | 'hybrid' | 'shadow_agent' | 'full_autonomous';

export interface TenantEntitlements {
  tenantId: string;
  subscription: {
    tier: string;
    status: 'trialing' | 'active' | 'past_due' | 'grace' | 'suspended' | 'cancelled' | 'expired';
    trialEndsAt?: string | null;
  };
  /** Current workspace-level agent operation mode. Defaults to 'human' if unset. */
  operationMode?: PlatformMode;
  modules: {
    agrc: boolean;
    qiyas: boolean;
    dataGovernance: boolean;
    privacyOps: boolean;
    vendorGovernance: boolean;
    projectGovernance: boolean;
    connectorCenter: boolean;
    aiCopilot: boolean;
  };
  limits: {
    maxUsers: number;
    maxFrameworks: number;
    maxAssessments: number;
    maxDashboards: number;
    maxConnectors: number;
  };
  connectors: {
    siem: boolean;
    iam: boolean;
    cmdb: boolean;
    itsm: boolean;
    m365: boolean;
    vulnScanner: boolean;
  };
  features: {
    advancedScoring: boolean;
    qiyasBenchmarking: boolean;
    qiyasCertification: boolean;
    workflowDesigner: boolean;
    executiveNarratives: boolean;
    packInstaller: boolean;
  };
  moduleDetails?: Record<string, {
    enabled: boolean;
    licensed: boolean;
    tierGate: string | null;
    kickstartStatus: string;
  }>;
  licensedModules?: string[];
  ui: {
    visibleModules: string[];
    // DB-resolved per-role landing overrides (dos.tenant_landing_config).
    tenantLandingRouteByRole: Record<string, string>;
    // DB-resolved tenant landing route. null = operator has not seeded;
    // SPA must render empty/no-op (NO FRONTEND INVENTION).
    tenantLandingRoute?: string | null;
  };
}

export interface AgentGovernance {
    rolePurpose: string;
    allowedInputTypes: string[];
    allowedOutputTypes: string[];
    memoryScope: string[];
    approvalBoundary: 'low' | 'medium' | 'high';
    escalationPolicy: {
        escalateTo: string;
        afterMinutes: number;
    };
    auditLevel: 'minimal' | 'standard' | 'full';
    tenantConstraints: string;
    maxActionsPerCycle: number;
}
export interface ProductAgentDef {
    id: string;
    name: string;
    nameAr: string;
    domain: string;
    domainAr: string;
    icon: string;
    color: string;
    moduleCode: string;
    routePatterns: string[];
    delegationScope: string;
    quickPrompts: {
        en: string;
        ar: string;
    }[];
    governance: AgentGovernance;
}
export interface EventNamespace {
    prefix: string;
    events: string[];
}
export interface JobDef {
    name: string;
    cronExpression: string;
    description: string;
}
export interface KpiDef {
    key: string;
    labelEn: string;
    labelAr: string;
    icon: string;
    module: string;
}
export interface NavItemDef {
    icon: string;
    labelKey: string;
    route: string;
    requiredPermission: string;
    section: string;
    lifecyclePhase: string;
    agentId?: string;
    moduleGroup?: string;
}
export interface SeedFnDef {
    name: string;
    description: string;
    order: number;
}
export interface RoleLandingConfig {
    landingMap: Record<string, string>;
    modulesMap: Record<string, string[]>;
    widgetsMap: Record<string, string[]>;
}
export interface RegistrationDefaultsContract {
    ownerRole: string;
    userType: string;
    initialStatus: string;
}
export interface PackManifest {
    pack_key: string;
    pack_name: string;
    version: string;
    pack_type: string;
    description: string;
    modules: Record<string, boolean>;
    feature_flags: Record<string, boolean>;
    role_pack: Record<string, unknown>;
    dashboard_pack: Record<string, unknown>;
    widget_definitions: unknown[];
    dashboard_definitions: unknown[];
    workflow_pack: Record<string, unknown>;
    content_pack_installations: unknown[];
}
export interface ProductDefinition {
    code: string;
    pack_key: string;
    pack_name: string;
    version: string;
    pack_type: 'product';
    description: string;
    modules: Record<string, boolean>;
    feature_flags: Record<string, boolean>;
    role_pack: Record<string, unknown>;
    dashboard_pack: Record<string, unknown>;
    widget_definitions: unknown[];
    dashboard_definitions: unknown[];
    workflow_pack: Record<string, unknown>;
    content_pack_installations: unknown[];
    agents: ProductAgentDef[];
    rbac: {
        roleLandings: RoleLandingConfig;
    };
    nav: NavItemDef[];
    kpis: KpiDef[];
    eventNamespaces: EventNamespace[];
    jobs: JobDef[];
    seeds: SeedFnDef[];
    routes: unknown[];
    registrationDefaults: RegistrationDefaultsContract;
}
export declare function registerProduct(definition: ProductDefinition): void;
export declare function getProduct(code: string): ProductDefinition | undefined;
export declare function getAllProducts(): ProductDefinition[];

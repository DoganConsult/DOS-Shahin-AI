export interface DashboardContext {
    tenantId: string;
    roleCode: string;
    moduleCode?: string;
    scenario?: 'baseline' | 'assessment' | 'remediation' | 'audit' | 'executive' | 'operations';
    orgStatus: 'trial' | 'active' | 'suspended' | 'archived';
    orgMaturity?: 'initial' | 'managed' | 'defined' | 'measured' | 'optimized';
}
export interface ContextualWidget {
    widgetId: string;
    widgetKey: string;
    componentKey: string;
    title: string;
    titleAr?: string;
    x: number;
    y: number;
    w: number;
    h: number;
    config: Record<string, unknown>;
    priority: number;
    requiredForRole: boolean;
    requiredForScenario: boolean;
}
export interface ContextualDashboard {
    dashboardCode: string;
    title: string;
    titleAr?: string;
    widgets: ContextualWidget[];
    layout: {
        columns: number;
        rowHeight: number;
    };
    metadata: {
        context: DashboardContext;
        generatedAt: string;
        widgetCount: number;
    };
}
/**
 * Build dashboard based on context (role, module, scenario, org status)
 */
export declare function buildContextualDashboard(ctx: DashboardContext): Promise<ContextualDashboard>;

export interface ActionDiagnosticsReport {
    moduleCode: string;
    tenantId: string;
    generatedAt: string;
    overdueActions: OverdueActionsResult;
    assignmentHealth: AssignmentHealthResult;
    completionHealth: CompletionHealthResult;
    staleDrafts: StaleDraftsResult;
    overallHealth: 'healthy' | 'degraded' | 'critical';
    warnings: string[];
    errors: string[];
}
export interface OverdueActionsResult {
    totalOverdue: number;
    criticalOverdue: number;
    issues: string[];
}
export interface AssignmentHealthResult {
    unassignedCount: number;
    noOwnerCount: number;
    issues: string[];
}
export interface CompletionHealthResult {
    pendingVerification: number;
    rejectedCount: number;
    issues: string[];
}
export interface StaleDraftsResult {
    draftOver30Days: number;
    blockedOver7Days: number;
    issues: string[];
}
export declare class ActionDiagnosticsService {
    runDiagnostics(tenantId: string): Promise<ActionDiagnosticsReport>;
}

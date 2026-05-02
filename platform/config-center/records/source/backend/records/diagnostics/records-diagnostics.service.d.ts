export interface DiagnosticsResult {
    moduleCode: string;
    healthy: boolean;
    checks: {
        name: string;
        passed: boolean;
        detail?: string;
    }[];
    checkedAt: string;
}
export declare function runDiagnostics(tenantId: string): Promise<DiagnosticsResult>;

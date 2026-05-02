export interface CsrfDiagnosticsResult {
    tenantId: string;
    timestamp: string;
    failedValidations24h: number;
    failedValidations1h: number;
    uniqueFailureIps24h: number;
    suspiciousIps: Array<{
        ip: string;
        count: number;
    }>;
    sessionAnomalies24h: number;
    criticalAnomalies24h: number;
    policyActive: boolean;
    enforcementMode: string;
}
/** Run CSRF diagnostics for a tenant. */
export declare function runCsrfDiagnostics(tenantId: string): Promise<CsrfDiagnosticsResult>;

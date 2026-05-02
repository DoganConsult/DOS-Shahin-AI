export declare const COMPLIANCE_CONTROL_STATUSES: readonly ["not_started", "in_progress", "implemented", "effective", "ineffective", "not_applicable"];
export type ControlStatus = typeof COMPLIANCE_CONTROL_STATUSES[number];
export declare function isControlStatus(value: unknown): value is ControlStatus;
export interface ComplianceFramework {
    id: string;
    code: string;
    name: string;
    version: string;
    status: 'active' | 'draft' | 'deprecated';
}
export interface ComplianceObligation {
    id: string;
    frameworkId: string;
    code: string;
    title: string;
    description?: string;
    status: ControlStatus;
}

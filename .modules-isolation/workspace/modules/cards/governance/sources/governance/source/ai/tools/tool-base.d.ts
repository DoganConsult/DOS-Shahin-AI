export type ToolGovernanceMeta = {
    toolId: string;
    toolName: string;
    version: string;
    allowedRoles: string[];
    requiresApproval: boolean;
    auditLevel: 'none' | 'low' | 'medium' | 'high' | 'full';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
    retentionDays: number;
    piiFields: string[];
    complianceFrameworks: string[];
    description?: string;
};

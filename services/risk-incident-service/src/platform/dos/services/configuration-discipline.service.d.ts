export interface ConfigurationItem {
    key: string;
    value: unknown;
    source: 'env' | 'db' | 'default';
    validatedAt?: string;
    isValid: boolean;
    violations: string[];
}
export interface ConfigurationDisciplineResult {
    items: ConfigurationItem[];
    totalViolations: number;
    healthScore: number;
    summary: string;
}
export interface ConfigurationRule {
    key: string;
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'url' | 'uuid';
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    description?: string;
}
declare function validateConfiguration(): Promise<ConfigurationDisciplineResult>;
declare function persistAudit(tenantId: string, result: ConfigurationDisciplineResult): Promise<void>;
export declare const configurationDisciplineService: {
    validateConfiguration: typeof validateConfiguration;
    persistAudit: typeof persistAudit;
};
export {};

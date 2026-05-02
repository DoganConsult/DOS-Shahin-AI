export type Classification = "public" | "internal" | "confidential" | "restricted" | "top_secret";
export interface ClassificationRule {
    ruleId: string;
    name: string;
    recordType: string;
    keywords: string[];
    targetClassification: Classification;
    confidence: number;
    isActive: boolean;
    createdAt: string;
}
export interface ClassificationSuggestion {
    suggestedClassification: Classification;
    confidence: number;
    matchedRules: string[];
    reason: string;
}
export interface ClassificationAuditEntry {
    auditId: string;
    recordId: string;
    fromClassification: Classification | null;
    toClassification: Classification;
    changedBy: string;
    isAutomatic: boolean;
    reason: string | null;
    changedAt: string;
}
export interface SensitivityLabel {
    labelId: string;
    name: string;
    classification: Classification;
    colorCode: string;
    description: string;
    isActive: boolean;
}
export declare function autoClassifyByKeywords(title: string, description: string, rules: ClassificationRule[]): ClassificationSuggestion;
export declare function classifyByRecordType(recordType: string): Classification;
export declare function sanitizeTags(rawTags: string[]): string[];
export declare function getClassificationRules(tenantId: string): Promise<ClassificationRule[]>;
export declare function createClassificationRule(tenantId: string, data: {
    name: string;
    recordType: string;
    keywords: string[];
    targetClassification: Classification;
    confidence?: number;
}): Promise<ClassificationRule>;
export declare function suggestClassification(tenantId: string, title: string, description: string, recordType: string): Promise<ClassificationSuggestion>;
export declare function applyClassification(tenantId: string, recordId: string, classification: Classification, changedBy: string, isAutomatic?: boolean, reason?: string): Promise<void>;
export declare function applyTags(tenantId: string, recordId: string, tags: string[]): Promise<void>;
export declare function getClassificationAuditTrail(tenantId: string, recordId: string): Promise<ClassificationAuditEntry[]>;
export declare function getSensitivityLabels(tenantId: string): Promise<SensitivityLabel[]>;

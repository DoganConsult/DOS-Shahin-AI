export type ComplexityTier = 'low' | 'medium' | 'high' | 'critical';
export declare function registerTaskComplexity(taskType: string, tier: ComplexityTier): void;
export declare function getTaskComplexity(taskType: string): ComplexityTier | undefined;
export declare function getAllTaskComplexities(): Map<string, ComplexityTier>;

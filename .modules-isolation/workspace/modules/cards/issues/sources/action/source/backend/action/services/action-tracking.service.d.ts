export interface ActionProgress {
    itemId: string;
    title: string;
    status: string;
    percentageComplete: number;
    hasEvidence: boolean;
    blockerCount: number;
    dependencyCount: number;
    dependenciesResolved: boolean;
    lastUpdated: string | null;
}
export interface ActionBlocker {
    blockerId: string;
    itemId: string;
    description: string;
    reportedBy: string;
    resolvedBy: string | null;
    status: 'open' | 'resolved';
    createdAt: string;
    resolvedAt: string | null;
}
export interface ActionDependency {
    dependencyId: string;
    itemId: string;
    dependsOnItemId: string;
    dependsOnTitle: string;
    dependsOnStatus: string;
    resolved: boolean;
    createdAt: string;
}
export interface CompletionEvidence {
    evidenceId: string;
    itemId: string;
    description: string;
    fileReference: string | null;
    submittedBy: string;
    createdAt: string;
}
export declare function computeActionProgress(status: string, hasEvidence: boolean, dependenciesResolved: boolean): number;
export declare function areDependenciesResolved(dependencies: ActionDependency[]): boolean;
export declare function getActionProgress(tenantId: string, itemId: string): Promise<ActionProgress>;
export declare function reportBlocker(tenantId: string, itemId: string, description: string, reportedBy: string): Promise<ActionBlocker>;
export declare function resolveBlocker(tenantId: string, blockerId: string, resolvedBy: string): Promise<ActionBlocker>;
export declare function getBlockers(tenantId: string, itemId: string): Promise<ActionBlocker[]>;
export declare function addDependency(tenantId: string, itemId: string, dependsOnItemId: string): Promise<ActionDependency>;
export declare function getDependencyChain(tenantId: string, itemId: string): Promise<ActionDependency[]>;
export declare function addCompletionEvidence(tenantId: string, data: {
    itemId: string;
    description: string;
    fileReference?: string;
    submittedBy: string;
}): Promise<CompletionEvidence>;
export declare function getCompletionEvidence(tenantId: string, itemId: string): Promise<CompletionEvidence[]>;

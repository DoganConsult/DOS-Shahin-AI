/** Get all lifecycle stages in order. */
export declare function getLifecycleStages(): string[];
/** Get distribution of assets across lifecycle stages. */
export declare function getLifecycleDistribution(tenantId: string): Promise<Array<{
    stage: string;
    count: number;
}>>;
/** Transition an asset to a new lifecycle stage. */
export declare function transitionStage(tenantId: string, assetId: string, targetStage: string, userId: string): Promise<{
    fromStage: string;
    toStage: string;
}>;
/** Get lifecycle event history for an asset. */
export declare function getLifecycleEvents(tenantId: string, assetId: string): Promise<Array<{
    fromStage: string;
    toStage: string;
    changedBy: string;
    changedAt: string;
}>>;
/** Get valid transitions from a given stage. */
export declare function getValidTransitions(currentStage: string): string[];

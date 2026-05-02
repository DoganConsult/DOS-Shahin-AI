import { MonteCarloResult } from '@dos/types';
export declare function runSimulation(tenantId: string, riskId: string, iterations?: number): Promise<MonteCarloResult & {
    meta?: {
        capped?: boolean;
        partial?: boolean;
    };
}>;

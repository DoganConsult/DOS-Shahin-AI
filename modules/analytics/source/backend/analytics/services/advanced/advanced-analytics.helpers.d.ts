import type { AGRCOSCycleResult } from '@dos/types';
/**
 * Get latest AGRC-OS cycle result from tenant's cycle log
 */
export declare function getLatestCycleResult(tenantId: string): Promise<AGRCOSCycleResult | null>;

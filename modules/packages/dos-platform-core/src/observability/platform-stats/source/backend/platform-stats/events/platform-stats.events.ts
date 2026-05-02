import type { ModuleEventContract } from '@dos/types';
export const PLATFORM_STATS_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'platform-stats',
  published: {
    'platform-stats.snapshot_generated': { description: 'Platform stats snapshot generated', version: 1, payloadType: 'any' },
    'platform-stats.anomaly_detected': { description: 'Statistical anomaly detected', version: 1, payloadType: 'any' },
  },
  consumed: {},
};

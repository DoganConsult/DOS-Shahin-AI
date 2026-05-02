import type { ModuleEventContract } from '@dos/types';
export const GRC_QUERY_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'grc-query',
  published: {
    'grc-query.query_executed': { description: 'Cross-module query executed', version: 1, payloadType: 'any' },
    'grc-query.query_saved': { description: 'Saved query created or updated', version: 1, payloadType: 'any' },
  },
  consumed: {},
};

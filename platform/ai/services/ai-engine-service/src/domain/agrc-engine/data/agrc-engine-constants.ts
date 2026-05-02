export const RUN_TYPES = ['ccm_scan', 'telemetry_collection', 'automation_cycle', 'health_check', 'full_orchestration'] as const;
export const RUN_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;
export const ENGINE_DEFAULTS = { MAX_CONCURRENT_RUNS: 3, CCM_SCAN_INTERVAL_SECONDS: 3600, TELEMETRY_INTERVAL_SECONDS: 300, RUN_TIMEOUT_SECONDS: 3600 } as const;

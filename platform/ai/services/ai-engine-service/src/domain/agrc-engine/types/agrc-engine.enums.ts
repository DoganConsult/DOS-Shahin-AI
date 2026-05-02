export const RUN_TYPE_ENUM = { CCM_SCAN: 'ccm_scan', TELEMETRY: 'telemetry_collection', AUTOMATION: 'automation_cycle', HEALTH_CHECK: 'health_check', FULL: 'full_orchestration' } as const;
export const RUN_STATUS_ENUM = { PENDING: 'pending', RUNNING: 'running', COMPLETED: 'completed', FAILED: 'failed', CANCELLED: 'cancelled' } as const;

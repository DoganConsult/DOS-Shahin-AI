export { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';
export { registerJob } from '@dos/platform-core/jobs';
export { getProvisionedTenants } from '@dos/platform-core/tenancy';
export declare function getActiveModuleCodes(_tenantId: string): Promise<string[]>;

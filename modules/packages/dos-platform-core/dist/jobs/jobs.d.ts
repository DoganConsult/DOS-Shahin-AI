export interface JobDefinition {
    name: string;
    cron: string;
    handler: () => Promise<void>;
    description?: string;
}
export interface JobInfo {
    job_name: string;
    cron_expression: string;
    enabled: boolean;
    last_run_at: string | null;
    last_status: string | null;
    last_error: string | null;
    next_run_at: string | null;
    created_at: string;
}
export interface JobExecution {
    execution_id: string;
    job_name: string;
    started_at: string;
    completed_at: string | null;
    status: string;
    duration_ms: number | null;
    error_message: string | null;
}
export interface PlatformJobs {
    registerJob(name: string, cronExpression: string, handler: () => Promise<void>): Promise<void>;
    executeJobByName(jobName: string): Promise<void>;
    registerDefaultJobs(): Promise<void>;
    isJobRunning(name: string): boolean;
    registerPostJobHook(fn: () => Promise<void>): void;
    getJobs?(): Promise<JobInfo[]>;
    getJobHistory?(jobName: string, limit?: number): Promise<JobExecution[]>;
}
export declare function setJobScheduler(impl: PlatformJobs): void;
export declare function registerJob(name: string, cronExpression: string, handler: () => Promise<void>): Promise<void>;
export declare function executeJobByName(jobName: string): Promise<void>;
export declare function registerDefaultJobs(): Promise<void>;
export declare function isJobRunning(name: string): boolean;
export declare function registerPostJobHook(fn: () => Promise<void>): void;
export declare function getJobs(): Promise<JobInfo[]>;
export declare function getJobHistory(jobName: string, limit?: number): Promise<JobExecution[]>;
export interface ProvisionedTenant {
    tenant_id: string;
    settings?: unknown;
}
export declare function getProvisionedTenants(): Promise<ProvisionedTenant[]>;
export declare function getGovernanceJobs(): JobDefinition[];

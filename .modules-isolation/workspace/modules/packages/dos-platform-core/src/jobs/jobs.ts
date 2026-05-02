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

let _jobs: PlatformJobs | null = null;

export function setJobScheduler(impl: PlatformJobs): void {
  _jobs = impl;
}

function getJobs_(): PlatformJobs {
  if (!_jobs) {
    throw new Error('PlatformJobs not initialized. Call setJobScheduler() first.');
  }
  return _jobs;
}

export function registerJob(name: string, cronExpression: string, handler: () => Promise<void>): Promise<void> {
  return getJobs_().registerJob(name, cronExpression, handler);
}

export function executeJobByName(jobName: string): Promise<void> {
  return getJobs_().executeJobByName(jobName);
}

export function registerDefaultJobs(): Promise<void> {
  return getJobs_().registerDefaultJobs();
}

export function isJobRunning(name: string): boolean {
  return getJobs_().isJobRunning(name);
}

export function registerPostJobHook(fn: () => Promise<void>): void {
  return getJobs_().registerPostJobHook(fn);
}

export function getJobs(): Promise<JobInfo[]> {
  const impl = getJobs_();
  if (!impl.getJobs) {
    throw new Error('getJobs() not supported by current PlatformJobs implementation.');
  }
  return impl.getJobs();
}

export function getJobHistory(jobName: string, limit?: number): Promise<JobExecution[]> {
  const impl = getJobs_();
  if (!impl.getJobHistory) {
    throw new Error('getJobHistory() not supported by current PlatformJobs implementation.');
  }
  return impl.getJobHistory(jobName, limit);
}

export interface ProvisionedTenant {
  tenant_id: string;
  settings?: unknown;
}

export async function getProvisionedTenants(): Promise<ProvisionedTenant[]> {
  return [];
}

export function getGovernanceJobs(): JobDefinition[] {
  return [];
}

let _jobs = null;
export function setJobScheduler(impl) {
    _jobs = impl;
}
function getJobs_() {
    if (!_jobs) {
        throw new Error('PlatformJobs not initialized. Call setJobScheduler() first.');
    }
    return _jobs;
}
export function registerJob(name, cronExpression, handler) {
    return getJobs_().registerJob(name, cronExpression, handler);
}
export function executeJobByName(jobName) {
    return getJobs_().executeJobByName(jobName);
}
export function registerDefaultJobs() {
    return getJobs_().registerDefaultJobs();
}
export function isJobRunning(name) {
    return getJobs_().isJobRunning(name);
}
export function registerPostJobHook(fn) {
    return getJobs_().registerPostJobHook(fn);
}
export function getJobs() {
    const impl = getJobs_();
    if (!impl.getJobs) {
        throw new Error('getJobs() not supported by current PlatformJobs implementation.');
    }
    return impl.getJobs();
}
export function getJobHistory(jobName, limit) {
    const impl = getJobs_();
    if (!impl.getJobHistory) {
        throw new Error('getJobHistory() not supported by current PlatformJobs implementation.');
    }
    return impl.getJobHistory(jobName, limit);
}
export async function getProvisionedTenants() {
    return [];
}
//# sourceMappingURL=jobs.js.map
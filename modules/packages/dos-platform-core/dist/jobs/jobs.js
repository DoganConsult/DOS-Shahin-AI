"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setJobScheduler = setJobScheduler;
exports.registerJob = registerJob;
exports.executeJobByName = executeJobByName;
exports.registerDefaultJobs = registerDefaultJobs;
exports.isJobRunning = isJobRunning;
exports.registerPostJobHook = registerPostJobHook;
exports.getJobs = getJobs;
exports.getJobHistory = getJobHistory;
exports.getProvisionedTenants = getProvisionedTenants;
exports.getGovernanceJobs = getGovernanceJobs;
let _jobs = null;
function setJobScheduler(impl) {
    _jobs = impl;
}
function getJobs_() {
    if (!_jobs) {
        throw new Error('PlatformJobs not initialized. Call setJobScheduler() first.');
    }
    return _jobs;
}
function registerJob(name, cronExpression, handler) {
    return getJobs_().registerJob(name, cronExpression, handler);
}
function executeJobByName(jobName) {
    return getJobs_().executeJobByName(jobName);
}
function registerDefaultJobs() {
    return getJobs_().registerDefaultJobs();
}
function isJobRunning(name) {
    return getJobs_().isJobRunning(name);
}
function registerPostJobHook(fn) {
    return getJobs_().registerPostJobHook(fn);
}
function getJobs() {
    const impl = getJobs_();
    if (!impl.getJobs) {
        throw new Error('getJobs() not supported by current PlatformJobs implementation.');
    }
    return impl.getJobs();
}
function getJobHistory(jobName, limit) {
    const impl = getJobs_();
    if (!impl.getJobHistory) {
        throw new Error('getJobHistory() not supported by current PlatformJobs implementation.');
    }
    return impl.getJobHistory(jobName, limit);
}
async function getProvisionedTenants() {
    return [];
}
function getGovernanceJobs() {
    return [];
}
//# sourceMappingURL=jobs.js.map
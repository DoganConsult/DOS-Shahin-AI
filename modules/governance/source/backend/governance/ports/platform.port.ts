export { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';
export { getAllModuleStates, getModuleState, updateModuleState, getActiveModules, isModuleActive } from '@dos/platform-core/modules';

export { enforceStatusTransition, tryLifecycleTransition } from '@dos/platform-core/lifecycle';

export { getLatestMaturity, getMaturityHistory, generateExecutiveSummary } from '@dos/platform-core';

export { getMaturityTrends, generateHealthReport, computeMaturityScore, checkMaturityThreshold } from '@dos/platform-core';

export { computeMaturityLevel, recordMaturityAssessment, MaturityCriteria, MaturityLevel } from '@dos/platform-core';

export { recordActivity } from '@dos/platform-core';

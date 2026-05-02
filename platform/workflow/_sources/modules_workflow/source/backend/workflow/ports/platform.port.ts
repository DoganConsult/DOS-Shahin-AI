export { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';
export * as nudgeNeg from '@dos/platform-core/notifications';

export * as calibration from '@dos/platform-core';

export { getOrCreateJourneyState, advanceJourney, getJourneyProgress } from '../../onboarding/services/journey/journey-engine.service';
export { getCompanyProfile, createCompanyProfile, validateCompanyProfile, detectApplicableFrameworks, recommendRolesForSize, classifyCompanySize } from '@dos/platform-core/provisioning';

export { generateRoadmap, getRoadmap, createRoadmap, updateTaskStatus, getNextPendingTask } from '@dos/platform-core';
export { generateTeamRecommendation, applyTeamRecommendation, saveTeamRecommendation, getTeamRecommendation } from '@dos/platform-core';

export { getLatestMaturity, generateExecutiveSummary } from '@dos/platform-core';

export { getActiveNudges, dismissNudge } from '@dos/platform-core/notifications';

export { getActivatedTemplates, activateTemplateForPhase, saveActivatedTemplate } from '@dos/platform-core';

export { checkEscalations } from '@dos/platform-core/notifications';
export type { GenericRow } from '@dos/types';
export type { ActionExecutionResult } from '../../agrc-engine/services/quick-grc-accelerator.service';
export { sendEmail } from '@dos/platform-core/notifications';

export { getAgentResourceAllocation } from '@dos/platform-core';

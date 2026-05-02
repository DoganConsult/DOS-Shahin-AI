import * as platformCore from '@dos/platform-core';
import * as platformNotifications from '@dos/platform-core/notifications';
import * as platformConstants from '@dos/platform-core/constants';
import * as platformObservability from '@dos/platform-core/observability';
import * as platformProvisioning from '@dos/platform-core/provisioning';
import * as contractExports from '@dos/contracts';

export type { GenericRow } from '@dos/types';
export { getAllAgentDefinitions, getAgentDefinition } from '../services/agents/core/agent-module-routing.service.js';
export type { WorkflowTriggerRequest, WorkflowAgentResult } from '@dos/platform-core';

export { handleQuery, getSessionHistory, getAgentPerformance, buildSuggestions, handlePublicQuery, getCanonicalPublicAgentsForLanding, exportCopilotAudit, recordAgentPerformance } from '../platform/services/misc/copilot.service';

export { enforceStatusTransition } from '../platform/services/module-lifecycle.service';
export type { AgentHandoff } from '@dos/platform-core';
export type { FallbackBehavior } from '@dos/contracts';
export type { AiProcess, KernelStatus, SchedulerEntry, IpcMessage, MemoryPartition, AgentStep, ProcessDetail, AgentDetail, HealthStatus, KernelHealth } from '@dos/platform-core';
export type { ProcessRow, SchedulerRow, IpcRow, MemoryRow, LogRow, KernelLogEvent, KernelProcessView, KernelSchedulerView, KernelIpcView, KernelMemoryView, KernelLogView, KernelProcessDetailView, KernelAgentDetailView, KernelHealthStatus, KernelHealthView, KernelSnapshotView, KernelOverviewView } from '@dos/platform-core';

const platformCoreExports = platformCore as Record<string, unknown>;
const observabilityExports = platformObservability as Record<string, unknown>;
const provisioningExports = platformProvisioning as Record<string, unknown>;
const contractRuntimeExports = contractExports as Record<string, unknown>;

function getFunctionExport(source: Record<string, unknown>, name: string): (...args: any[]) => any {
	const candidate = source[name];
	if (typeof candidate !== 'function') {
		throw new Error(`Missing runtime export: ${name}`);
	}
	return candidate as (...args: any[]) => any;
}

export const buildDependencyGraph = (...args: any[]) => getFunctionExport(platformCoreExports, 'buildDependencyGraph')(...args);
export const triggerAgentsForWorkflowTransition = (...args: any[]) => getFunctionExport(platformCoreExports, 'triggerAgentsForWorkflowTransition')(...args);
export const findAgentsForWorkflow = (...args: any[]) => getFunctionExport(platformCoreExports, 'findAgentsForWorkflow')(...args);
export const intervention = platformNotifications;
export const SYSTEM_JOB_ACTOR = platformConstants.SYSTEM_JOB_ACTOR;
export const SYSTEM_TENANT = platformConstants.SYSTEM_TENANT;
export const detectPatterns = (...args: any[]) => getFunctionExport(platformCoreExports, 'detectPatterns')(...args);
export const enqueueHandoff = (...args: any[]) => getFunctionExport(platformCoreExports, 'enqueueHandoff')(...args);
export const getHandoffBatch = (...args: any[]) => getFunctionExport(platformCoreExports, 'getHandoffBatch')(...args);
export const recordAgentRunMetric = (...args: any[]) => getFunctionExport(observabilityExports, 'recordAgentRun')(...args);
export const recordAgentRun = (...args: any[]) => getFunctionExport(observabilityExports, 'recordAgentRun')(...args);
export const getTenantPlatformMode = async () => 'production';
export const getAgentPlatformMode = async () => 'production';
export const getModeDirective = async () => null;
export const gateActionWithPolicy = async () => true;
export const queuePendingAction = async () => {};
export const logModeOperation = async () => {};
export type PlatformMode = 'production' | 'training';
export type ActionPriority = 'low' | 'medium' | 'high';
export const checkQuota = (...args: any[]) => getFunctionExport(platformCoreExports, 'checkQuota')(...args);
export const getAgentCatalogIds = (...args: any[]) => getFunctionExport(platformCoreExports, 'getAgentCatalogIds')(...args);
export const getAgentCatalog = (...args: any[]) => getFunctionExport(platformCoreExports, 'getAgentCatalog')(...args);
export const getApplicableRegulations = (...args: any[]) => getFunctionExport(platformCoreExports, 'getApplicableRegulations')(...args);
export const evaluateCondition = (...args: any[]) => getFunctionExport(provisioningExports, 'evaluateCondition')(...args);
export const getRegulatorRules = (...args: any[]) => getFunctionExport(provisioningExports, 'getRegulatorRules')(...args);
export const getFrameworkRules = (...args: any[]) => getFunctionExport(provisioningExports, 'getFrameworkRules')(...args);
export const getBlueprintTemplates = (...args: any[]) => getFunctionExport(provisioningExports, 'getBlueprintTemplates')(...args);
export const resolveConfigDefault = (...args: any[]) => getFunctionExport(provisioningExports, 'resolveConfigDefault')(...args);
export const getAgentRbacEntry = (...args: any[]) => getFunctionExport(platformCoreExports, 'getAgentRbacEntry')(...args);
export const getTaskFallbackBehavior = (...args: any[]) => getFunctionExport(contractRuntimeExports, 'getTaskFallbackBehavior')(...args);
export const isDeterministicTask = (...args: any[]) => getFunctionExport(contractRuntimeExports, 'isDeterministicTask')(...args);
export const DEFAULT_EMBEDDING_DIM = platformCore.DEFAULT_EMBEDDING_DIM as number;
export const getProcessTable = (...args: any[]) => getFunctionExport(platformCoreExports, 'getProcessTable')(...args);
export const getKernelStatus = (...args: any[]) => getFunctionExport(platformCoreExports, 'getKernelStatus')(...args);
export const getSchedulerTable = (...args: any[]) => getFunctionExport(platformCoreExports, 'getSchedulerTable')(...args);
export const getIpcMessages = (...args: any[]) => getFunctionExport(platformCoreExports, 'getIpcMessages')(...args);
export const getMemoryPartitions = (...args: any[]) => getFunctionExport(platformCoreExports, 'getMemoryPartitions')(...args);
export const getKernelLog = (...args: any[]) => getFunctionExport(platformCoreExports, 'getKernelLog')(...args);
export const getKernelHealth = (...args: any[]) => getFunctionExport(platformCoreExports, 'getKernelHealth')(...args);
export const killProcess = (...args: any[]) => getFunctionExport(platformCoreExports, 'killProcess')(...args);
export const rebootAgent = (...args: any[]) => getFunctionExport(platformCoreExports, 'rebootAgent')(...args);
export const pauseAgent = (...args: any[]) => getFunctionExport(platformCoreExports, 'pauseAgent')(...args);
export const resumeAgent = (...args: any[]) => getFunctionExport(platformCoreExports, 'resumeAgent')(...args);
export const adjustAutonomyLevel = (...args: any[]) => getFunctionExport(platformCoreExports, 'adjustAutonomyLevel')(...args);
export const injectPriority = (...args: any[]) => getFunctionExport(platformCoreExports, 'injectPriority')(...args);
export const killRunningAction = (...args: any[]) => getFunctionExport(platformCoreExports, 'killRunningAction')(...args);
export const getTokenUsage = (...args: any[]) => getFunctionExport(platformCoreExports, 'getTokenUsage')(...args);
export const setGlobalAutonomyLevel = (...args: any[]) => getFunctionExport(platformCoreExports, 'setGlobalAutonomyLevel')(...args);
export const getPriorityDirective = (...args: any[]) => getFunctionExport(platformCoreExports, 'getPriorityDirective')(...args);
export const clearPriorityDirective = (...args: any[]) => getFunctionExport(platformCoreExports, 'clearPriorityDirective')(...args);
export const getProcessDetail = (...args: any[]) => getFunctionExport(platformCoreExports, 'getProcessDetail')(...args);
export const getAgentDetail = (...args: any[]) => getFunctionExport(platformCoreExports, 'getAgentDetail')(...args);
export const saveKernelSnapshot = (...args: any[]) => getFunctionExport(platformCoreExports, 'saveKernelSnapshot')(...args);
export const listKernelSnapshots = (...args: any[]) => getFunctionExport(platformCoreExports, 'listKernelSnapshots')(...args);

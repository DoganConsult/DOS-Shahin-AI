import type { OpenClawContext } from './openclaw-bridge';
export type { OpenClawContext } from './openclaw-bridge';
export type EntityType = string;
export type RelationshipType = string;
export declare const notReadyTenants: Set<string>;
export type MaturityLevel = import('@dos/types').MaturityLevel;
export type MaturityCriteria = import('@dos/types').MaturityCriterion;
export type MaturityAssessmentResult = {
    tenantId: string;
    overallLevel: MaturityLevel;
    overallScore: number;
    generatedAt: string;
    details?: Record<string, unknown>;
};
export declare function getLatestMaturity(_tenantId: string): Promise<MaturityAssessmentResult | null>;
export declare function getMaturityHistory(_tenantId: string): Promise<MaturityAssessmentResult[]>;
export declare function getMaturityTrends(_tenantId: string): Promise<Record<string, unknown>>;
export declare function computeMaturityScore(_input: Record<string, unknown>): number;
export declare function computeMaturityLevel(_score: number): MaturityLevel;
export declare function checkMaturityThreshold(_level: MaturityLevel, _threshold: MaturityLevel): boolean;
export declare function recordMaturityAssessment(_tenantId: string, _assessment: Record<string, unknown>): Promise<void>;
export declare function generateExecutiveSummary(_tenantId: string): Promise<{
    summary: string;
    recommendations: string[];
    generatedAt: string;
}>;
export declare function generateHealthReport(_tenantId: string): Promise<Record<string, unknown>>;
export declare function computeAutoSuggestions(_input: Record<string, unknown>): Array<Record<string, unknown>>;
export interface ParsedElement {
    type: string;
    text?: string;
    metadata?: Record<string, unknown>;
}
export declare function getDocumentElements(_tenantId: string, _documentId: string): Promise<ParsedElement[]>;
export declare function resolveImpact(_tenantId: string, _input: Record<string, unknown>): Promise<Record<string, unknown>>;
export declare function resolveSettingWithInheritance(_tenantId: string, _key: string): Promise<unknown>;
export declare function getSetting(_tenantId: string, _key: string): Promise<unknown>;
export declare function encryptCredentialObject<T extends Record<string, unknown>>(obj: T): {
    v: 1;
    iv: string;
    tag: string;
    data: string;
};
export declare function decryptCredentialObject<T extends Record<string, unknown>>(payload: {
    v: 1;
    iv: string;
    tag: string;
    data: string;
}): T;
export interface ActivityRecordInput {
    userId: string;
    module: string;
    action: string;
    entityType?: string;
    entityId?: string;
    summary?: string;
    changes?: Record<string, unknown>;
    [k: string]: unknown;
}
export declare function recordActivity(_tenantId: string, _entry: ActivityRecordInput): Promise<void>;
export declare function createLink(_tenantId: string, _userId: string, _link: Record<string, unknown>): Promise<{
    linkId: string;
}>;
export interface EntityLink {
    sourceType: string;
    sourceId: string;
    targetType: string;
    targetId: string;
    relationshipType: string;
    metadata?: Record<string, unknown>;
    [k: string]: unknown;
}
export declare function getLinksForEntity(_tenantId: string, _entityType: string, _entityId: string): Promise<EntityLink[]>;
export declare function getTenantBranding(_tenantId: string): Promise<Record<string, unknown>>;
export declare function getModuleShellConfig(_tenantId: string, _moduleCode: string): Promise<Record<string, unknown>>;
export declare function listUserPreferences(_tenantId: string, _userId: string): Promise<Record<string, unknown>[]>;
export declare function listTenantConfig(_tenantId: string): Promise<Record<string, unknown>[]>;
export declare function saveUserShellPreference(_tenantId: string, _userId: string, _pref: Record<string, unknown>): Promise<void>;
export declare function saveTenantShellOverride(_tenantId: string, _override: Record<string, unknown>): Promise<void>;
export declare function saveRoleShellOverride(_tenantId: string, _roleCode: string, _override: Record<string, unknown>): Promise<void>;
export declare function removeShellOverride(_tenantId: string, _overrideId: string): Promise<void>;
export type PlatformTaskPayload = Record<string, unknown>;
export type PlatformTaskResult = Record<string, unknown>;
export declare function registerTaskHandler(code: string, handler: (tenantId: string, payload: PlatformTaskPayload) => Promise<PlatformTaskResult>): void;
export declare function getAgentResourceAllocation(_tenantId: string): Promise<Record<string, unknown>>;
export declare function isOpenClawAvailable(): Promise<boolean>;
export declare function getOpenClawServiceConfig(): Promise<Record<string, unknown>>;
export declare function listOpenClawTools(ctx?: OpenClawContext): Promise<Array<Record<string, unknown>>>;
export declare function listOpenClawResources(uri?: string, ctx?: OpenClawContext): Promise<Array<Record<string, unknown>>>;
export declare function executeOpenClawTool(tool: string, input: Record<string, unknown>, ctx?: OpenClawContext): Promise<Record<string, unknown>>;
export declare function proposeCalibration(tenantId: string, vendorId: string): Promise<Record<string, unknown>>;
export declare function submitCalibration(tenantId: string, calibrationId: string, input: Record<string, unknown>): Promise<Record<string, unknown>>;
export declare function acceptCalibration(tenantId: string, calibrationId: string, userId: string): Promise<Record<string, unknown>>;
export declare function getCalibration(_tenantId: string, _calibrationId: string): Promise<Record<string, unknown> | null>;
export declare function listCalibrations(_tenantId: string, _vendorId?: string): Promise<Record<string, unknown>[]>;
export interface TeamRecommendation {
    tenantId: string;
    generatedAt: string;
    recommendation: Record<string, unknown>;
}
export declare function generateTeamRecommendation(tenantId: string, _input?: Record<string, unknown>): Promise<TeamRecommendation>;
export declare function getTeamRecommendation(_tenantId: string): Promise<TeamRecommendation | null>;
export declare function saveTeamRecommendation(_tenantId: string, _rec: TeamRecommendation): Promise<void>;
export declare function applyTeamRecommendation(_tenantId: string, _recId: string): Promise<void>;
export type RoadmapPhaseType = 'foundation' | 'assessment' | 'implementation' | 'operations' | 'continuous_improvement' | (string & {});
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked' | (string & {});
export interface RoadmapTask {
    taskId: string;
    title: string;
    status: TaskStatus;
    phase?: RoadmapPhaseType;
    [k: string]: unknown;
}
export interface Roadmap {
    roadmapId?: string;
    tenantId?: string;
    tasks: RoadmapTask[];
    generatedAt?: string;
    [k: string]: unknown;
}
export declare function generateRoadmap(_profile: Record<string, unknown>): Roadmap;
export declare function createRoadmap(_tenantId: string, roadmap: Roadmap): Promise<Roadmap>;
export declare function getRoadmap(_tenantId: string): Promise<Roadmap | null>;
export declare function updateTaskStatus(_tenantId: string, taskId: string, status: TaskStatus): Promise<RoadmapTask>;
export declare function getNextPendingTask(roadmap: Roadmap): RoadmapTask | null;
export declare function getActivatedTemplates(_tenantId: string, _phaseType: RoadmapPhaseType): Promise<Record<string, unknown>[]>;
export declare function activateTemplateForPhase(_tenantId: string, _templateKey: string, _phaseType: string): Promise<void>;
export declare function saveActivatedTemplate(_tenantId: string, _template: Record<string, unknown>): Promise<void>;
export declare function getBusinessFunctions(_tenantId: string): Promise<Record<string, unknown>[]>;
export declare function getStaffingForOrgSize(_tenantId: string, _size: string): Promise<Record<string, unknown>>;

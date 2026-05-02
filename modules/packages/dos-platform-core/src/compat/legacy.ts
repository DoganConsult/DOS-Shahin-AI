import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import type { OpenClawContext } from './openclaw-bridge';
import {
  bridgeExecuteOpenClawTool,
  bridgeGetOpenClawServiceConfig,
  bridgeIsOpenClawAvailable,
  bridgeListOpenClawResources,
  bridgeListOpenClawTools,
} from './openclaw-bridge';

export type { OpenClawContext } from './openclaw-bridge';

export type EntityType = string;
export type RelationshipType = string;

export const notReadyTenants = new Set<string>();

export type MaturityLevel = import('@dos/types').MaturityLevel;
export type MaturityCriteria = import('@dos/types').MaturityCriterion;

export type MaturityAssessmentResult = {
  tenantId: string;
  overallLevel: MaturityLevel;
  overallScore: number;
  generatedAt: string;
  details?: Record<string, unknown>;
};

export async function getLatestMaturity(_tenantId: string): Promise<MaturityAssessmentResult | null> {
  return null;
}

export async function getMaturityHistory(_tenantId: string): Promise<MaturityAssessmentResult[]> {
  return [];
}

export async function getMaturityTrends(_tenantId: string): Promise<Record<string, unknown>> {
  return {};
}

export function computeMaturityScore(_input: Record<string, unknown>): number {
  return 0;
}

export function computeMaturityLevel(_score: number): MaturityLevel {
  return 1;
}

export function checkMaturityThreshold(_level: MaturityLevel, _threshold: MaturityLevel): boolean {
  return false;
}

export async function recordMaturityAssessment(_tenantId: string, _assessment: Record<string, unknown>): Promise<void> {}

export async function generateExecutiveSummary(_tenantId: string): Promise<{ summary: string; recommendations: string[]; generatedAt: string }> {
  return { summary: '', recommendations: [], generatedAt: new Date().toISOString() };
}

export async function generateHealthReport(_tenantId: string): Promise<Record<string, unknown>> {
  return { generatedAt: new Date().toISOString() };
}

export function computeAutoSuggestions(_input: Record<string, unknown>): Array<Record<string, unknown>> {
  return [];
}

export interface ParsedElement {
  type: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

export async function getDocumentElements(_tenantId: string, _documentId: string): Promise<ParsedElement[]> {
  return [];
}

export async function resolveImpact(_tenantId: string, _input: Record<string, unknown>): Promise<Record<string, unknown>> {
  return {};
}

export async function resolveSettingWithInheritance(_tenantId: string, _key: string): Promise<unknown> {
  return undefined;
}

export async function getSetting(_tenantId: string, _key: string): Promise<unknown> {
  return undefined;
}

function credentialKey(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw) throw new Error('CREDENTIAL_ENCRYPTION_KEY is required');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new Error('CREDENTIAL_ENCRYPTION_KEY must be 32 bytes (base64)');
  return buf;
}

export function encryptCredentialObject<T extends Record<string, unknown>>(obj: T): { v: 1; iv: string; tag: string; data: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', credentialKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { v: 1, iv: iv.toString('base64'), tag: tag.toString('base64'), data: encrypted.toString('base64') };
}

export function decryptCredentialObject<T extends Record<string, unknown>>(payload: { v: 1; iv: string; tag: string; data: string }): T {
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const data = Buffer.from(payload.data, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', credentialKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as T;
}

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

export async function recordActivity(_tenantId: string, _entry: ActivityRecordInput): Promise<void> {}

export async function createLink(_tenantId: string, _userId: string, _link: Record<string, unknown>): Promise<{ linkId: string }> {
  return { linkId: 'link-' + Date.now() };
}

export interface EntityLink {
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationshipType: string;
  metadata?: Record<string, unknown>;
  [k: string]: unknown;
}

export async function getLinksForEntity(_tenantId: string, _entityType: string, _entityId: string): Promise<EntityLink[]> {
  return [];
}

export async function getTenantBranding(_tenantId: string): Promise<Record<string, unknown>> {
  return {};
}

export async function getModuleShellConfig(_tenantId: string, _moduleCode: string): Promise<Record<string, unknown>> {
  return {};
}

export async function listUserPreferences(_tenantId: string, _userId: string): Promise<Record<string, unknown>[]> {
  return [];
}

export async function listTenantConfig(_tenantId: string): Promise<Record<string, unknown>[]> {
  return [];
}

export async function saveUserShellPreference(_tenantId: string, _userId: string, _pref: Record<string, unknown>): Promise<void> {}
export async function saveTenantShellOverride(_tenantId: string, _override: Record<string, unknown>): Promise<void> {}
export async function saveRoleShellOverride(_tenantId: string, _roleCode: string, _override: Record<string, unknown>): Promise<void> {}
export async function removeShellOverride(_tenantId: string, _overrideId: string): Promise<void> {}

export type PlatformTaskPayload = Record<string, unknown>;
export type PlatformTaskResult = Record<string, unknown>;

const _taskHandlers = new Map<string, (tenantId: string, payload: PlatformTaskPayload) => Promise<PlatformTaskResult>>();

export function registerTaskHandler(code: string, handler: (tenantId: string, payload: PlatformTaskPayload) => Promise<PlatformTaskResult>): void {
  _taskHandlers.set(code, handler);
}

export async function getAgentResourceAllocation(_tenantId: string): Promise<Record<string, unknown>> {
  return {};
}

export async function isOpenClawAvailable(): Promise<boolean> {
  return bridgeIsOpenClawAvailable();
}

export async function getOpenClawServiceConfig(): Promise<Record<string, unknown>> {
  return bridgeGetOpenClawServiceConfig();
}

export async function listOpenClawTools(ctx?: OpenClawContext): Promise<Array<Record<string, unknown>>> {
  return bridgeListOpenClawTools(ctx);
}

export async function listOpenClawResources(
  uri?: string,
  ctx?: OpenClawContext,
): Promise<Array<Record<string, unknown>>> {
  return bridgeListOpenClawResources(uri, ctx);
}

export async function executeOpenClawTool(
  tool: string,
  input: Record<string, unknown>,
  ctx?: OpenClawContext,
): Promise<Record<string, unknown>> {
  return bridgeExecuteOpenClawTool(tool, input, ctx);
}

// Calibration shims — return empty proposal envelopes rather than throwing.
// The monolith call chain (modules/workflow/.../cooperative-workflows.routes.ts)
// has no real implementation either; routes that depend on these get a safe
// no-op response instead of HTTP 500.
export async function proposeCalibration(tenantId: string, vendorId: string): Promise<Record<string, unknown>> {
  return {
    calibrationId: `calibration-${Date.now()}`,
    tenantId,
    vendorId,
    status: 'proposed',
    proposedAt: new Date().toISOString(),
  };
}

export async function submitCalibration(tenantId: string, calibrationId: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  return {
    calibrationId,
    tenantId,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    input,
  };
}

export async function acceptCalibration(tenantId: string, calibrationId: string, userId: string): Promise<Record<string, unknown>> {
  return {
    calibrationId,
    tenantId,
    status: 'accepted',
    acceptedBy: userId,
    acceptedAt: new Date().toISOString(),
  };
}

export async function getCalibration(_tenantId: string, _calibrationId: string): Promise<Record<string, unknown> | null> {
  return null;
}

export async function listCalibrations(_tenantId: string, _vendorId?: string): Promise<Record<string, unknown>[]> {
  return [];
}

export interface TeamRecommendation {
  tenantId: string;
  generatedAt: string;
  recommendation: Record<string, unknown>;
}

export async function generateTeamRecommendation(tenantId: string, _input?: Record<string, unknown>): Promise<TeamRecommendation> {
  return { tenantId, generatedAt: new Date().toISOString(), recommendation: {} };
}

export async function getTeamRecommendation(_tenantId: string): Promise<TeamRecommendation | null> {
  return null;
}

export async function saveTeamRecommendation(_tenantId: string, _rec: TeamRecommendation): Promise<void> {}
export async function applyTeamRecommendation(_tenantId: string, _recId: string): Promise<void> {}

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

export function generateRoadmap(_profile: Record<string, unknown>): Roadmap {
  return { tasks: [], generatedAt: new Date().toISOString() };
}

export async function createRoadmap(_tenantId: string, roadmap: Roadmap): Promise<Roadmap> {
  return { ...roadmap, roadmapId: roadmap.roadmapId ?? 'roadmap-' + Date.now() };
}

export async function getRoadmap(_tenantId: string): Promise<Roadmap | null> {
  return null;
}

export async function updateTaskStatus(_tenantId: string, taskId: string, status: TaskStatus): Promise<RoadmapTask> {
  return { taskId, title: '', status };
}

export function getNextPendingTask(roadmap: Roadmap): RoadmapTask | null {
  return roadmap.tasks.find(t => t.status !== 'done') ?? null;
}

export async function getActivatedTemplates(_tenantId: string, _phaseType: RoadmapPhaseType): Promise<Record<string, unknown>[]> {
  return [];
}

export async function activateTemplateForPhase(_tenantId: string, _templateKey: string, _phaseType: string): Promise<void> {}
export async function saveActivatedTemplate(_tenantId: string, _template: Record<string, unknown>): Promise<void> {}

export async function getBusinessFunctions(_tenantId: string): Promise<Record<string, unknown>[]> {
  return [];
}

export async function getStaffingForOrgSize(_tenantId: string, _size: string): Promise<Record<string, unknown>> {
  return {};
}

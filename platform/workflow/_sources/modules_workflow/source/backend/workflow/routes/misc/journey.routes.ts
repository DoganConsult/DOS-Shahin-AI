import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
/**
 * Journey API Routes — AI GRC Partner Journey
 *
 * 16 endpoints for the journey feature: setup wizard, roadmap,
 * team builder, maturity dashboard, nudges, and templates.
 *
 * All routes require authentication and tenant isolation.
 * Requirements: All
 */


import { authenticate, requirePermission } from '../../ports/auth.port';

// Journey Engine
import {
  getOrCreateJourneyState,
  advanceJourney,
  getJourneyProgress,
} from '../../ports/platform.port';

// Setup Wizard
import {
  getCompanyProfile,
  createCompanyProfile,
  validateCompanyProfile,
  detectApplicableFrameworks,
  recommendRolesForSize,
} from '../../ports/platform.port';

// Roadmap Builder
import {
  generateRoadmap,
  getRoadmap,
  createRoadmap,
  updateTaskStatus,
  getNextPendingTask,
} from '../../ports/platform.port';

import {
  generateTeamRecommendation,
  applyTeamRecommendation,
  saveTeamRecommendation,
  getTeamRecommendation,
} from '../../ports/platform.port';

// Maturity Dashboard
import {
  getLatestMaturity,
  generateExecutiveSummary,
} from '../../ports/platform.port';

// Nudge Engine
import {
  getActiveNudges,
  dismissNudge,
} from '../../ports/platform.port';

// Template Engine
import {
  getActivatedTemplates,
  activateTemplateForPhase,
  saveActivatedTemplate,
} from '../../ports/platform.port';

// Contextual AI
import {
  getJourneyAwareSuggestions as _getJourneyAwareSuggestions,
  buildContextFromRoute as _buildContextFromRoute,
} from '../../ports/ai.port';

import { classifyCompanySize } from '../../ports/platform.port';
import { getAvailableTemplates, getTemplateByType, instantiateProcess } from '../../../workflow/services/tasks/process-template.service';
import type { RoadmapPhaseType, JourneyCompanyProfile } from '@dos/types';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { asyncHandler, auditMiddleware, setAuditData as _setAuditData, automationMiddleware, validate } from '../../ports/middleware.port';
import { z as _z } from 'zod';
import { swallow, EC } from '@dos/platform-core/resilience';
import { setupAnswerBody, updateTaskStatusBody, activateTemplateBody, instantiateProcessBody, createStartBody, createGenerateBody, createRecommendBody, createApplyBody, updateDismissBody } from "../../schemas/workflow.schemas";
const router = Router();
router.use(auditMiddleware("journey"));
router.use(automationMiddleware("journey"));

// ── Helper to extract tenant/user from authenticated request ──

function getTenantUser(req: Request): { tenantId: string; userId: string } {
  const user = req.user!;
  return { tenantId: user.tenantId, userId: user.userId };
}

function isDBSetupError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err ?? '');

  const code = (err as Error)?.code;
  return msg.includes('does not exist') || msg.includes('relation') ||
    msg.includes('schema') || msg.includes('column') ||
    code === '42P01' || code === '3F000' || code === '42703';
}

// ============================================================================
// Journey State
// ============================================================================

// POST /api/journey/start — Start or resume journey
router.post('/start', authenticate, requirePermission("journey.record.write"), validate({ body: createStartBody }), asyncHandler(async (req, res) => {
  try {
  const { tenantId, userId } = getTenantUser(req);
  const state = await getOrCreateJourneyState(tenantId, userId);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'journey', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.journey.created' });
  res.json(state);
  } catch (err) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// GET /api/journey/state — Get current journey state
router.get('/state', authenticate, requirePermission("journey.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const { tenantId, userId } = getTenantUser(req);
  const state = await getOrCreateJourneyState(tenantId, userId);
  const progress = await getJourneyProgress(tenantId);
  res.json({ state, progress });
  } catch (err) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// ============================================================================
// Setup Wizard
// ============================================================================

// POST /api/journey/setup/answer — Submit setup wizard answer
router.post('/setup/answer', authenticate, requirePermission("journey.record.write"), validate({ body: setupAnswerBody }), asyncHandler(async (req, res) => {
  try {
  const { tenantId, userId } = getTenantUser(req);
  const { stepId, answer } = req.body;

  if (!stepId) {
  res.status(400).json({ error: 'stepId is required' });
  return;
  }

  // Process the answer based on stepId
  if (stepId === 'company_profile') {
  const validation = validateCompanyProfile(answer);
  if (!validation.valid) {
  res.status(400).json({
  error: 'Incomplete company profile',
  missingFields: (validation as any).missingFields ?? [],
  });
  return;
  }

  // Detect frameworks and recommend roles
  const frameworks = await detectApplicableFrameworks(answer.industrySector);
  const roles = recommendRolesForSize(answer.employeeCount, frameworks);

  const profile: JourneyCompanyProfile = {
  profileId: '',
  tenantId,
  companyName: answer.companyName,
  industrySector: answer.industrySector,
  employeeCount: answer.employeeCount,
  ksaRegion: answer.ksaRegion,
  subsidiaries: answer.subsidiaries || [],
  applicableFrameworks: frameworks,
  recommendedRoles: roles,
  maturityLevel: answer.maturityLevel || 'none',
  createdAt: new Date().toISOString(),
  };

  const saved = await createCompanyProfile(tenantId, profile);

  // Advance the journey past setup
  const state = await advanceJourney(tenantId, userId, stepId);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'journey', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.journey.created' });
  res.json({ profile: saved, state });
  return;
  }

  // Generic step completion
  const state = await advanceJourney(tenantId, userId, stepId);
  res.json({ state });
  } catch (err) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// GET /api/journey/setup/profile — Get company profile
router.get('/setup/profile', authenticate, requirePermission("journey.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const { tenantId } = getTenantUser(req);
  const profile = await getCompanyProfile(tenantId);
  if (!profile) {
  res.status(404).json({ error: 'Company profile not found' });
  return;
  }
  res.json(profile);
  } catch (err) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));


// ============================================================================
// Roadmap
// ============================================================================

// POST /api/journey/roadmap/generate — Generate roadmap
router.post('/roadmap/generate', authenticate, requirePermission("journey.record.write"), validate({ body: createGenerateBody }), asyncHandler(async (req, res) => {
  try {
  const { tenantId } = getTenantUser(req);
  const profile = await getCompanyProfile(tenantId);
  if (!profile) {
  res.status(400).json({ error: 'Company profile must be completed before generating a roadmap' });
  return;
  }

  const roadmap = generateRoadmap(profile as unknown as Record<string, unknown>);
  const saved = await createRoadmap(tenantId, roadmap);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'journey', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.journey.created' });
  res.json(saved);
  } catch (err) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// GET /api/journey/roadmap — Get current roadmap
router.get('/roadmap', authenticate, requirePermission("journey.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const { tenantId } = getTenantUser(req);
  const roadmap = await getRoadmap(tenantId);
  if (!roadmap) {
  res.json({ phases: [], tasks: [], progress: 0, message: 'No roadmap generated yet' });
  return;
  }
  res.json(roadmap);
  } catch (err) {
  if (isDBSetupError(err)) {
  res.json({ phases: [], tasks: [], progress: 0, message: 'Roadmap not initialized' });
  } else {
  res.status(500).json({ error: toErrorMessage(err) });
  }
  }
}));

// PATCH /api/journey/roadmap/task/:taskId — Update task status
router.patch('/roadmap/task/:taskId', authenticate, validate({ body: updateTaskStatusBody }), asyncHandler(async (req, res) => {
  try {
  const { tenantId } = getTenantUser(req);
  const { taskId } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'in_progress', 'completed', 'skipped'];
  if (!status || !validStatuses.includes(status)) {
  res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  return;
  }

  await updateTaskStatus(tenantId, taskId, status);
  const roadmap = await getRoadmap(tenantId);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'journey', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.journey.updated' });
  res.json({ taskId, status, roadmap });
  } catch (err) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// GET /api/journey/roadmap/next — Get next recommended action
router.get('/roadmap/next', authenticate, requirePermission("journey.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const { tenantId } = getTenantUser(req);
  const roadmap = await getRoadmap(tenantId);
  if (!roadmap) {
  res.json({ message: 'No roadmap generated yet', task: null });
  return;
  }

  const nextTask = getNextPendingTask(roadmap);
  if (!nextTask) {
  res.json({ message: 'All tasks completed', task: null });
  return;
  }
  res.json({ task: nextTask });
  } catch (err) {
  if (isDBSetupError(err)) {
  res.json({ message: 'Roadmap not initialized', task: null });
  } else {
  res.status(500).json({ error: toErrorMessage(err) });
  }
  }
}));

// ============================================================================
// Team Builder
// ============================================================================

// POST /api/journey/team/recommend — Get team recommendation
router.post('/team/recommend', authenticate, requirePermission("journey.record.read"), validate({ body: createRecommendBody }), asyncHandler(async (req, res) => {
  try {
  const { tenantId } = getTenantUser(req);
  const profile = await getCompanyProfile(tenantId);
  if (!profile) {
  res.status(400).json({ error: 'Company profile must be completed first' });
  return;
  }

  const companySize = classifyCompanySize((profile as any).employeeCount);
  const recommendation = await generateTeamRecommendation(companySize, (profile as any).applicableFrameworks);
  await saveTeamRecommendation(tenantId, recommendation);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'journey', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.journey.created' });
  res.json(recommendation);
  } catch (err) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// POST /api/journey/team/apply — Apply team structure
router.post('/team/apply', authenticate, requirePermission("journey.record.write"), validate({ body: createApplyBody }), asyncHandler(async (req, res) => {
  try {
  const { tenantId } = getTenantUser(req);
  const recommendation = await getTeamRecommendation(tenantId);
  if (!recommendation) {
  res.status(404).json({ error: 'No team recommendation found. Generate one first.' });
  return;
  }

  const result = await applyTeamRecommendation(tenantId, String((recommendation as any).recommendationId ?? (recommendation as any).id ?? ''));
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'journey', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.journey.created' });
  res.json(result);
  } catch (err) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));


// ============================================================================
// Maturity Dashboard
// ============================================================================

// GET /api/journey/maturity — Get maturity score
router.get('/maturity', authenticate, requirePermission("journey.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const { tenantId } = getTenantUser(req);
  const maturity = await getLatestMaturity(tenantId);
  if (!maturity) {
  res.json({ overall: 0, components: [], trend: [], computedAt: new Date().toISOString() });
  return;
  }
  res.json(maturity);
  } catch (err) {
  if (isDBSetupError(err)) {
  res.json({ overall: 0, components: [], trend: [], computedAt: new Date().toISOString() });
  } else {
  res.status(500).json({ error: toErrorMessage(err) });
  }
  }
}));

// GET /api/journey/maturity/summary — Get executive summary
router.get('/maturity/summary', authenticate, requirePermission("journey.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const { tenantId } = getTenantUser(req);
  const summary = await generateExecutiveSummary(tenantId);
  res.json(summary);
  } catch (err) {
  if (isDBSetupError(err)) {
  res.json({ summary: '', recommendations: [], generatedAt: new Date().toISOString() });
  } else {
  res.status(500).json({ error: toErrorMessage(err) });
  }
  }
}));

// ============================================================================
// Nudges
// ============================================================================

// GET /api/journey/nudges — Get active nudges
router.get('/nudges', authenticate, requirePermission("journey.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const user = req.user!;
  if (!user?.tenantId || !user?.userId) {
  return res.json({ nudges: [], count: 0 });
  }
  const currentRoute = req.query.route as string | undefined;
  const nudges = await getActiveNudges(user.tenantId, user.userId, currentRoute);
  res.json({ nudges, count: nudges.length });
  } catch (err) {
  // Table/schema may not exist yet for new tenants — return empty rather than 500
  const msg = String((err as Error)?.message ?? err ?? '');

  const code = (err as Error)?.code;
  const isDBSetupError =
  msg.includes('does not exist') ||
  msg.includes('relation') ||
  msg.includes('schema') ||
  msg.includes('undefined') ||
  msg.includes('column') ||
  msg.includes('syntax') ||
  code === '42P01' ||
  code === '3F000' ||
  code === '42703' ||
  code === '42P07';
  if (isDBSetupError) {
  res.json({ nudges: [], count: 0 });
  } else {
  // Graceful degradation: nudges are non-critical, return empty on any error
  res.json({ nudges: [], count: 0 });
  }
  }
}));

// PATCH /api/journey/nudges/:nudgeId/dismiss — Dismiss a nudge
router.patch('/nudges/:nudgeId/dismiss', authenticate, validate({ body: updateDismissBody }), asyncHandler(async (req, res) => {
  try {
  const { tenantId } = getTenantUser(req);
  const { nudgeId } = req.params;
  await dismissNudge(tenantId, nudgeId);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'journey', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.journey.updated' });
  res.json({ dismissed: true, nudgeId });
  } catch (err) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// ============================================================================
// Templates
// ============================================================================

// GET /api/journey/templates/:phaseType — Get activated templates for phase
router.get('/templates/:phaseType', authenticate, requirePermission("journey.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const { tenantId } = getTenantUser(req);
  const { phaseType } = req.params;

  const validPhases: RoadmapPhaseType[] = [
  'foundation', 'assessment', 'implementation', 'operations', 'continuous_improvement',
  ];
  if (!validPhases.includes(phaseType as RoadmapPhaseType)) {
  res.status(400).json({ error: `phaseType must be one of: ${validPhases.join(', ')}` });
  return;
  }

  const templates = await getActivatedTemplates(tenantId, phaseType as RoadmapPhaseType);
  res.json({ templates, count: templates.length });
  } catch (err) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// POST /api/journey/templates/:templateKey/activate — Activate a template
router.post('/templates/:templateKey/activate', authenticate, requirePermission("journey.record.write"), validate({ body: activateTemplateBody }), asyncHandler(async (req, res) => {
  try {
  const { tenantId } = getTenantUser(req);
  const { templateKey: _templateKey } = req.params;
  const { phaseType } = req.body;

  if (!phaseType) {
  res.status(400).json({ error: 'phaseType is required in request body' });
  return;
  }

  const validPhases: RoadmapPhaseType[] = [
  'foundation', 'assessment', 'implementation', 'operations', 'continuous_improvement',
  ];
  if (!validPhases.includes(phaseType as RoadmapPhaseType)) {
  res.status(400).json({ error: `phaseType must be one of: ${validPhases.join(', ')}` });
  return;
  }

  const profile = await getCompanyProfile(tenantId);
  if (!profile) {
  res.status(400).json({ error: 'Company profile must be completed first' });
  return;
  }

  const _activated = await activateTemplateForPhase(tenantId, _templateKey, phaseType as string);
  const templateBody = {
    templateId: _templateKey,
    templateName: `${_templateKey} config`,
    templateBody: JSON.stringify(profile),
    moduleCode: 'journey',
    phase: phaseType
  };
  const saved = await saveActivatedTemplate(tenantId, templateBody);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'journey', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.journey.created' });
  res.json(saved);
  } catch (err) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

router.get('/process-templates', validate({ query: z.record(z.unknown()) }), authenticate, async (_req: Request, res: Response) => {
  try {
    const templates = getAvailableTemplates();
    res.json({ templates, count: templates.length });
  } catch (err) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/process-templates/:type', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const template = getTemplateByType(req.params.type);
  if (!template) { res.status(404).json({ error: 'Template not found' }); return; }
  res.json(template);
}));

router.post('/process-templates/:type/instantiate', authenticate, validate({ body: instantiateProcessBody }), asyncHandler(async (req, res) => {
  const template = getTemplateByType(req.params.type);
  if (!template) { res.status(404).json({ error: 'Template not found' }); return; }
  const teamSize = req.body.teamSize || 1;
  const instance = instantiateProcess(template, teamSize);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'journey', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.journey.created' });
  res.status(201).json(instance);
}));

export default router;

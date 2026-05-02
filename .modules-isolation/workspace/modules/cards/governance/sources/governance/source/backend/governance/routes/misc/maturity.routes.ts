import { Request, Response, Router } from 'express';
import { logger } from '../../ports/logger.port';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../ports/auth.port';
import { validate, asyncHandler, auditMiddleware, setAuditData, automationMiddleware } from '../../ports/middleware.port';
import { query, safeQuery, tenantSchema } from '../../ports/database.port';
import {
  computeSkipSet,
  generateIntelligenceReport,
  recommendFrameworks,
  computeMaturityScores,
  generateGapAnalysis as _generateGapAnalysis,
  generateWorkspaceConfig as _generateWorkspaceConfig,
  getBranchingRules,
} from "../../../training/services/questionnaire-intelligence.service";
import {
  getMaturityTrends,
  generateHealthReport,
  computeMaturityScore as _computeMaturityScore,
  checkMaturityThreshold,
} from '../../ports/platform.port';
import {
  autoAssessMaturity,
  getAutoAssessmentHistory,
} from "../../services/governance/governance-maturity-auto-assessment.service";
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { enforceStatusTransition } from '../../ports/platform.port';
import { getFirstRow } from '@dos/db';
import { swallow, EC } from '@dos/platform-core/resilience';
import { startPostBody, idRespondPutBody, idAutoDeployPostBody, adaptiveQuestionsPostBody, idFrameworkRecommendationsPostBody, trackerCheckThresholdPostBody, autoAssessPostBody } from "../../schemas/governance.schemas";

// ── Zod Schemas ──────────────────────────────────────────────────────────
const router = Router();
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));

// GET /api/maturity/questions — Get all questions, optionally filtered by category
router.get("/questions", authenticate, requirePermission("maturity.assessment.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const category = req.query.category as string | undefined;
  let sql = `SELECT * FROM maturity_questions`;
  const params: unknown[] = [];
  if (category) {
  sql += ` WHERE category = $1`;
  params.push(category);
  }
  sql += ` ORDER BY sort_order ASC`;
  const result = await safeQuery(sql, params);
  res.json({ questions: result.rows, count: result.rows.length });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// GET /api/maturity/categories — Get distinct categories with question counts
router.get("/categories", authenticate, requirePermission("maturity.assessment.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const result = await safeQuery(
  `SELECT category, COUNT(*)::int AS question_count
  FROM maturity_questions GROUP BY category ORDER BY MIN(sort_order)`
  );
  res.json({ categories: result.rows });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// POST /api/maturity/start — Start a new maturity assessment for the tenant
router.post("/start", authenticate, requirePermission("maturity.assessment.read"), validate({ body: startPostBody }), asyncHandler(async (req, res) => {
  try {
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;
  const schema = tenantSchema(tenantId);

  // Create maturity assessment tables if they don't exist
  await safeQuery(`
  CREATE TABLE IF NOT EXISTS "${schema}".maturity_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) DEFAULT 'in_progress',
  overall_score DECIMAL(5,2) DEFAULT 0,
  domain_scores JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS "${schema}".maturity_responses (
  response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL,
  question_id VARCHAR(20) NOT NULL,
  answer JSONB NOT NULL,
  score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
  );
  `);

  const result = await safeQuery(
  `INSERT INTO "${schema}".maturity_assessments (created_by) VALUES ($1) RETURNING *`,
  [userId]
  );
  setAuditData(res as any, { action: "create", entityType: "maturity", entityId: getFirstRow(result)?.assessment_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user.tenantId, userId: req.user!.userId!, module: 'assessments', event: 'created', entityType: 'maturity', entityId: req.params.id || '' } as any)), { tenantId: req.user.tenantId, operation: 'grcEvent:assessments.maturity.created' });
  res.status(201).json(getFirstRow(result));
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// GET /api/maturity/latest — Get the latest maturity assessment for the tenant
router.get("/latest", authenticate, requirePermission("maturity.assessment.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const tenantId = req.user.tenantId;
  const schema = tenantSchema(tenantId);

  // Check if table exists
  const tableCheck = await safeQuery(
  `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'maturity_assessments')`,
  [schema]
  );
  if (!getFirstRow(tableCheck)?.exists) {
  res.json({ assessment: null });
  return;
  }

  const result = await safeQuery(
  `SELECT * FROM "${schema}".maturity_assessments ORDER BY created_at DESC LIMIT 1`
  );
  if (result.rows.length === 0) {
  res.json({ assessment: null });
  return;
  }

  // Get responses for this assessment
  const assessment = getFirstRow(result)!;
  const responses = await safeQuery(
  `SELECT r.*, q.category, q.domain, q.text_en, q.text_ar, q.weight
  FROM "${schema}".maturity_responses r
  JOIN maturity_questions q ON q.question_id = r.question_id
  WHERE r.assessment_id = $1
  ORDER BY q.sort_order`,
  [assessment.assessment_id]
  );

  res.json({ assessment, responses: responses.rows });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// PUT /api/maturity/:id/respond — Save batch responses for an assessment
router.put("/:id/respond", authenticate, requirePermission("maturity.assessment.read"), validate({ body: idRespondPutBody }), asyncHandler(async (req, res) => {
  try {
  const tenantId = req.user.tenantId;
  const schema = tenantSchema(tenantId);
  const assessmentId = req.params.id;
  const { responses } = req.body; // Array of { question_id, answer, score }

  if (!responses || !Array.isArray(responses)) {
  res.status(400).json({ error: "responses array is required" });
  return;
  }

  for (const r of responses) {
  await safeQuery(
  `INSERT INTO "${schema}".maturity_responses (assessment_id, question_id, answer, score)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (assessment_id, question_id) DO UPDATE SET
  answer = EXCLUDED.answer, score = EXCLUDED.score
  WHERE (maturity_responses.answer, maturity_responses.score)
  IS DISTINCT FROM (EXCLUDED.answer, EXCLUDED.score)`,
  [assessmentId, r.question_id, JSON.stringify(r.answer), r.score || 0]
  );
  }

  setAuditData(res as any, { action: "update", entityType: "maturity", entityId: assessmentId, afterState: { saved: responses.length } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user.tenantId, userId: req.user!.userId!, module: 'assessments', event: 'updated', entityType: 'maturity', entityId: req.params.id || '' } as any)), { tenantId: req.user.tenantId, operation: 'grcEvent:assessments.maturity.updated' });
  res.json({ saved: responses.length });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// GET /api/maturity/:id/score — Calculate and return scores by domain
router.get("/:id/score", authenticate, requirePermission("maturity.assessment.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const tenantId = req.user.tenantId;
  const schema = tenantSchema(tenantId);
  const assessmentId = req.params.id;

  const result = await safeQuery(
  `SELECT q.category, q.domain, r.score, q.weight
  FROM "${schema}".maturity_responses r
  JOIN maturity_questions q ON q.question_id = r.question_id
  WHERE r.assessment_id = $1`,
  [assessmentId]
  );

  // Calculate domain scores
  const domainMap: Record<string, { totalWeight: number; weightedScore: number; count: number }> = {};
  for (const row of result.rows) {
  const key = row.category;
  if (!domainMap[key]) domainMap[key] = { totalWeight: 0, weightedScore: 0, count: 0 };
  domainMap[key].totalWeight += row.weight;
  domainMap[key].weightedScore += row.score * row.weight;
  domainMap[key].count++;
  }

  const domainScores: Record<string, number> = {};
  let totalWeightedScore = 0;
  let totalWeight = 0;
  for (const [domain, data] of Object.entries(domainMap)) {
  const score = data.totalWeight > 0 ? Math.round((data.weightedScore / (data.totalWeight * 5)) * 100) : 0;
  domainScores[domain] = score;
  totalWeightedScore += data.weightedScore;
  totalWeight += data.totalWeight;
  }

  const overallScore = totalWeight > 0 ? Math.round((totalWeightedScore / (totalWeight * 5)) * 100) : 0;

  // Determine maturity level
  let level = 'initial';
  if (overallScore >= 90) level = 'optimized';
  else if (overallScore >= 75) level = 'measured';
  else if (overallScore >= 60) level = 'defined';
  else if (overallScore >= 40) level = 'managed';

  const enforcement = await enforceStatusTransition(req.tenantId, {
  moduleCode: 'qiyas', table: 'maturity_assessments', idColumn: 'assessment_id',
  entityId: assessmentId, toStatus: 'completed', actorUserId: req.user!.userId!,
  extraSets: `overall_score = $2, domain_scores = $3, completed_at = NOW()`,
  extraParams: [overallScore, JSON.stringify(domainScores)],
  });
  if (enforcement.blocked) { res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return; }
  if (!enforcement.success) {
  await safeQuery(
  `UPDATE "${schema}".maturity_assessments
  SET overall_score = $1, domain_scores = $2, status = 'completed', completed_at = NOW()
  WHERE assessment_id = $3`,
  [overallScore, JSON.stringify(domainScores), assessmentId]);
  }

  res.json({
  assessmentId,
  overallScore,
  level,
  domainScores,
  totalResponses: result.rows.length,
  });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// POST /api/maturity/:id/auto-deploy — Auto-populate GRC setup based on assessment answers
router.post("/:id/auto-deploy", authenticate, requirePermission("maturity.assessment.read"), validate({ body: idAutoDeployPostBody }), asyncHandler(async (req, res) => {
  try {
  const tenantId = req.user.tenantId;
  const schema = tenantSchema(tenantId);
  const assessmentId = req.params.id;

  // Get all responses with question metadata
  const responses = await safeQuery(
  `SELECT r.answer, q.category, q.domain, q.tags
  FROM "${schema}".maturity_responses r
  JOIN maturity_questions q ON q.question_id = r.question_id
  WHERE r.assessment_id = $1`,
  [assessmentId]
  );

  const deployed: string[] = [];

  // Analyze answers to determine which frameworks to activate
  const tags = new Set<string>();
  for (const row of responses.rows) {
  if (row.tags) row.tags.forEach((t: string) => tags.add(t));
  // Check boolean answers that indicate framework applicability
  const answer = typeof row.answer === 'string' ? JSON.parse(row.answer) : row.answer;
  if (answer === true && row.tags) {
  row.tags.forEach((t: string) => tags.add(t));
  }
  }

  // Auto-assign frameworks based on detected tags
  const frameworkMap: Record<string, { name: string; description: string }> = {
  nca: { name: 'NCA ECC', description: 'National Cybersecurity Authority Essential Cybersecurity Controls' },
  sama: { name: 'SAMA CSF', description: 'Saudi Arabian Monetary Authority Cybersecurity Framework' },
  pdpl: { name: 'PDPL', description: 'Saudi Personal Data Protection Law' },
  iso: { name: 'ISO 27001', description: 'Information Security Management System' },
  cma: { name: 'CMA', description: 'Capital Market Authority Requirements' },
  citc: { name: 'CITC', description: 'Communications and Information Technology Commission' },
  moh: { name: 'MOH', description: 'Ministry of Health Compliance Requirements' },
  };

  for (const [tag, fw] of Object.entries(frameworkMap)) {
  if (tags.has(tag) || tags.has('framework_selection')) {
  try {
  await safeQuery(
  `INSERT INTO "${schema}".frameworks (framework_id, name, description, category, status)
  VALUES ($1, $2, $3, 'security', 'not_started')
  ON CONFLICT (framework_id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description
  WHERE (frameworks.name, frameworks.description)
  IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.description)`,
  [`fw_${tag}`, fw.name, fw.description]
  );
  deployed.push(`Framework: ${fw.name}`);
  } catch { /* ignore duplicates */ }
  }
  }

  // Get domain scores to identify weak areas for risk/control/policy creation
  const scoreResult = await safeQuery(
  `SELECT overall_score, domain_scores FROM "${schema}".maturity_assessments WHERE assessment_id = $1`,
  [assessmentId]
  );
  const domainScores: Record<string, number> = getFirstRow(scoreResult)?.domain_scores || {};

  // Auto-create risks for weak domains (score < 50)
  const riskTemplates: Record<string, { title: string; description: string; category: string }> = {
  governance: { title: 'Weak Governance Framework', description: 'Organization lacks formal governance structure for GRC processes', category: 'operational' },
  risk: { title: 'Immature Risk Management', description: 'Risk identification and assessment processes need improvement', category: 'strategic' },
  compliance: { title: 'Compliance Gap Exposure', description: 'Regulatory compliance processes are below acceptable maturity', category: 'compliance' },
  security: { title: 'Security Controls Gap', description: 'Information security controls need strengthening', category: 'cyber' },
  bcp: { title: 'Business Continuity Risk', description: 'Business continuity and disaster recovery planning is insufficient', category: 'operational' },
  vendor: { title: 'Third-Party Risk Exposure', description: 'Vendor risk management processes are immature', category: 'third_party' },
  audit: { title: 'Audit Readiness Gap', description: 'Internal audit processes need improvement', category: 'operational' },
  privacy: { title: 'Data Privacy Risk', description: 'Personal data protection measures are insufficient', category: 'compliance' },
  };

  for (const [domain, score] of Object.entries(domainScores)) {
  if (score < 50 && riskTemplates[domain]) {
  const rt = riskTemplates[domain];
  try {
  await safeQuery(
  `INSERT INTO "${schema}".risks (risk_id, title, description, category, likelihood, impact, status)
  VALUES ($1, $2, $3, $4, $5, $6, 'open')
  ON CONFLICT (risk_id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description,
  category = EXCLUDED.category, likelihood = EXCLUDED.likelihood, impact = EXCLUDED.impact
  WHERE (risks.title, risks.description)
  IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.description)`,
  [`risk_auto_${domain}`, rt.title, rt.description, rt.category,
  score < 25 ? 4 : 3, score < 25 ? 4 : 3]
  );
  deployed.push(`Risk: ${rt.title} (${domain}: ${score}%)`);
  } catch { /* ignore */ }
  }
  }

  // Auto-create baseline controls for weak areas
  const controlTemplates: Record<string, { title: string; description: string }> = {
  governance: { title: 'GRC Policy Review Process', description: 'Establish periodic review cycle for all GRC policies' },
  security: { title: 'Access Control Baseline', description: 'Implement role-based access control for all critical systems' },
  privacy: { title: 'Data Classification Policy', description: 'Classify all personal data by sensitivity and apply appropriate protections' },
  bcp: { title: 'DR Test Schedule', description: 'Schedule and execute disaster recovery tests quarterly' },
  };

  for (const [domain, score] of Object.entries(domainScores)) {
  if (score < 60 && controlTemplates[domain]) {
  const ct = controlTemplates[domain];
  try {
  await safeQuery(
  `INSERT INTO "${schema}".controls (control_id, title, description, status, automatable)
  VALUES ($1, $2, $3, 'not_implemented', false)
  ON CONFLICT (control_id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description
  WHERE (controls.title, controls.description)
  IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.description)`,
  [`ctrl_auto_${domain}`, ct.title, ct.description]
  );
  deployed.push(`Control: ${ct.title}`);
  } catch { /* ignore */ }
  }
  }

  // Auto-create baseline policies for governance gaps
  if ((domainScores['governance'] || 0) < 60) {
  const policies = [
  { id: 'pol_auto_acceptable_use', title: 'Acceptable Use Policy', content: 'Defines acceptable use of organizational IT resources and data.' },
  { id: 'pol_auto_incident_response', title: 'Incident Response Policy', content: 'Establishes procedures for detecting, reporting, and responding to security incidents.' },
  ];
  for (const pol of policies) {
  try {
  await safeQuery(
  `INSERT INTO "${schema}".policies (policy_id, title, content, status, version)
  VALUES ($1, $2, $3, 'draft', 1)
  ON CONFLICT (policy_id) DO UPDATE SET
  title = EXCLUDED.title, content = EXCLUDED.content
  WHERE (policies.title, policies.content)
  IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.content)`,
  [pol.id, pol.title, pol.content]
  );
  deployed.push(`Policy: ${pol.title}`);
  } catch { /* ignore */ }
  }
  }

  const autoDeploy = { message: 'Auto-deployment completed', deployed, tagsDetected: Array.from(tags), domainScores };
  setAuditData(res as any, { action: "create", entityType: "maturity", entityId: assessmentId, afterState: autoDeploy });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user.tenantId, userId: req.user!.userId!, module: 'assessments', event: 'created', entityType: 'maturity', entityId: req.params.id || '' } as any)), { tenantId: req.user.tenantId, operation: 'grcEvent:assessments.maturity.created' });
  res.json(autoDeploy);
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// ══════════════════════════════════════════════════
// INTELLIGENCE ENGINE ROUTES (5 maximizers)
// ══════════════════════════════════════════════════

// GET /api/maturity/branching-rules — Get all adaptive branching rules
router.get("/branching-rules", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("maturity.assessment.read"), (_req: Request, res: Response) => {
  try {
    const rules = getBranchingRules();
    res.json({ rules, count: rules.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/maturity/adaptive-questions — Get questions with adaptive skip logic
router.post("/adaptive-questions", authenticate, requirePermission("maturity.assessment.read"), validate({ body: adaptiveQuestionsPostBody }), asyncHandler(async (req, res) => {
  try {
  const { responses } = req.body; // org_profile answers so far
  const skipSet = computeSkipSet(responses || []);

  const category = req.query.category as string | undefined;
  let sql = `SELECT * FROM maturity_questions`;
  const params: unknown[] = [];
  if (category) {
  sql += ` WHERE category = $1`;
  params.push(category);
  }
  sql += ` ORDER BY sort_order ASC`;
  const result = await safeQuery(sql, params);

  // Filter out skipped questions
  const questions = result.rows.filter((q: any) => !skipSet.has(q.question_id));
  const skipped = result.rows.length - questions.length;

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user.tenantId, userId: req.user!.userId!, module: 'assessments', event: 'created', entityType: 'maturity', entityId: req.params.id || '' } as any)), { tenantId: req.user.tenantId, operation: 'grcEvent:assessments.maturity.created' });
  res.json({
  questions,
  totalInBank: result.rows.length,
  afterBranching: questions.length,
  skipped,
  skipSet: Array.from(skipSet),
  });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// GET /api/maturity/:id/intelligence — Full intelligence report (all 5 maximizers)
router.get("/:id/intelligence", authenticate, requirePermission("maturity.assessment.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const tenantId = req.user.tenantId;
  const assessmentId = req.params.id;
  const report = await generateIntelligenceReport(tenantId, assessmentId);
  res.json(report);
  } catch (err: unknown) {
  // Table/schema may not exist for new tenants — return empty report
  const isDBSetupError =
  toErrorMessage(err).includes('does not exist') ||
  toErrorMessage(err).includes('relation') ||
  ((err as Record<string,any>)['code'] as string | undefined) === '42P01' ||
  ((err as Record<string,any>)['code'] as string | undefined) === '3F000';
  if (isDBSetupError) {
  res.json({
  assessmentId: req.params.id,
  overallScore: 0,
  overallMaturity: 0,
  overallLabel: 'Not Assessed',
  categoryScores: [],
  gaps: [],
  frameworkRecommendations: [],
  workspaceConfig: {},
  benchmarkComparison: [],
  executiveSummary_en: 'Assessment data not available yet.',
  executiveSummary_ar: 'بيانات التقييم غير متوفرة بعد.',
  generatedAt: new Date().toISOString(),
  });
  } else {
  logger.error(`[maturity] intelligence report error for ${req.params.id}:`, toErrorMessage(err));
  res.json({
  assessmentId: req.params.id,
  overallScore: 0,
  overallMaturity: 0,
  overallLabel: 'Not Assessed',
  categoryScores: [],
  gaps: [],
  frameworkRecommendations: [],
  workspaceConfig: {},
  benchmarkComparison: [],
  executiveSummary_en: 'Intelligence report could not be generated. Please try again.',
  executiveSummary_ar: 'تعذر إنشاء تقرير الذكاء. يرجى المحاولة مرة أخرى.',
  generatedAt: new Date().toISOString(),
  });
  }
  }
}));

// POST /api/maturity/:id/framework-recommendations — DB-driven framework recs
router.post("/:id/framework-recommendations", authenticate, requirePermission("maturity.assessment.read"), validate({ body: idFrameworkRecommendationsPostBody }), asyncHandler(async (req, res) => {
  try {
  const tenantId = req.user.tenantId;
  const schema = tenantSchema(tenantId);
  const assessmentId = req.params.id;

  // Get responses
  const result = await safeQuery(
  `SELECT r.question_id, r.answer, r.score,
  q.category, q.domain, q.weight
  FROM "${schema}".maturity_responses r
  JOIN maturity_questions q ON q.question_id = r.question_id
  WHERE r.assessment_id = $1`,
  [assessmentId]
  );
  const responses = result.rows.map(( r: Record<string, unknown>) => ({
  ...r,
  answer: typeof r.answer === 'string' ? JSON.parse(r.answer) : r.answer,
  score: Number(r.score),
  weight: Number(r.weight),
  }));

  const { categoryScores } = computeMaturityScores((responses as any));
  const orgAnswers = responses.filter(( r: Record<string, unknown>) => r.category === 'org_profile');
  const recommendations = await recommendFrameworks((orgAnswers as any), categoryScores);

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user.tenantId, userId: req.user!.userId!, module: 'assessments', event: 'created', entityType: 'maturity', entityId: req.params.id || '' } as any)), { tenantId: req.user.tenantId, operation: 'grcEvent:assessments.maturity.created' });
  res.json({
  recommendations,
  count: recommendations.length,
  mandatory: recommendations.filter(r => r.priority === 'mandatory').length,
  recommended: recommendations.filter(r => r.priority === 'recommended').length,
  optional: recommendations.filter(r => r.priority === 'optional').length,
  totalControlsScope: recommendations.reduce((sum, r) => sum + r.controlCount, 0),
  });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// GET /api/maturity/tracker/trends — Get maturity trends from tracker service
router.get("/tracker/trends", authenticate, requirePermission("maturity.assessment.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const months = parseInt(req.query.months as string, 10) || 12;
  const trends = await getMaturityTrends(tenantId, months);
  res.json({ trends, count: trends.length });
}));

// GET /api/maturity/tracker/health — Generate health report from tracker service
router.get("/tracker/health", authenticate, requirePermission("maturity.assessment.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const report = await generateHealthReport(tenantId);
  res.json(report);
}));

// POST /api/maturity/tracker/check-threshold — Check if score is below threshold
router.post("/tracker/check-threshold", authenticate, requirePermission("maturity.assessment.read"), validate({ body: trackerCheckThresholdPostBody }), asyncHandler(async (req, res) => {
  const { score, threshold } = req.body;
  const belowThreshold = checkMaturityThreshold(score, threshold);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user.tenantId, userId: req.user!.userId!, module: 'assessments', event: 'created', entityType: 'maturity', entityId: '' } as any)), { tenantId: req.user.tenantId, operation: 'grcEvent:assessments.maturity.created' });
  res.json({ score, threshold, belowThreshold });
}));

// GET /api/maturity/registry-stats — Live regulatory registry statistics
router.get("/registry-stats", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("maturity.assessment.read"), async (_req: Request, res: Response) => {
  try {
    const [regs, insts, controls, sectors, mappings] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM regulators WHERE active = true`),
      query(`SELECT COUNT(*)::int AS count FROM instruments WHERE status = 'active'`),
      query(`SELECT COUNT(*)::int AS count FROM instrument_structure WHERE level >= 2`),
      query(`SELECT COUNT(*)::int AS count FROM sectors`),
      query(`SELECT COUNT(*)::int AS count FROM cross_mappings`),
    ]);

    res.json({
      regulators: getFirstRow(regs)?.count || 0,
      instruments: getFirstRow(insts)?.count || 0,
      controls: getFirstRow(controls)?.count || 0,
      sectors: getFirstRow(sectors)?.count || 0,
      crossMappings: getFirstRow(mappings)?.count || 0,
      message: 'Live regulatory registry — intelligence engine queries these tables for framework recommendations',
    });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// ============================================
// Feature 50: Governance Maturity Auto-Assessment
// ============================================

// POST /api/maturity/auto-assess — Trigger auto-assessment from platform data
router.post("/auto-assess", authenticate, requirePermission("maturity.assessment.read"), validate({ body: autoAssessPostBody }), asyncHandler(async (req, res) => {
  try {
  const tenantId = req.user.tenantId;
  const frameworkCode = req.body.frameworkCode as string | undefined;

  const result = await autoAssessMaturity(tenantId, frameworkCode);
  
  setAuditData(res as any, { 
  action: "create", 
  entityType: "maturity_auto_assessment", 
  entityId: result.assessmentId || "any",
  afterState: { level: result.level, aggregate: result.aggregate }
  });
  
  swallow(EC.EVENT_BUS, emitEvent(({ 
    tenantId, 
    userId: req.user!.userId!, 
    module: 'maturity', 
    event: 'auto_assessed', 
    entityType: 'maturity_assessment', 
    entityId: result.assessmentId || '' 
    } as any)), { tenantId: tenantId, operation: 'grcEvent:maturity.maturity_assessment.auto_assessed' });

  res.status(200).json(result);
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// GET /api/maturity/auto-assess/history — Get auto-assessment history
router.get("/auto-assess/history", authenticate, requirePermission("maturity.assessment.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const tenantId = req.user.tenantId;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  const history = await getAutoAssessmentHistory(tenantId, limit);
  res.json({ history, count: history.length });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

export default router;


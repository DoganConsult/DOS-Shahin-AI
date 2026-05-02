import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { validate, auditMiddleware } from '../ports/middleware.port';

const genericPayloadSchema = z.record(z.unknown());
// ============================================================================
// Policy Analysis + SoD + CAPA + CCM + Process Mining + Agent Governance Routes
// Functions 30-31, 35, 46, 48, 49-51, 53-55
// ============================================================================


import { authenticate, requirePermission } from '../ports/auth.port';
import { AuthenticatedRequest } from "@dos/types";

import { createCheckBody, createRulesBody, createCapaBody, updateCapaBody, createTransitionBody, createMonitorsBody, createExecuteBody, createExecuteAllBody, createEventsBody, createConformanceBody, createCheckPermissionBody, createGatesBody, createResolveBody, createSyncBody, createUploadBody, createLegalHoldBody } from '../schemas/policy.schemas';

const router = Router();
router.use(authenticate);
router.use(auditMiddleware("governance"));

// ── Policy Analysis (F30-31) ────────────────────────────────────────────────

router.get("/policy-conflicts", validate({ query: z.record(z.unknown()) }), requirePermission("policy.document.read"), async (req: Request, res: Response) => {
  try {
    const { detectConflicts } = await import("../services/policy/policy-analysis.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await detectConflicts(tenantId);
    res.json({ conflicts: result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/policy-redundancies", validate({ query: z.record(z.unknown()) }), requirePermission("policy.document.read"), async (req: Request, res: Response) => {
  try {
    const { detectRedundancies } = await import("../services/policy/policy-analysis.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await detectRedundancies(tenantId);
    res.json({ redundancies: result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/policy-analysis-report", validate({ query: z.record(z.unknown()) }), requirePermission("policy.document.read"), async (req: Request, res: Response) => {
  try {
    const { getAnalysisReport } = await import("../services/policy/policy-analysis.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await getAnalysisReport(tenantId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── SoD (F35) ───────────────────────────────────────────────────────────────

router.post("/sod/check", requirePermission("access.manage"), validate({ body: createCheckBody }), async (req: Request, res: Response) => {
  try {
    const { safeQuery: _sq1, tenantSchema: _ts1 } = await import('../../../config/database.js'); const _s1 = _ts1(req.tenantId!); const checkSoDViolation = async (_t: string, roleA: string, roleB: string) => { const r = await _sq1(`SELECT conflict_level FROM "${_s1}".sod_rules WHERE role_code_a=$1 AND role_code_b=$2 AND is_active=TRUE LIMIT 1`, [roleA, roleB]); return r.rows[0] ? { violation: true, level: r.rows[0].conflict_level } : { violation: false }; };
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const { userId, roleToAssign } = req.body;
    const result = await checkSoDViolation(tenantId, userId, roleToAssign);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/sod/matrix", validate({ query: z.record(z.unknown()) }), requirePermission("access.read"), async (req: Request, res: Response) => {
  try {
    const { safeQuery: _sq2, tenantSchema: _ts2 } = await import('../../../config/database.js'); const _s2 = _ts2(req.tenantId!); const getSoDMatrix = async (_t: string) => (await _sq2(`SELECT role_code_a, role_code_b, conflict_level, description FROM "${_s2}".sod_rules WHERE is_active=TRUE ORDER BY role_code_a`)).rows;
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await getSoDMatrix(tenantId);
    res.json({ matrix: result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/sod/rules", requirePermission("access.manage"), validate({ body: createRulesBody }), async (req: Request, res: Response) => {
  try {
    const { safeQuery: _sq3, tenantSchema: _ts3 } = await import('../../../config/database.js'); const _s3 = _ts3(req.tenantId!); const createSoDRule = async (_t: string, rule: any) => (await _sq3(`INSERT INTO "${_s3}".sod_rules (role_code_a, role_code_b, module_code, conflict_level, scope_rule, is_active) VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING *`, [rule.roleA, rule.roleB, rule.module, rule.level, rule.scope || "same_entity"])).rows[0];
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await createSoDRule(tenantId, req.body);
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/sod/report", validate({ query: z.record(z.unknown()) }), requirePermission("access.read"), async (req: Request, res: Response) => {
  try {
    const { safeQuery: _sq4, tenantSchema: _ts4 } = await import('../../../config/database.js'); const _s4 = _ts4(req.tenantId!); const generateSoDReport = async (_t: string) => (await _sq4(`SELECT * FROM "${_s4}".sod_rules WHERE is_active=TRUE ORDER BY role_code_a`)).rows;
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await generateSoDReport(tenantId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── CAPA (F46) ──────────────────────────────────────────────────────────────

router.get("/capa", validate({ query: z.record(z.unknown()) }), requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const { listCAPAs } = await import("../../incident/services/misc/capa.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const filters = {
      status: req.query.status as string | undefined,
      capaType: req.query.type as string | undefined,
      priority: req.query.priority as string | undefined,
    };
    const result = await listCAPAs(tenantId, filters as Record<string, unknown>);
    res.json({ capas: result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/capa", requirePermission("compliance.program.manage"), validate({ body: createCapaBody }), async (req: Request, res: Response) => {
  try {
    const { createCAPA } = await import("../../incident/services/misc/capa.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await createCAPA(tenantId, req.body);
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/capa/dashboard", validate({ query: z.record(z.unknown()) }), requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const { getCAPADashboard } = await import("../../incident/services/misc/capa.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await getCAPADashboard(tenantId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/capa/:capaId", validate({ query: z.record(z.unknown()) }), requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const { getCAPA } = await import("../../incident/services/misc/capa.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await getCAPA(tenantId, req.params.capaId);
    if (!result) { res.status(404).json({ error: "CAPA not found" }); return; }
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.put("/capa/:capaId", requirePermission("compliance.program.manage"), validate({ body: updateCapaBody }), async (req: Request, res: Response) => {
  try {
    const { updateCAPA } = await import("../../incident/services/misc/capa.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await updateCAPA(tenantId, req.params.capaId, req.body);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/capa/:capaId/transition", requirePermission("compliance.program.manage"), validate({ body: createTransitionBody }), async (req: Request, res: Response) => {
  try {
    const { transitionStatus } = await import("../../incident/services/misc/capa.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const { newStatus, reason } = req.body;
    const result = await transitionStatus(tenantId, req.params.capaId, newStatus, reason, (req as AuthenticatedRequest).userId!);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── CCM (F48) ───────────────────────────────────────────────────────────────

router.get("/ccm/monitors", validate({ query: z.record(z.unknown()) }), requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const { listMonitors } = await import("../../compliance/services/ccm/ccm.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await listMonitors(tenantId, req.query as Record<string, string | undefined>);
    res.json({ monitors: result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/ccm/monitors", requirePermission("compliance.program.manage"), validate({ body: createMonitorsBody }), async (req: Request, res: Response) => {
  try {
    const { createMonitor } = await import("../../compliance/services/ccm/ccm.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await createMonitor(tenantId, req.body);
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/ccm/monitors/:monitorId/execute", requirePermission("compliance.program.manage"), validate({ body: createExecuteBody }), async (req: Request, res: Response) => {
  try {
    const { executeMonitor } = await import("../../compliance/services/ccm/ccm.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await executeMonitor(tenantId, req.params.monitorId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/ccm/execute-all", requirePermission("compliance.program.manage"), validate({ body: createExecuteAllBody }), async (req: Request, res: Response) => {
  try {
    const { executeAllDueMonitors } = await import("../../compliance/services/ccm/ccm.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await executeAllDueMonitors(tenantId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/ccm/dashboard", validate({ query: z.record(z.unknown()) }), requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const { getCCMDashboard } = await import("../../compliance/services/ccm/ccm.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await getCCMDashboard(tenantId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Process Mining (F49-51) ─────────────────────────────────────────────────

router.post("/process/events", requirePermission("governance.record.manage"), validate({ body: createEventsBody }), async (req: Request, res: Response) => {
  try {

    const { recordProcessEvent } = await import("../../platform/services/misc/process-mining.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await recordProcessEvent(tenantId, req.body);
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/process/log/:caseType", validate({ query: z.record(z.unknown()) }), requirePermission("governance.record.read"), async (req: Request, res: Response) => {
  try {

    const { getProcessLog } = await import("../../platform/services/misc/process-mining.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await getProcessLog(tenantId, req.params.caseType, req.query as Record<string, string | undefined>);
    res.json({ events: result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/process/conformance", requirePermission("governance.record.manage"), validate({ body: createConformanceBody }), async (req: Request, res: Response) => {
  try {

    const { analyzeConformance } = await import("../../platform/services/misc/process-mining.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const { processName, referenceModel } = req.body;
    const result = await analyzeConformance(tenantId, processName, referenceModel);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/process/bottlenecks/:caseType", validate({ query: z.record(z.unknown()) }), requirePermission("governance.record.read"), async (req: Request, res: Response) => {
  try {

    const { getBottleneckAnalysis } = await import("../../platform/services/misc/process-mining.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const periodDays = parseInt(req.query.days as string) || 90;
    const result = await getBottleneckAnalysis(tenantId, req.params.caseType, periodDays);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Agent Governance (F53-55) ───────────────────────────────────────────────

router.get("/agents/:agentId/permissions", validate({ query: z.record(z.unknown()) }), requirePermission("agent.read"), async (req: Request, res: Response) => {
  try {
    const { getAgentPermissions } = await import('../../ai/services/governance/agent-governance.service.js');
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await getAgentPermissions(tenantId, req.params.agentId);
    res.json({ permissions: result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/agents/:agentId/check-permission", requirePermission("agent.read"), validate({ body: createCheckPermissionBody }), async (req: Request, res: Response) => {
  try {
    const { checkToolPermission } = await import('../../ai/services/governance/agent-governance.service.js');
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const { toolName, action } = req.body;
    const result = await checkToolPermission(tenantId, req.params.agentId, toolName, action);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/hitl/gates", validate({ query: z.record(z.unknown()) }), requirePermission("agent.read"), async (req: Request, res: Response) => {
  try {
    const { getActiveGates } = await import('../../ai/services/governance/agent-governance.service.js');
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const agentId = req.query.agentId as string;
    const result = await getActiveGates(tenantId, agentId);
    res.json({ gates: result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/hitl/gates", requirePermission("agent.manage"), validate({ body: createGatesBody }), async (req: Request, res: Response) => {
  try {
    const { createHITLGate } = await import('../../ai/services/governance/agent-governance.service.js');
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await createHITLGate(tenantId, req.body);
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/hitl/gates/:gateId/resolve", requirePermission("agent.manage"), validate({ body: createResolveBody }), async (req: Request, res: Response) => {
  try {
    const { resolveHITLGate } = await import('../../ai/services/governance/agent-governance.service.js');
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const { decision, reason } = req.body;
    const result = await resolveHITLGate(tenantId, req.params.gateId, decision, (req as AuthenticatedRequest).userId!, reason);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/agents/:agentId/audit-trail", validate({ query: z.record(z.unknown()) }), requirePermission("agent.read"), async (req: Request, res: Response) => {
  try {
    const { getAgentAuditTrail } = await import('../../ai/services/governance/agent-governance.service.js');
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await getAgentAuditTrail(tenantId, req.params.agentId, limit);
    res.json({ trail: result });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Governance Graph (F13-14) ───────────────────────────────────────────────

router.post("/graph/sync", requirePermission("governance.record.manage"), validate({ body: createSyncBody }), async (req: Request, res: Response) => {
  try {
    const { syncGovernanceGraph } = await import("../../governance/services/governance/governance-graph.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await syncGovernanceGraph(tenantId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/graph/entity/:entityType/:entityId", validate({ query: z.record(z.unknown()) }), requirePermission("governance.record.read"), async (req: Request, res: Response) => {
  try {
    const { getEntityGraph } = await import("../../governance/services/governance/governance-graph.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const depth = parseInt(req.query.depth as string) || 2;

    const result = await getEntityGraph(tenantId, (req as any).params.entityType as string, req.params.entityId, depth);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/graph/stats", validate({ query: z.record(z.unknown()) }), requirePermission("governance.record.read"), async (req: Request, res: Response) => {
  try {
    const { getGraphStats } = await import("../../governance/services/governance/governance-graph.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await getGraphStats(tenantId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Executive Narrative (F60) ───────────────────────────────────────────────

router.get("/narrative/board-pack", validate({ query: z.record(z.unknown()) }), requirePermission("governance.record.read"), async (req: Request, res: Response) => {
  try {
    const { generateBoardPack } = await import("../../analytics/services/misc/executive-narrative.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await generateBoardPack(tenantId, req.query as Record<string, string | undefined>);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/narrative/compliance/:frameworkId", validate({ query: z.record(z.unknown()) }), requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const { generateComplianceNarrative } = await import("../../analytics/services/misc/executive-narrative.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await generateComplianceNarrative(tenantId, req.params.frameworkId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Evidence Vault (F15-18) ─────────────────────────────────────────────────

router.post("/vault/upload/:evidenceId", requirePermission("evidence.manage"), validate({ body: createUploadBody }), async (req: Request, res: Response) => {
  try {
    const { uploadEvidence } = await import("../../evidence/services/collection/evidence-vault.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const { fileBuffer, fileName, metadata } = req.body;
    const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer, "base64");
    const result = await uploadEvidence(tenantId, req.params.evidenceId, buffer, fileName, metadata);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/vault/:evidenceId/legal-hold", requirePermission("evidence.manage"), validate({ body: createLegalHoldBody }), async (req: Request, res: Response) => {
  try {
    const { placeLegalHold } = await import("../../evidence/services/collection/evidence-vault.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const { reason, holdUntil } = req.body;
    const result = await placeLegalHold(tenantId, req.params.evidenceId, reason, holdUntil, (req as AuthenticatedRequest).userId!);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/vault/:evidenceId/integrity", validate({ query: z.record(z.unknown()) }), requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
    const { verifyEvidenceIntegrity } = await import("../../evidence/services/collection/evidence-vault.service.js");
    const tenantId = (req as AuthenticatedRequest).tenantId! || "default";
    const result = await verifyEvidenceIntegrity(tenantId, req.params.evidenceId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;


import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — KPI Detail Routes
// Full CRUD + Timeline + Hub integration for 8 dashboard KPI cards.
// GET    /api/kpi/:key/detail         — summary stats, data items, timeline, hubs
// POST   /api/kpi/:key/items          — create new item
// PUT    /api/kpi/:key/items/:itemId  — update item
// DELETE /api/kpi/:key/items/:itemId  — delete item
// PUT    /api/kpi/:key/items/:itemId/status — quick status update
// ============================================


import { authenticate } from '../ports/auth.port';
import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import crypto from "crypto";
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { enforceStatusTransition } from '../ports/platform.port';
import { getFirstRow } from '@dos/db';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createKeyItemsBody, updateKeyItemsitemIdBody, updateKeyItemsitemIdStatusBody } from "../schemas/analytics.schemas";

const router = Router();
router.use(moduleStack('analytics'));
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));

// ── KPI key config ──
interface KpiConfig {
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  icon: string;
  module: string;
  table: string;
  idCol: string;
  entityType: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  hubs: { route: string; labelEn: string; labelAr: string; icon: string }[];
  formFields: { key: string; labelEn: string; labelAr: string; type: string; required: boolean; options?: { label: string; value: string }[] }[];
  statusOptions: { label: string; labelAr: string; value: string }[];
}

const KPI_CONFIGS: Record<string, KpiConfig> = {
  "compliance-score": {
    titleEn: "Compliance Score", titleAr: "درجة الالتزام",
    subtitleEn: "Framework compliance posture and score breakdown",
    subtitleAr: "وضع الامتثال للأطر وتحليل الدرجات",
    icon: "verified", module: "compliance", table: "frameworks", idCol: "framework_id", entityType: "framework",
    canCreate: true, canEdit: true, canDelete: true,
    hubs: [
      { route: "/compliance", labelEn: "Compliance", labelAr: "الامتثال", icon: "check-circle" },
      { route: "/framework-hub", labelEn: "Framework Hub", labelAr: "مركز الأطر", icon: "th-large" },
      { route: "/analytics-hub", labelEn: "Analytics Hub", labelAr: "مركز التحليلات", icon: "chart-bar" },
      { route: "/reports-hub", labelEn: "Reports Hub", labelAr: "مركز التقارير", icon: "file" },
      { route: "/intelligence-hub", labelEn: "Intelligence Hub", labelAr: "مركز الذكاء", icon: "lightbulb" },
    ],
    formFields: [
      { key: "name", labelEn: "Framework Name", labelAr: "اسم الإطار", type: "text", required: true },
      { key: "category", labelEn: "Category", labelAr: "الفئة", type: "dropdown", required: false, options: [{ label: "Security", value: "security" }, { label: "Privacy", value: "privacy" }, { label: "Governance", value: "governance" }, { label: "Risk", value: "risk" }] },
      { key: "status", labelEn: "Status", labelAr: "الحالة", type: "dropdown", required: true, options: [{ label: "Active", value: "active" }, { label: "Draft", value: "draft" }, { label: "Archived", value: "archived" }] },
    ],
    statusOptions: [{ label: "Active", labelAr: "نشط", value: "active" }, { label: "Draft", labelAr: "مسودة", value: "draft" }, { label: "Archived", labelAr: "مؤرشف", value: "archived" }],
  },
  "high-risks": {
    titleEn: "High Risks", titleAr: "المخاطر العالية",
    subtitleEn: "Critical and high-severity risk items requiring attention",
    subtitleAr: "عناصر المخاطر الحرجة والعالية التي تتطلب الاهتمام",
    icon: "exclamation-triangle", module: "risk", table: "risks", idCol: "risk_id", entityType: "risk",
    canCreate: true, canEdit: true, canDelete: true,
    hubs: [
      { route: "/risk-hub", labelEn: "Risk Hub", labelAr: "مركز المخاطر", icon: "exclamation-triangle" },
      { route: "/compliance", labelEn: "Compliance", labelAr: "الامتثال", icon: "check-circle" },
      { route: "/incident-hub", labelEn: "Incident Hub", labelAr: "مركز الحوادث", icon: "bolt" },
      { route: "/analytics-hub", labelEn: "Analytics Hub", labelAr: "مركز التحليلات", icon: "chart-bar" },
      { route: "/advanced-hub", labelEn: "Advanced Hub", labelAr: "المركز المتقدم", icon: "cog" },
    ],
    formFields: [
      { key: "title", labelEn: "Risk Title", labelAr: "عنوان الخطر", type: "text", required: true },
      { key: "description", labelEn: "Description", labelAr: "الوصف", type: "textarea", required: false },
      { key: "category", labelEn: "Category", labelAr: "الفئة", type: "dropdown", required: true, options: [{ label: "Operational", value: "operational" }, { label: "Strategic", value: "strategic" }, { label: "Compliance", value: "compliance" }, { label: "Financial", value: "financial" }, { label: "Cyber", value: "cyber" }] },
      { key: "likelihood", labelEn: "Likelihood (1-5)", labelAr: "الاحتمالية (1-5)", type: "number", required: true },
      { key: "impact", labelEn: "Impact (1-5)", labelAr: "الأثر (1-5)", type: "number", required: true },
      { key: "owner", labelEn: "Owner", labelAr: "المسؤول", type: "text", required: false },
      { key: "status", labelEn: "Status", labelAr: "الحالة", type: "dropdown", required: true, options: [{ label: "Identified", value: "identified" }, { label: "Assessed", value: "assessed" }, { label: "Mitigated", value: "mitigated" }, { label: "Accepted", value: "accepted" }] },
    ],
    statusOptions: [{ label: "Identified", labelAr: "محدد", value: "identified" }, { label: "Assessed", labelAr: "مُقيّم", value: "assessed" }, { label: "Mitigated", labelAr: "مخفف", value: "mitigated" }, { label: "Accepted", labelAr: "مقبول", value: "accepted" }, { label: "Closed", labelAr: "مغلق", value: "closed" }],
  },
  "overdue-tasks": {
    titleEn: "Overdue Tasks", titleAr: "المهام المتأخرة",
    subtitleEn: "Tasks past their due date requiring immediate action",
    subtitleAr: "المهام المتجاوزة لموعدها والتي تتطلب إجراء فوري",
    icon: "clock", module: "task", table: "remediation_tasks", idCol: "task_id", entityType: "task",
    canCreate: true, canEdit: true, canDelete: true,
    hubs: [
      { route: "/operations-hub", labelEn: "Operations Hub", labelAr: "مركز العمليات", icon: "cog" },
      { route: "/workflow-hub", labelEn: "Workflow Hub", labelAr: "مركز سير العمل", icon: "sitemap" },
      { route: "/automation-hub", labelEn: "Automation Hub", labelAr: "مركز الأتمتة", icon: "bolt" },
      { route: "/compliance", labelEn: "Compliance", labelAr: "الامتثال", icon: "check-circle" },
      { route: "/team-hub", labelEn: "Team Hub", labelAr: "مركز الفريق", icon: "users" },
    ],
    formFields: [
      { key: "title", labelEn: "Task Title", labelAr: "عنوان المهمة", type: "text", required: true },
      { key: "description", labelEn: "Description", labelAr: "الوصف", type: "textarea", required: false },
      { key: "priority", labelEn: "Priority", labelAr: "الأولوية", type: "dropdown", required: true, options: [{ label: "Critical", value: "critical" }, { label: "High", value: "high" }, { label: "Medium", value: "medium" }, { label: "Low", value: "low" }] },
      { key: "due_date", labelEn: "Due Date", labelAr: "تاريخ الاستحقاق", type: "date", required: true },
      { key: "assigned_to", labelEn: "Assigned To", labelAr: "مُسند إلى", type: "text", required: false },
      { key: "status", labelEn: "Status", labelAr: "الحالة", type: "dropdown", required: true, options: [{ label: "Pending", value: "pending" }, { label: "In Progress", value: "in_progress" }, { label: "Completed", value: "completed" }] },
    ],
    statusOptions: [{ label: "Pending", labelAr: "معلّق", value: "pending" }, { label: "In Progress", labelAr: "قيد التنفيذ", value: "in_progress" }, { label: "Completed", labelAr: "مكتمل", value: "completed" }, { label: "Closed", labelAr: "مغلق", value: "closed" }],
  },
  "open-findings": {
    titleEn: "Open Findings", titleAr: "الملاحظات المفتوحة",
    subtitleEn: "Audit findings awaiting remediation",
    subtitleAr: "ملاحظات التدقيق في انتظار المعالجة",
    icon: "search", module: "audit", table: "audit_findings", idCol: "finding_id", entityType: "finding",
    canCreate: true, canEdit: true, canDelete: false,
    hubs: [
      { route: "/audit-hub", labelEn: "Audit Hub", labelAr: "مركز التدقيق", icon: "search" },
      { route: "/compliance", labelEn: "Compliance", labelAr: "الامتثال", icon: "check-circle" },
      { route: "/reports-hub", labelEn: "Reports Hub", labelAr: "مركز التقارير", icon: "file" },
      { route: "/risk-hub", labelEn: "Risk Hub", labelAr: "مركز المخاطر", icon: "exclamation-triangle" },
      { route: "/operations-hub", labelEn: "Operations Hub", labelAr: "مركز العمليات", icon: "cog" },
    ],
    formFields: [
      { key: "title", labelEn: "Finding Title", labelAr: "عنوان الملاحظة", type: "text", required: true },
      { key: "severity", labelEn: "Severity", labelAr: "الخطورة", type: "dropdown", required: true, options: [{ label: "Critical", value: "critical" }, { label: "High", value: "high" }, { label: "Medium", value: "medium" }, { label: "Low", value: "low" }] },
      { key: "status", labelEn: "Status", labelAr: "الحالة", type: "dropdown", required: true, options: [{ label: "Open", value: "open" }, { label: "In Progress", value: "in_progress" }, { label: "Resolved", value: "resolved" }] },
    ],
    statusOptions: [{ label: "Open", labelAr: "مفتوحة", value: "open" }, { label: "In Progress", labelAr: "قيد المعالجة", value: "in_progress" }, { label: "Resolved", labelAr: "محلولة", value: "resolved" }, { label: "Closed", labelAr: "مغلقة", value: "closed" }],
  },
  "evidence-status": {
    titleEn: "Evidence Status", titleAr: "حالة الأدلة",
    subtitleEn: "Evidence freshness and collection status",
    subtitleAr: "حالة حداثة الأدلة وجمعها",
    icon: "folder-open", module: "evidence", table: "evidence", idCol: "evidence_id", entityType: "evidence",
    canCreate: true, canEdit: true, canDelete: true,
    hubs: [
      { route: "/evidence-hub", labelEn: "Evidence Hub", labelAr: "مركز الأدلة", icon: "folder-open" },
      { route: "/compliance", labelEn: "Compliance", labelAr: "الامتثال", icon: "check-circle" },
      { route: "/audit-hub", labelEn: "Audit Hub", labelAr: "مركز التدقيق", icon: "search" },
      { route: "/connector-hub", labelEn: "Connector Hub", labelAr: "مركز الربط", icon: "link" },
      { route: "/automation-hub", labelEn: "Automation Hub", labelAr: "مركز الأتمتة", icon: "bolt" },
    ],
    formFields: [
      { key: "file_name", labelEn: "Evidence Name", labelAr: "اسم الدليل", type: "text", required: true },
      { key: "control_id", labelEn: "Control ID", labelAr: "معرّف الضابط", type: "text", required: false },
    ],
    statusOptions: [{ label: "Current", labelAr: "حالي", value: "current" }, { label: "Stale", labelAr: "منتهي", value: "stale" }],
  },
  "audit-readiness": {
    titleEn: "Audit Readiness", titleAr: "جاهزية التدقيق",
    subtitleEn: "Readiness posture for upcoming audits",
    subtitleAr: "وضع الجاهزية للتدقيقات القادمة",
    icon: "check-square", module: "audit", table: "controls", idCol: "control_id", entityType: "control",
    canCreate: true, canEdit: true, canDelete: false,
    hubs: [
      { route: "/audit-hub", labelEn: "Audit Hub", labelAr: "مركز التدقيق", icon: "search" },
      { route: "/compliance", labelEn: "Compliance", labelAr: "الامتثال", icon: "check-circle" },
      { route: "/evidence-hub", labelEn: "Evidence Hub", labelAr: "مركز الأدلة", icon: "folder-open" },
      { route: "/reports-hub", labelEn: "Reports Hub", labelAr: "مركز التقارير", icon: "file" },
      { route: "/knowledge-hub", labelEn: "Knowledge Hub", labelAr: "مركز المعرفة", icon: "book" },
    ],
    formFields: [
      { key: "title", labelEn: "Control Title", labelAr: "عنوان الضابط", type: "text", required: true },
      { key: "description", labelEn: "Description", labelAr: "الوصف", type: "textarea", required: false },
      { key: "status", labelEn: "Status", labelAr: "الحالة", type: "dropdown", required: true, options: [{ label: "Implemented", value: "implemented" }, { label: "In Progress", value: "in_progress" }, { label: "Not Started", value: "not_started" }] },
      { key: "test_status", labelEn: "Test Status", labelAr: "حالة الاختبار", type: "dropdown", required: false, options: [{ label: "Pass", value: "pass" }, { label: "Fail", value: "fail" }, { label: "Not Tested", value: "not_tested" }] },
    ],
    statusOptions: [{ label: "Implemented", labelAr: "مطبق", value: "implemented" }, { label: "In Progress", labelAr: "قيد التنفيذ", value: "in_progress" }, { label: "Not Started", labelAr: "غير مبدوء", value: "not_started" }],
  },
  "controls-coverage": {
    titleEn: "Controls Coverage", titleAr: "تغطية الضوابط",
    subtitleEn: "Control implementation and testing coverage",
    subtitleAr: "تغطية تطبيق واختبار الضوابط",
    icon: "shield", module: "control", table: "controls", idCol: "control_id", entityType: "control",
    canCreate: true, canEdit: true, canDelete: true,
    hubs: [
      { route: "/compliance", labelEn: "Compliance", labelAr: "الامتثال", icon: "check-circle" },
      { route: "/framework-hub", labelEn: "Framework Hub", labelAr: "مركز الأطر", icon: "th-large" },
      { route: "/evidence-hub", labelEn: "Evidence Hub", labelAr: "مركز الأدلة", icon: "folder-open" },
      { route: "/ai-hub", labelEn: "AI Hub", labelAr: "مركز الذكاء الاصطناعي", icon: "microchip-ai" },
      { route: "/automation-hub", labelEn: "Automation Hub", labelAr: "مركز الأتمتة", icon: "bolt" },
    ],
    formFields: [
      { key: "title", labelEn: "Control Title", labelAr: "عنوان الضابط", type: "text", required: true },
      { key: "description", labelEn: "Description", labelAr: "الوصف", type: "textarea", required: false },
      { key: "status", labelEn: "Status", labelAr: "الحالة", type: "dropdown", required: true, options: [{ label: "Implemented", value: "implemented" }, { label: "In Progress", value: "in_progress" }, { label: "Not Started", value: "not_started" }] },
      { key: "owner_id", labelEn: "Owner", labelAr: "المسؤول", type: "text", required: false },
    ],
    statusOptions: [{ label: "Implemented", labelAr: "مطبق", value: "implemented" }, { label: "In Progress", labelAr: "قيد التنفيذ", value: "in_progress" }, { label: "Not Started", labelAr: "غير مبدوء", value: "not_started" }],
  },
  "policy-adoption": {
    titleEn: "Policy Adoption", titleAr: "اعتماد السياسات",
    subtitleEn: "Policy approval and adoption status",
    subtitleAr: "حالة اعتماد وتبني السياسات",
    icon: "file", module: "policy", table: "policies", idCol: "policy_id", entityType: "policy",
    canCreate: true, canEdit: true, canDelete: true,
    hubs: [
      { route: "/governance-hub", labelEn: "Governance Hub", labelAr: "مركز الحوكمة", icon: "sitemap" },
      { route: "/compliance", labelEn: "Compliance", labelAr: "الامتثال", icon: "check-circle" },
      { route: "/workflow-hub", labelEn: "Workflow Hub", labelAr: "مركز سير العمل", icon: "share-alt" },
      { route: "/privacy-hub", labelEn: "Privacy Hub", labelAr: "مركز الخصوصية", icon: "lock" },
      { route: "/reports-hub", labelEn: "Reports Hub", labelAr: "مركز التقارير", icon: "file" },
    ],
    formFields: [
      { key: "title", labelEn: "Policy Title", labelAr: "عنوان السياسة", type: "text", required: true },
      { key: "description", labelEn: "Description", labelAr: "الوصف", type: "textarea", required: false },
      { key: "status", labelEn: "Status", labelAr: "الحالة", type: "dropdown", required: true, options: [{ label: "Draft", value: "draft" }, { label: "Review", value: "review" }, { label: "Approved", value: "approved" }, { label: "Published", value: "published" }] },
    ],
    statusOptions: [{ label: "Draft", labelAr: "مسودة", value: "draft" }, { label: "Review", labelAr: "مراجعة", value: "review" }, { label: "Approved", labelAr: "معتمدة", value: "approved" }, { label: "Published", labelAr: "منشورة", value: "published" }],
  },
};

// ── Audit trail helper ──
async function logAudit(schema: string, userId: string, module: string, action: string, entityType: string, entityId: string): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO "${schema}".audit_trail (entry_id, timestamp, user_id, module, action, entity_type, entity_id)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6)`,
      [crypto.randomUUID(), userId, module, action, entityType, entityId]
    );
  } catch { /* non-fatal */ }
}

// ── GET /api/kpi/:key/detail ──
router.get("/:key/detail", validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  const key = req.params.key;
  const config = KPI_CONFIGS[key];
  if (!config) { res.status(404).json({ error: `Unknown KPI key: ${key}` }); return; }

  const tenantId = req.user!.tenantId!;
  const schema = tenantSchema(tenantId);

  const [kpiValue, stats, items, timeline] = await Promise.all([
    getKpiValue(schema, key),
    getKpiStats(schema, key),
    getKpiItems(schema, key),
    getKpiTimeline(schema, config.module),
  ]);

  res.json({ key, config, kpiValue, stats, items, timeline });
});

// ── POST /api/kpi/:key/items — Create ──
router.post("/:key/items", authenticate, validate({ body: createKeyItemsBody }), async (req: Request, res: Response) => {
  const key = req.params.key;
  const config = KPI_CONFIGS[key];
  if (!config) { res.status(404).json({ error: `Unknown KPI key: ${key}` }); return; }
  if (!config.canCreate) { res.status(403).json({ error: "Create not allowed for this KPI" }); return; }

  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;
  const schema = tenantSchema(tenantId);
  const body = req.body;
  const newId = crypto.randomUUID();

  await createItem(schema, key, config, newId, body);
  await logAudit(schema, userId, config.module, "create", config.entityType, newId);

  setAuditData(res as any, { action: "create", entityType: "kpi", entityId: newId, afterState: { key, id: newId, ...body } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user!.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'kpi_detail', entityId: req.params.id || '' } as any)), { tenantId: req.user!.tenantId!, operation: 'grcEvent:governance.kpi_detail.created' });
  res.status(201).json({ success: true, id: newId });
});

// ── PUT /api/kpi/:key/items/:itemId — Update ──
router.put("/:key/items/:itemId", authenticate, validate({ body: updateKeyItemsitemIdBody }), async (req: Request, res: Response) => {
  const key = req.params.key;
  const itemId = req.params.itemId;
  const config = KPI_CONFIGS[key];
  if (!config) { res.status(404).json({ error: `Unknown KPI key: ${key}` }); return; }
  if (!config.canEdit) { res.status(403).json({ error: "Edit not allowed for this KPI" }); return; }

  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;
  const schema = tenantSchema(tenantId);

  await updateItem(schema, key, config, itemId, req.body);
  await logAudit(schema, userId, config.module, "update", config.entityType, itemId);

  setAuditData(res as any, { action: "update", entityType: "kpi", entityId: itemId, afterState: { key, ...req.body } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user!.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'kpi_detail', entityId: req.params.id || '' } as any)), { tenantId: req.user!.tenantId!, operation: 'grcEvent:governance.kpi_detail.updated' });
  res.json({ success: true });
});

// ── PUT /api/kpi/:key/items/:itemId/status — Quick status update ──
router.put("/:key/items/:itemId/status", authenticate, validate({ body: updateKeyItemsitemIdStatusBody }), async (req: Request, res: Response) => {
  const key = req.params.key;
  const itemId = req.params.itemId;
  const config = KPI_CONFIGS[key];
  if (!config) { res.status(404).json({ error: `Unknown KPI key: ${key}` }); return; }

  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;
  const schema = tenantSchema(tenantId);
  const { status } = req.body;

  const enforcement = await enforceStatusTransition(tenantId, {
    moduleCode: config.module, table: config.table, idColumn: config.idCol,
    entityId: itemId, toStatus: status, actorUserId: userId,
  });
  if (enforcement.blocked) { res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return; }
  if (!enforcement.success) {
    await safeQuery(`UPDATE "${schema}"."${config.table}" SET status = $1 WHERE "${config.idCol}" = $2`, [status, itemId]);
  }
  await logAudit(schema, userId, config.module, "status_change", config.entityType, itemId);

  setAuditData(res as any, { action: "update", entityType: "kpi", entityId: itemId, afterState: { key, status } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user!.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'kpi_detail', entityId: req.params.id || '' } as any)), { tenantId: req.user!.tenantId!, operation: 'grcEvent:governance.kpi_detail.updated' });
  res.json({ success: true });
});

// ── DELETE /api/kpi/:key/items/:itemId — Delete ──
router.delete("/:key/items/:itemId", validate({ body: genericPayloadSchema }), authenticate, async (req: Request, res: Response) => {
  const key = req.params.key;
  const itemId = req.params.itemId;
  const config = KPI_CONFIGS[key];
  if (!config) { res.status(404).json({ error: `Unknown KPI key: ${key}` }); return; }
  if (!config.canDelete) { res.status(403).json({ error: "Delete not allowed for this KPI" }); return; }

  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;
  const schema = tenantSchema(tenantId);

  await safeQuery(`DELETE FROM "${schema}"."${config.table}" WHERE "${config.idCol}" = $1`, [itemId]);
  await logAudit(schema, userId, config.module, "delete", config.entityType, itemId);

  setAuditData(res as any, { action: "delete", entityType: "kpi", entityId: itemId });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user!.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'kpi_detail', entityId: req.params.id || '' } as any)), { tenantId: req.user!.tenantId!, operation: 'grcEvent:governance.kpi_detail.deleted' });
  res.json({ success: true });
});

// ── Create helper (per-table INSERT) ──
async function createItem(schema: string, key: string, config: KpiConfig, id: string, body: Record<string, unknown>): Promise<void> {
  switch (key) {
    case "compliance-score":
      await safeQuery(`INSERT INTO "${schema}".frameworks (framework_id, name, category, status, completion_percent, created_at) VALUES ($1,$2,$3,$4,0,NOW())`, [id, body.name, body.category || null, body.status || "draft"]);
      break;
    case "high-risks":
      {
        const likelihood = Number(body.likelihood ?? 3);
        const impact = Number(body.impact ?? 3);
      await safeQuery(`INSERT INTO "${schema}".risks (risk_id, title, description, category, likelihood, impact, risk_score, owner, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,

        [id, body.title, body.description || "", body.category || "operational", likelihood, impact, likelihood * impact, body.owner || null, body.status || "identified"]);
      }
      break;
    case "overdue-tasks":
      await safeQuery(`INSERT INTO "${schema}".remediation_tasks (task_id, title, description, priority, due_date, assigned_to, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [id, body.title, body.description || "", body.priority || "medium", body.due_date || null, body.assigned_to || null, body.status || "pending"]);
      break;
    case "open-findings":
      await safeQuery(`INSERT INTO "${schema}".audit_findings (finding_id, title, severity, status, created_at) VALUES ($1,$2,$3,$4,NOW())`,
        [id, body.title, body.severity || "medium", body.status || "open"]);
      break;
    case "evidence-status":
      await safeQuery(`INSERT INTO "${schema}".evidence (evidence_id, control_id, file_name, collected_at, created_at) VALUES ($1,$2,$3,NOW(),NOW())`,
        [id, body.control_id || null, body.file_name || "New Evidence"]);
      break;
    case "audit-readiness":
    case "controls-coverage":
      await safeQuery(`INSERT INTO "${schema}".controls (control_id, title, description, status, test_status, owner_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [id, body.title, body.description || "", body.status || "not_started", body.test_status || null, body.owner_id || null]);
      break;
    case "policy-adoption":
      await safeQuery(`INSERT INTO "${schema}".policies (policy_id, title, description, status, version, created_at) VALUES ($1,$2,$3,$4,1,NOW())`,
        [id, body.title, body.description || "", body.status || "draft"]);
      break;
  }
}

// ── Update helper (per-table UPDATE) ──
async function updateItem(schema: string, key: string, config: KpiConfig, id: string, body: Record<string, unknown>): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;
  for (const [k, v] of Object.entries(body)) {
    if (k === "id") continue;
    sets.push(`"${k}" = $${idx}`);
    vals.push(v);
    idx++;
  }
  if (sets.length === 0) return;
  // recalculate risk_score if updating risk
  if (key === "high-risks" && (body.likelihood || body.impact)) {
    sets.push(`risk_score = COALESCE($${idx}::int, likelihood) * COALESCE($${idx + 1}::int, impact)`);
    vals.push(body.likelihood || null, body.impact || null);
    idx += 2;
  }
  vals.push(id);
  await safeQuery(`UPDATE "${schema}"."${config.table}" SET ${sets.join(", ")} WHERE "${config.idCol}" = $${idx}`, vals);
}

// ── KPI Value ──
async function getKpiValue(schema: string, key: string): Promise<{ value: string | number; trend: number; trendDirection: string }> {
  try {
    switch (key) {
      case "compliance-score": {
        const r = await safeQuery(`SELECT COALESCE(AVG(completion_percent), 0)::int AS val FROM "${schema}".frameworks`);
        return { value: (getFirstRow(r)?.val || 0) + "%", trend: 0, trendDirection: "flat" };
      }
      case "high-risks": {
        const r = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".risks WHERE risk_score >= 15`);
        return { value: getFirstRow(r)?.val || 0, trend: 0, trendDirection: "flat" };
      }
      case "overdue-tasks": {
        const r = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".remediation_tasks WHERE due_date < NOW() AND status NOT IN ('completed','closed')`);
        return { value: getFirstRow(r)?.val || 0, trend: 0, trendDirection: "flat" };
      }
      case "open-findings": {
        const r = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".audit_findings WHERE status NOT IN ('closed','resolved')`);
        return { value: getFirstRow(r)?.val || 0, trend: 0, trendDirection: "flat" };
      }
      case "evidence-status": {
        const total = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".evidence`);
        const fresh = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".evidence WHERE collected_at > NOW() - INTERVAL '90 days'`);
        const t = getFirstRow(total)?.val || 0;
        const f = getFirstRow(fresh)?.val || 0;
        const pct = t > 0 ? Math.round((f / t) * 100) : 0;
        return { value: pct + "%", trend: 0, trendDirection: "flat" };
      }
      case "audit-readiness": {
        const total = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".controls`);
        const tested = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".controls WHERE test_status IN ('pass','passing')`);
        const t = getFirstRow(total)?.val || 0;
        const f = getFirstRow(tested)?.val || 0;
        const pct = t > 0 ? Math.round((f / t) * 100) : 0;
        return { value: pct + "%", trend: 0, trendDirection: "flat" };
      }
      case "controls-coverage": {
        const total = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".controls`);
        const impl = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".controls WHERE status = 'implemented'`);
        const t = getFirstRow(total)?.val || 0;
        const f = getFirstRow(impl)?.val || 0;
        const pct = t > 0 ? Math.round((f / t) * 100) : 0;
        return { value: pct + "%", trend: 0, trendDirection: "flat" };
      }
      case "policy-adoption": {
        const total = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".policies`);
        const approved = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".policies WHERE status = 'approved' OR status = 'published'`);
        const t = getFirstRow(total)?.val || 0;
        const f = getFirstRow(approved)?.val || 0;
        const pct = t > 0 ? Math.round((f / t) * 100) : 0;
        return { value: pct + "%", trend: 0, trendDirection: "flat" };
      }
      default:
        return { value: "—", trend: 0, trendDirection: "flat" };
    }
  } catch {
    return { value: "—", trend: 0, trendDirection: "flat" };
  }
}

// ── KPI Stats (4 summary cards) ──
async function getKpiStats(schema: string, key: string): Promise<{ label: string; labelAr: string; value: string | number; icon: string; color: string }[]> {
  try {
    switch (key) {
      case "compliance-score": {
        const fw = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".frameworks`);
        const ctrl = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".controls`);
        const impl = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".controls WHERE status = 'implemented'`);
        const pol = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".policies`);
        return [
          { label: "Active Frameworks", labelAr: "الأطر النشطة", value: getFirstRow(fw)?.total || 0, icon: "th-large", color: "var(--primary)" },
          { label: "Total Controls", labelAr: "إجمالي الضوابط", value: getFirstRow(ctrl)?.total || 0, icon: "cog", color: "var(--info)" },
          { label: "Implemented", labelAr: "مطبّقة", value: getFirstRow(impl)?.val || 0, icon: "check-circle", color: "#22c55e" },
          { label: "Policies", labelAr: "السياسات", value: getFirstRow(pol)?.total || 0, icon: "file", color: "#8b5cf6" },
        ];
      }
      case "high-risks": {
        const crit = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".risks WHERE risk_score >= 20`);
        const high = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".risks WHERE risk_score >= 15 AND risk_score < 20`);
        const med = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".risks WHERE risk_score >= 8 AND risk_score < 15`);
        const low = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".risks WHERE risk_score < 8`);
        return [
          { label: "Critical", labelAr: "حرجة", value: getFirstRow(crit)?.val || 0, icon: "ban", color: "#ef4444" },
          { label: "High", labelAr: "عالية", value: getFirstRow(high)?.val || 0, icon: "exclamation-triangle", color: "#f59e0b" },
          { label: "Medium", labelAr: "متوسطة", value: getFirstRow(med)?.val || 0, icon: "info-circle", color: "#3b82f6" },
          { label: "Low", labelAr: "منخفضة", value: getFirstRow(low)?.val || 0, icon: "check", color: "#22c55e" },
        ];
      }
      case "overdue-tasks": {
        const overdue = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".remediation_tasks WHERE due_date < NOW() AND status NOT IN ('completed','closed')`);
        const inProg = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".remediation_tasks WHERE status = 'in_progress'`);
        const pending = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".remediation_tasks WHERE status = 'pending' OR status = 'open'`);
        const done = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".remediation_tasks WHERE status IN ('completed','closed')`);
        return [
          { label: "Overdue", labelAr: "متأخرة", value: getFirstRow(overdue)?.val || 0, icon: "clock", color: "#ef4444" },
          { label: "In Progress", labelAr: "قيد التنفيذ", value: getFirstRow(inProg)?.val || 0, icon: "spin pi-spinner", color: "#3b82f6" },
          { label: "Pending", labelAr: "بالانتظار", value: getFirstRow(pending)?.val || 0, icon: "hourglass", color: "#f59e0b" },
          { label: "Completed", labelAr: "مكتملة", value: getFirstRow(done)?.val || 0, icon: "check-circle", color: "#22c55e" },
        ];
      }
      case "open-findings": {
        const open = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".audit_findings WHERE status NOT IN ('closed','resolved')`);
        const critical = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".audit_findings WHERE severity = 'critical' AND status NOT IN ('closed','resolved')`);
        const plans = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".audit_plans`);
        const closed = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".audit_findings WHERE status IN ('closed','resolved')`);
        return [
          { label: "Open", labelAr: "مفتوحة", value: getFirstRow(open)?.val || 0, icon: "search", color: "#f59e0b" },
          { label: "Critical", labelAr: "حرجة", value: getFirstRow(critical)?.val || 0, icon: "exclamation-circle", color: "#ef4444" },
          { label: "Audit Plans", labelAr: "خطط التدقيق", value: getFirstRow(plans)?.val || 0, icon: "list", color: "#3b82f6" },
          { label: "Resolved", labelAr: "محلولة", value: getFirstRow(closed)?.val || 0, icon: "check-circle", color: "#22c55e" },
        ];
      }
      case "evidence-status": {
        const total = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".evidence`);
        const fresh = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".evidence WHERE collected_at > NOW() - INTERVAL '90 days'`);
        const stale = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".evidence WHERE collected_at <= NOW() - INTERVAL '90 days'`);
        const sched = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".evidence_schedules`);
        return [
          { label: "Total Evidence", labelAr: "إجمالي الأدلة", value: getFirstRow(total)?.val || 0, icon: "folder-open", color: "var(--primary)" },
          { label: "Current", labelAr: "حالية", value: getFirstRow(fresh)?.val || 0, icon: "check-circle", color: "#22c55e" },
          { label: "Stale", labelAr: "منتهية", value: getFirstRow(stale)?.val || 0, icon: "exclamation-triangle", color: "#ef4444" },
          { label: "Schedules", labelAr: "جداول", value: getFirstRow(sched)?.val || 0, icon: "calendar", color: "#8b5cf6" },
        ];
      }
      case "audit-readiness": {
        const total = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".controls`);
        const passing = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".controls WHERE test_status IN ('pass','passing')`);
        const failing = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".controls WHERE test_status IN ('fail','failing')`);
        const notTested = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".controls WHERE test_status IS NULL OR test_status = 'not_tested'`);
        return [
          { label: "Total Controls", labelAr: "إجمالي الضوابط", value: getFirstRow(total)?.val || 0, icon: "shield", color: "var(--primary)" },
          { label: "Passing", labelAr: "ناجحة", value: getFirstRow(passing)?.val || 0, icon: "check-circle", color: "#22c55e" },
          { label: "Failing", labelAr: "فاشلة", value: getFirstRow(failing)?.val || 0, icon: "times-circle", color: "#ef4444" },
          { label: "Not Tested", labelAr: "غير مختبرة", value: getFirstRow(notTested)?.val || 0, icon: "question-circle", color: "#9ca3af" },
        ];
      }
      case "controls-coverage": {
        const total = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".controls`);
        const impl = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".controls WHERE status = 'implemented'`);
        const inProg = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".controls WHERE status = 'in_progress'`);
        const notStarted = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".controls WHERE status = 'not_started' OR status IS NULL`);
        return [
          { label: "Total", labelAr: "الإجمالي", value: getFirstRow(total)?.val || 0, icon: "list", color: "var(--primary)" },
          { label: "Implemented", labelAr: "مطبّقة", value: getFirstRow(impl)?.val || 0, icon: "check-circle", color: "#22c55e" },
          { label: "In Progress", labelAr: "قيد التنفيذ", value: getFirstRow(inProg)?.val || 0, icon: "spin pi-spinner", color: "#3b82f6" },
          { label: "Not Started", labelAr: "غير مبدوءة", value: getFirstRow(notStarted)?.val || 0, icon: "minus-circle", color: "#9ca3af" },
        ];
      }
      case "policy-adoption": {
        const total = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".policies`);
        const approved = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".policies WHERE status = 'approved' OR status = 'published'`);
        const draft = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".policies WHERE status = 'draft'`);
        const review = await safeQuery(`SELECT COUNT(*)::int AS val FROM "${schema}".policies WHERE status = 'review'`);
        return [
          { label: "Total Policies", labelAr: "إجمالي السياسات", value: getFirstRow(total)?.val || 0, icon: "file", color: "var(--primary)" },
          { label: "Approved", labelAr: "معتمدة", value: getFirstRow(approved)?.val || 0, icon: "check-circle", color: "#22c55e" },
          { label: "Draft", labelAr: "مسودة", value: getFirstRow(draft)?.val || 0, icon: "pencil", color: "#3b82f6" },
          { label: "In Review", labelAr: "قيد المراجعة", value: getFirstRow(review)?.val || 0, icon: "eye", color: "#f59e0b" },
        ];
      }
      default:
        return [];
    }
  } catch {
    return [];
  }
}

// ── KPI Items (data table rows) ──
async function getKpiItems(schema: string, key: string): Promise<Record<string, unknown>[]> {
  try {
    switch (key) {
      case "compliance-score": {
        const r = await safeQuery(`SELECT framework_id, name, category, status, completion_percent, created_at FROM "${schema}".frameworks ORDER BY completion_percent DESC LIMIT 50`);
        return r.rows.map((row: Record<string, unknown>) => ({
          id: row.framework_id, title: row.name, category: row.category || "—",
          status: row.status, value: (row.completion_percent || 0) + "%", date: row.created_at,
        }));
      }
      case "high-risks": {
        const r = await safeQuery(`SELECT risk_id, title, category, status, risk_score, likelihood, impact, owner, created_at FROM "${schema}".risks WHERE risk_score >= 15 ORDER BY risk_score DESC LIMIT 50`);
        return r.rows.map((row: Record<string, unknown>) => ({
          id: row.risk_id, title: row.title, category: row.category,
          status: row.status, value: row.risk_score, owner: row.owner || "—", date: row.created_at,
        }));
      }
      case "overdue-tasks": {
        const r = await safeQuery(`SELECT task_id, title, status, priority, due_date, assigned_to, linked_entity_type FROM "${schema}".remediation_tasks WHERE due_date < NOW() AND status NOT IN ('completed','closed') ORDER BY due_date ASC LIMIT 50`);
        return r.rows.map((row: Record<string, unknown>) => ({
          id: row.task_id, title: row.title, category: row.linked_entity_type || "task",
          status: row.status, value: row.priority || "—", owner: row.assigned_to || "—", date: row.due_date,
        }));
      }
      case "open-findings": {
        const r = await safeQuery(`SELECT finding_id, title, severity, status, remediation_status, created_at FROM "${schema}".audit_findings WHERE status NOT IN ('closed','resolved') ORDER BY created_at DESC LIMIT 50`);
        return r.rows.map((row: Record<string, unknown>) => ({
          id: row.finding_id, title: row.title, category: row.severity || "—",
          status: row.status, value: row.remediation_status || "—", date: row.created_at,
        }));
      }
      case "evidence-status": {
        const r = await safeQuery(`SELECT evidence_id, control_id, file_name, hash, collected_at, created_at FROM "${schema}".evidence ORDER BY collected_at DESC NULLS LAST LIMIT 50`);
        return r.rows.map((row: Record<string, unknown>) => {
          const evidenceId = typeof row.evidence_id === 'string' ? row.evidence_id : String(row.evidence_id ?? '');
          const controlId = typeof row.control_id === 'string' ? row.control_id : String(row.control_id ?? '');

          return {
            id: row.evidence_id,
            title: row.file_name || `Evidence #${evidenceId.slice(0, 8)}`,
            category: "control:" + (controlId ? controlId.slice(0, 8) : "—"),
            status: row.collected_at && new Date((row as any).collected_at) > new Date(Date.now() - 90*86400000) ? "current" : "stale",
            value: row.hash ? "verified" : "unverified",
            date: row.collected_at || row.created_at,
          };
        });
      }
      case "audit-readiness": {
        const r = await safeQuery(`SELECT control_id, title, status, test_status, last_tested_at FROM "${schema}".controls ORDER BY last_tested_at DESC NULLS LAST LIMIT 50`);
        return r.rows.map((row: Record<string, unknown>) => ({
          id: row.control_id, title: row.title, category: row.status,
          status: row.test_status || "not_tested", value: row.test_status || "—", date: row.last_tested_at,
        }));
      }
      case "controls-coverage": {
        const r = await safeQuery(`SELECT control_id, title, status, test_status, owner_id, created_at FROM "${schema}".controls ORDER BY created_at DESC LIMIT 50`);
        return r.rows.map((row: Record<string, unknown>) => ({
          id: row.control_id, title: row.title, category: row.status,
          status: row.status, value: row.test_status || "—", owner: row.owner_id || "—", date: row.created_at,
        }));
      }
      case "policy-adoption": {
        const r = await safeQuery(`SELECT policy_id, title, status, version, approval_status, created_at FROM "${schema}".policies ORDER BY created_at DESC LIMIT 50`);
        return r.rows.map((row: Record<string, unknown>) => ({
          id: row.policy_id, title: row.title, category: "v" + (row.version || 1),
          status: row.status, value: row.approval_status || row.status, date: row.created_at,
        }));
      }
      default:
        return [];
    }
  } catch {
    return [];
  }
}

// ── Entity name resolver (look up actual name from the source table) ──
async function resolveEntityName(schema: string, entityType: string, entityId: string): Promise<string> {
  if (!entityId) return "";
  try {
    const tableMap: Record<string, { table: string; idCol: string; nameCol: string }> = {
      framework: { table: "frameworks", idCol: "framework_id", nameCol: "name" },
      risk: { table: "risks", idCol: "risk_id", nameCol: "title" },
      task: { table: "remediation_tasks", idCol: "task_id", nameCol: "title" },
      finding: { table: "audit_findings", idCol: "finding_id", nameCol: "title" },
      evidence: { table: "evidence", idCol: "evidence_id", nameCol: "file_name" },
      control: { table: "controls", idCol: "control_id", nameCol: "title" },
      policy: { table: "policies", idCol: "policy_id", nameCol: "title" },
    };
    const m = tableMap[entityType];
    if (!m) return "";
    const r = await safeQuery(`SELECT "${m.nameCol}" AS name FROM "${schema}"."${m.table}" WHERE "${m.idCol}" = $1 LIMIT 1`, [entityId]);
    return getFirstRow(r)?.name || "";
  } catch { return ""; }
}

// ── Action description generator ──
function describeAction(action: string, entityType: string, entityName: string): { en: string; ar: string } {
  const eName = entityName || entityType;
  const typeAr: Record<string, string> = { framework: "إطار", risk: "خطر", task: "مهمة", finding: "ملاحظة", evidence: "دليل", control: "ضابط", policy: "سياسة" };
  const eAr = typeAr[entityType] || entityType;
  const a = (action || "").toLowerCase();
  if (a.includes("create") || a.includes("insert") || a.includes("add"))
    return { en: `Created ${entityType} "${eName}"`, ar: `تم إنشاء ${eAr} "${eName}"` };
  if (a.includes("update") || a.includes("edit") || a.includes("modify"))
    return { en: `Updated ${entityType} "${eName}"`, ar: `تم تحديث ${eAr} "${eName}"` };
  if (a.includes("delete") || a.includes("remove"))
    return { en: `Deleted ${entityType} "${eName}"`, ar: `تم حذف ${eAr} "${eName}"` };
  if (a.includes("status"))
    return { en: `Status changed on ${entityType} "${eName}"`, ar: `تم تغيير حالة ${eAr} "${eName}"` };
  return { en: `${action} on ${entityType} "${eName}"`, ar: `${action} على ${eAr} "${eName}"` };
}

// ── KPI Timeline (enriched with entity names + descriptions) ──
async function getKpiTimeline(schema: string, module: string): Promise<Record<string, unknown>[]> {
  try {
    const r = await safeQuery(
      `SELECT entry_id, timestamp, user_id, module, action, entity_type, entity_id
       FROM "${schema}".audit_trail
       WHERE module = $1
       ORDER BY timestamp DESC
       LIMIT 40`,
      [module]
    );
    const events = [];
    for (const row of r.rows) {
      const entityName = await resolveEntityName(schema, row.entity_type, row.entity_id);
      const desc = describeAction(row.action, row.entity_type, entityName);
      events.push({
        id: row.entry_id,
        timestamp: row.timestamp,
        userId: row.user_id,
        module: row.module,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entityName,
        descriptionEn: desc.en,
        descriptionAr: desc.ar,
      });
    }
    return events;
  } catch {
    return [];
  }
}

// ── KPI mini-timeline for dashboard card indicators ──
// Returns last 3 events + total count per module for each of the 8 KPI keys
const MODULE_MAP: Record<string, string> = {
  "compliance-score": "compliance",
  "high-risks": "risk",
  "overdue-tasks": "task",
  "open-findings": "audit",
  "evidence-status": "evidence",
  "audit-readiness": "audit",
  "controls-coverage": "control",
  "policy-adoption": "policy",
};

// GET /api/kpi/card-indicators — aggregated mini-timeline for all 8 cards
router.get("/card-indicators", validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = tenantSchema(tenantId);

  const indicators: Record<string, unknown> = {};

  for (const [kpiKey, mod] of Object.entries(MODULE_MAP)) {
    try {
      const countRes = await safeQuery(
        `SELECT COUNT(*)::int AS total FROM "${schema}".audit_trail WHERE module = $1`, [mod]
      );
      const recentRes = await safeQuery(
        `SELECT timestamp, action, entity_type, entity_id
         FROM "${schema}".audit_trail WHERE module = $1
         ORDER BY timestamp DESC LIMIT 3`, [mod]
      );
      const recent = [];
      for (const row of recentRes.rows) {
        const entityName = await resolveEntityName(schema, row.entity_type, row.entity_id);
        const desc = describeAction(row.action, row.entity_type, entityName);
        recent.push({
          timestamp: row.timestamp,
          action: row.action,
          descriptionEn: desc.en,
          descriptionAr: desc.ar,
        });
      }
      indicators[kpiKey] = {
        totalEvents: getFirstRow(countRes)?.total || 0,
        lastEventAt: getFirstRow(recentRes)?.timestamp || null,
        recent,
      };
    } catch {
      indicators[kpiKey] = { totalEvents: 0, lastEventAt: null, recent: [] };
    }
  }

  res.json(indicators);
});

export default router;


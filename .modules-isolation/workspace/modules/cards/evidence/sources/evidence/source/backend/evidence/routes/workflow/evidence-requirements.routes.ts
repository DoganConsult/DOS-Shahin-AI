import { Request, Response, Router } from 'express';
import { z } from "zod";

// ============================================
// Evidence Requirements Routes — Query control evidence requirements
// ============================================

import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { errMsg } from "../../../../i18n/error-messages";

import { moduleStack } from '../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('evidence'));

// GET /api/evidence/requirements — Query requirements by controlId, controlCode, or framework
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const schema = tenantSchema(tenantId);
  const { controlId, framework, controlCode } = req.query;

  if (controlId) {
  const result = await safeQuery(
  `SELECT cer.id, cer.control_id, cer.framework_code, cer.control_number,
  cer.evidence_type_code, cer.is_mandatory, cer.requirement_description_en,
  cer.requirement_description_ar, cer.expected_content_en, cer.expected_content_ar,
  cer.collection_frequency, cer.retention_period_months, cer.maximum_age_days,
  cer.requires_attestation, cer.attestation_role, cer.display_order,
  rc.control_code, rc.control_title_en, rc.control_description_en,
  cd.domain_name_en, cd.framework_code AS fw_code,
  et.evidence_name_en, et.evidence_category, et.file_extensions, et.max_size_mb
  FROM "${schema}".control_evidence_requirements cer
  JOIN public.regulatory_controls rc ON rc.id = cer.control_id
  JOIN public.control_domains cd ON cd.id = rc.domain_id
  LEFT JOIN public.evidence_types et ON et.evidence_code = cer.evidence_type_code
  WHERE cer.control_id = $1
  ORDER BY cer.display_order NULLS LAST, cer.evidence_type_code`,
  [controlId]
  );
  res.json({ requirements: result.rows, count: result.rows.length });
  return;
  }

  if (controlCode) {
  const result = await safeQuery(
  `SELECT cer.id, cer.control_id, cer.framework_code, cer.control_number,
  cer.evidence_type_code, cer.is_mandatory, cer.requirement_description_en,
  cer.expected_content_en, cer.collection_frequency, cer.retention_period_months,
  rc.control_code, rc.control_title_en,
  cd.domain_name_en,
  et.evidence_name_en, et.file_extensions
  FROM "${schema}".control_evidence_requirements cer
  JOIN public.regulatory_controls rc ON rc.id = cer.control_id
  JOIN public.control_domains cd ON cd.id = rc.domain_id
  LEFT JOIN public.evidence_types et ON et.evidence_code = cer.evidence_type_code
  WHERE rc.control_code = $1
  ORDER BY cer.display_order NULLS LAST, cer.evidence_type_code`,
  [controlCode]
  );
  res.json({ requirements: result.rows, count: result.rows.length });
  return;
  }

  if (framework) {
  const result = await safeQuery(
  `SELECT cer.id, cer.control_id, cer.framework_code, cer.control_number,
  cer.evidence_type_code, cer.is_mandatory, cer.requirement_description_en,
  cer.expected_content_en, cer.collection_frequency, cer.retention_period_months,
  rc.control_code, rc.control_title_en,
  cd.domain_name_en,
  et.evidence_name_en, et.file_extensions
  FROM "${schema}".control_evidence_requirements cer
  JOIN public.regulatory_controls rc ON rc.id = cer.control_id
  JOIN public.control_domains cd ON cd.id = rc.domain_id
  LEFT JOIN public.evidence_types et ON et.evidence_code = cer.evidence_type_code
  WHERE cd.framework_code = $1
  ORDER BY rc.control_code, cer.display_order NULLS LAST, cer.evidence_type_code`,
  [framework]
  );
  res.json({ requirements: result.rows, count: result.rows.length });
  return;
  }

  res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/requirements/summary — Aggregate requirements by framework
router.get("/summary", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
  `SELECT cd.framework_code,
  COUNT(DISTINCT rc.id) AS control_count,
  COUNT(cer.id) AS requirement_count,
  COUNT(cer.id) FILTER (WHERE cer.is_mandatory) AS mandatory_count,
  COUNT(DISTINCT cer.evidence_type_code) AS evidence_type_count
  FROM "${schema}".control_evidence_requirements cer
  JOIN public.regulatory_controls rc ON rc.id = cer.control_id
  JOIN public.control_domains cd ON cd.id = rc.domain_id
  GROUP BY cd.framework_code
  ORDER BY cd.framework_code`
  );
  res.json({ frameworks: result.rows });
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/requirements/types — List active evidence types from public catalog
router.get("/types", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const result = await safeQuery(
  `SELECT evidence_code, evidence_name_en, evidence_name_ar, evidence_category,
  description_en, file_extensions, max_size_mb
  FROM public.evidence_types
  WHERE is_active = true
  ORDER BY evidence_code`
  );
  res.json({ types: result.rows, count: result.rows.length });
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

import { Request, Response, Router } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../ports/auth.port';
import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRowOrThrow } from '@dos/db';
import { getSetting } from '../ports/platform.port';
import { toErrorMessage } from '@dos/module-sdk';

import { moduleStack } from '../ports/middleware.port';
import { swallowNull, swallowDefault, EC } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('integrations'));

async function isPowerBiConfigured(schema: string): Promise<boolean> {
  const val = await swallowNull(EC.FALLBACK_QUERY, getSetting({ schema, scope: 'tenant' }, 'powerbi_configured'), { operation: 'fallback query' });
  return val === 'true' || val === true;
}

router.get("/status", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("integrations.connector.read"), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const configured = await isPowerBiConfigured(schema);
  res.json({ configured, provider: 'powerbi' });
});

router.get("/reports", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("integrations.connector.read"), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT * FROM "${schema}".powerbi_reports WHERE deleted_at IS NULL ORDER BY created_at DESC`
  ), { tenantId: req.tenantId!, operation: 'query powerbi_reports' });
  res.json({ reports: result.rows });
});

router.get("/embed-token", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("integrations.connector.read"), async (req: Request, res: Response) => {
  try {
  const schema = tenantSchema(req.tenantId!);
  const reportId = req.query.reportId as string | undefined;

  const configured = await isPowerBiConfigured(schema);
  if (!configured) {
  res.status(422).json({ error: "Power BI integration is not configured for this workspace" });
  return;
  }

  const reportQuery = reportId
  ? `SELECT * FROM "${schema}".powerbi_reports WHERE report_id = $1 AND deleted_at IS NULL LIMIT 1`
  : `SELECT * FROM "${schema}".powerbi_reports WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`;
  const reportResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(reportQuery, reportId ? [reportId] : []), { tenantId: req.tenantId!, operation: 'query powerbi_reports' });
  if (reportResult.rows.length === 0) {
  res.status(404).json({ error: "No Power BI report found" });
  return;
  }

  const report = getFirstRowOrThrow(reportResult, 'No Power BI report found');
  res.json({
  reportId: report.report_id,
  embedUrl: report.embed_url || `https://app.powerbi.com/reportEmbed?reportId=${report.report_id}`,
  token: report.embed_token || "",
  expiration: report.token_expiration || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;

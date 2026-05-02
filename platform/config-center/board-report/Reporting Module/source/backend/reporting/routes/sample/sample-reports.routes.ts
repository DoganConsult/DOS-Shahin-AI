import { Request, Response, Router } from 'express';
import { z } from "zod";
// ============================================
// Shahin-Ai — Bilingual Sample Report Downloads
// AR/EN toggle, Chart.js charts, professional layout
// Works from landing page (public) & workspace (auth)
//
// When accessed with a valid Bearer token, reports are
// populated with real tenant data. Without auth, demo
// data is used for marketing/landing page purposes.
//
// Report generators extracted to per-domain modules:
//   sample-report-shared.ts    — types, fetchers, HTML helpers, shell
//   sample-report-nca-ecc.ts   — NCA ECC Self-Assessment
//   sample-report-heatmap.ts   — Regulator Compliance Heatmap
//   sample-report-crossmap.ts  — Cross-Framework Mapping
//   sample-report-dpia.ts      — PDPL DPIA
//   sample-report-exec-grc.ts  — Executive GRC Dashboard
// ============================================


import jwt from "jsonwebtoken";

import { moduleStack, validate } from '../../ports/middleware.port';
import { getJwtSecret, authenticate } from '../../ports/auth.port';

import { shell } from './sample-report-shared';
import { genNcaEcc } from './sample-report-nca-ecc';
import { genHeatmap } from './sample-report-heatmap';
import { genCrossMap } from './sample-report-crossmap';
import { genDpia } from './sample-report-dpia';
import { genExecGrc } from './sample-report-exec-grc';
const router = Router();
router.use(authenticate);
router.use(moduleStack('reporting'));


const REPORTS: Record<string, { title: string; titleAr: string; filename: string }> = {
  "nca-ecc": { title: "NCA ECC Self-Assessment Report", titleAr: "تقرير التقييم الذاتي NCA ECC", filename: "Shahin-AI_NCA-ECC_Sample.html" },
  "regulator-heatmap": { title: "Regulator Compliance Heatmap", titleAr: "خريطة الامتثال التنظيمي", filename: "Shahin-AI_Heatmap_Sample.html" },
  "cross-mapping": { title: "Cross-Framework Mapping Report", titleAr: "تقرير ربط الأطر المتقاطعة", filename: "Shahin-AI_CrossMap_Sample.html" },
  "dpia": { title: "PDPL DPIA Report", titleAr: "تقرير تقييم أثر حماية البيانات", filename: "Shahin-AI_DPIA_Sample.html" },
  "executive-grc": { title: "Executive GRC Dashboard", titleAr: "لوحة الحوكمة التنفيذية", filename: "Shahin-AI_GRC_Sample.html" },
};

// ── Optional tenant resolution from Bearer token ──
// Does NOT require auth — gracefully returns null if no valid token.
function resolveTenantId(req: Request): string | null {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
     
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    return decoded?.tenantId || null;
  } catch {
    return null;
  }
}

router.get("/", validate({ query: z.record(z.unknown()) }), (_req: Request, res: Response) => {
  const list = Object.entries(REPORTS).map(([key, r]) => ({
    key, title: r.title, titleAr: r.titleAr, downloadUrl: `/api/public/sample-reports/${key}`,
  }));
  res.json({ reports: list, count: list.length });
});

router.get("/:type", validate({ query: z.record(z.unknown()) }), async (req: Request, res: Response) => {
  const type = req.params.type as string;
  const meta = REPORTS[type];
  if (!meta) { res.status(404).json({ error: "Not found", available: Object.keys(REPORTS) }); return; }

  const tenantId = resolveTenantId(req);
  try {
    const html = await generateReport(type, meta, tenantId);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${meta.filename}"`);
    res.send(html);
  } catch {
    res.status(500).json({ error: "Report generation failed" });
  }
});

async function generateReport(type: string, meta: { title: string; titleAr: string }, tenantId: string | null): Promise<string> {
  switch (type) {
    case "nca-ecc": return genNcaEcc(meta, tenantId);
    case "regulator-heatmap": return genHeatmap(meta, tenantId);
    case "cross-mapping": return genCrossMap(meta, tenantId);
    case "dpia": return genDpia(meta, tenantId);
    case "executive-grc": return genExecGrc(meta, tenantId);
    default: return shell(meta.title, meta.titleAr, "<p>Not found</p>");
  }
}

export default router;

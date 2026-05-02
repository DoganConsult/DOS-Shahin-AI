// ============================================
// Shahin-Ai — Chart GRC Core Service
// Pre-aggregated chart data for core GRC dashboard views
// ============================================

import { query, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';
import { safeQuery } from "@dos/db";

export interface GrcCoreDashboardData {
  controlsByDomain: { domain: string; total: number; implemented: number; tested: number }[];
  frameworkScores: { name: string; score: number; controlCount: number }[];
  evidenceByStatus: { status: string; count: number }[];
  risksByTreatment: { status: string; count: number }[];
  recentActivity: { date: string; module: string; action: string; summary: string }[];
}

export async function getGrcCoreDashboard(tenantId: string): Promise<GrcCoreDashboardData> {
  const schema = tenantSchema(tenantId);

  const [controls, frameworks, evidence, riskTreatment, activity] = await Promise.all([
    query(`SELECT domain, COUNT(*)::int as total,
           COUNT(*) FILTER (WHERE status = 'implemented')::int as implemented,
           COUNT(*) FILTER (WHERE status = 'tested')::int as tested
           FROM "${schema}".controls GROUP BY domain ORDER BY domain LIMIT 20`),
    query(`SELECT title, compliance_score, control_count FROM "${schema}".frameworks ORDER BY title LIMIT 20`),
    query(`SELECT status, COUNT(*)::int as count FROM "${schema}".evidence GROUP BY status`),
    query(`SELECT treatment_status as status, COUNT(*)::int as count FROM "${schema}".risks GROUP BY treatment_status`),
    query(`SELECT created_at as date, module, action, summary FROM "${schema}".activity_log ORDER BY created_at DESC LIMIT 20`),
  ]);

  return {
    controlsByDomain: controls.rows.map((r: GenericRow) => ({ domain: r.domain, total: r.total, implemented: r.implemented, tested: r.tested })),
    frameworkScores: frameworks.rows.map((r: GenericRow) => ({ name: r.title, score: r.compliance_score || 0, controlCount: r.control_count || 0 })),
    evidenceByStatus: evidence.rows.map((r: GenericRow) => ({ status: r.status, count: r.count })),
    risksByTreatment: riskTreatment.rows.map((r: GenericRow) => ({ status: r.status, count: r.count })),
    recentActivity: activity.rows.map((r: GenericRow) => ({
      date: r.date?.toISOString?.() || '',
      module: r.module,
      action: r.action,
      summary: r.summary,
    })),
  };
}

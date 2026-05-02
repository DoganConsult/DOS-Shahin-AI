// ============================================
// Shahin-Ai — Board Report Export Service
// Assembles board pack data and generates HTML
// reports for PDF conversion.
// ============================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { generateNarrativeSummary } from '../../../governance-ai/services/intelligence/narrative-engine.service';
import type { GenericRow } from '@dos/types';

// ── Interfaces ──

export interface BoardReportData {
  title_en: string;
  title_ar: string;
  period: { from: string; to: string };
  generated_at: string;
  generated_by: string;
  sections: BoardReportSection[];
}

export interface BoardReportSection {
  section_type: string;
  title_en: string;
  title_ar: string;
  content: Record<string, unknown>;
}

// ── Data Gathering ──

/**
 * Generate a full board report by gathering data from multiple governance
 * sources and assembling structured sections.
 */
export async function generateBoardReport(
  tenantId: string,
  opts: {
    period_start: string;
    period_end: string;
    pack_type?: string;
    userId: string;
  }
): Promise<BoardReportData> {
  const schema = tenantSchema(tenantId);
  const sections: BoardReportSection[] = [];

  // a. Executive Summary — AI narrative from governance-ai engine
  const narrative = await generateNarrativeSummary(tenantId).catch(() => 'Executive summary unavailable.');
  sections.push({
    section_type: 'executive_summary',
    title_en: 'Executive Summary',
    title_ar: 'الملخص التنفيذي',
    content: { narrative },
  });

  // b. Compliance Score — latest snapshots within the period
  const complianceResult = await safeQuery(
    `SELECT score, snapshot_date, framework_code, details
     FROM "${schema}".compliance_score_snapshots
     WHERE snapshot_date >= $1 AND snapshot_date <= $2
     ORDER BY snapshot_date DESC LIMIT 20`,
    [opts.period_start, opts.period_end]
  );
  const latestScore = complianceResult.rows[0]?.score ?? null;
  sections.push({
    section_type: 'compliance_score',
    title_en: 'Compliance Score',
    title_ar: 'درجة الامتثال',
    content: {
      current_score: latestScore,
      snapshots: complianceResult.rows,
      snapshot_count: complianceResult.rows.length,
    },
  });

  // c. Risk Heatmap Data — risks grouped by impact x likelihood
  const riskHeatmap = await safeQuery(
    `SELECT
       COALESCE(impact, 'any') AS impact,
       COALESCE(likelihood, 'any') AS likelihood,
       COUNT(*)::int AS count
     FROM "${schema}".risks
     WHERE deleted_at IS NULL
     GROUP BY impact, likelihood
     ORDER BY impact, likelihood`
  );
  // Build a 5x5 grid structure
  const impactLevels = ['very_low', 'low', 'medium', 'high', 'very_high'];
  const likelihoodLevels = ['very_low', 'low', 'medium', 'high', 'very_high'];
  const heatmapGrid: Record<string, Record<string, number>> = {};
  for (const il of impactLevels) {
    heatmapGrid[il] = {};
    for (const ll of likelihoodLevels) {
      heatmapGrid[il][ll] = 0;
    }
  }
  for (const row of riskHeatmap.rows) {
    const i = row.impact?.toLowerCase?.() || 'any';
    const l = row.likelihood?.toLowerCase?.() || 'any';
    if (heatmapGrid[i]) {
      heatmapGrid[i][l] = (heatmapGrid[i][l] || 0) + row.count;
    }
  }
  sections.push({
    section_type: 'risk_heatmap',
    title_en: 'Risk Heatmap',
    title_ar: 'خريطة حرارة المخاطر',
    content: {
      grid: heatmapGrid,
      raw: riskHeatmap.rows,
      total_risks: riskHeatmap.rows.reduce((s: number, r: Record<string, unknown>) => (s as any) + r.count, 0),
    },
  });

  // d. Control Effectiveness — controls grouped by status
  const controlStatus = await safeQuery(
    `SELECT
       COALESCE(status, 'any') AS status,
       COUNT(*)::int AS count
     FROM "${schema}".controls
     WHERE deleted_at IS NULL
     GROUP BY status`
  );
  const controlMap: Record<string, number> = {};
  for (const r of controlStatus.rows) controlMap[r.status] = r.count;
  sections.push({
    section_type: 'control_effectiveness',
    title_en: 'Control Effectiveness',
    title_ar: 'فعالية الضوابط',
    content: {
      by_status: controlMap,
      total: controlStatus.rows.reduce((s: number, r: Record<string, unknown>) => (s as any) + r.count, 0),
    },
  });

  // e. Open Findings — audit findings not yet closed/resolved
  const openFindings = await safeQuery(
    `SELECT finding_id, title, severity, status, due_date, created_at
     FROM "${schema}".audit_findings
     WHERE status NOT IN ('closed', 'resolved')
       AND deleted_at IS NULL
     ORDER BY
       CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       created_at DESC
     LIMIT 10`
  );
  sections.push({
    section_type: 'open_findings',
    title_en: 'Open Audit Findings',
    title_ar: 'نتائج التدقيق المفتوحة',
    content: {
      findings: openFindings.rows,
      count: openFindings.rows.length,
    },
  });

  // f. Policy Coverage — policies grouped by status
  const policyCoverage = await safeQuery(
    `SELECT
       COALESCE(status, 'any') AS status,
       COUNT(*)::int AS count
     FROM "${schema}".policies
     WHERE deleted_at IS NULL
     GROUP BY status`
  );
  const policyMap: Record<string, number> = {};
  for (const r of policyCoverage.rows) policyMap[r.status] = r.count;
  sections.push({
    section_type: 'policy_coverage',
    title_en: 'Policy Coverage',
    title_ar: 'تغطية السياسات',
    content: {
      by_status: policyMap,
      total: policyCoverage.rows.reduce((s: number, r: Record<string, unknown>) => (s as any) + r.count, 0),
    },
  });

  // g. Evidence Collection — evidence tasks/items by status for the period
  const evidenceStats = await safeQuery(
    `SELECT
       COALESCE(status, 'any') AS status,
       COUNT(*)::int AS count
     FROM "${schema}".evidence_tasks
     WHERE created_at >= $1 AND created_at <= $2
     GROUP BY status`,
    [opts.period_start, opts.period_end]
  );
  const evidenceMap: Record<string, number> = {};
  for (const r of evidenceStats.rows) evidenceMap[r.status] = r.count;
  sections.push({
    section_type: 'evidence_collection',
    title_en: 'Evidence Collection',
    title_ar: 'جمع الأدلة',
    content: {
      by_status: evidenceMap,
      total: evidenceStats.rows.reduce((s: number, r: Record<string, unknown>) => (s as any) + r.count, 0),
    },
  });

  // h. Agent Activity Summary — actions from agrc_event_log during the period
  const agentActivity = await safeQuery(
    `SELECT
       COALESCE(module, 'any') AS module,
       COALESCE(event, 'any') AS event,
       COUNT(*)::int AS count
     FROM "${schema}".agrc_event_log
     WHERE created_at >= $1 AND created_at <= $2
     GROUP BY module, event
     ORDER BY count DESC
     LIMIT 20`,
    [opts.period_start, opts.period_end]
  );
  const totalAgentActions = agentActivity.rows.reduce((s: number, r: Record<string, unknown>) => (s as any) + r.count, 0);
  sections.push({
    section_type: 'agent_activity',
    title_en: 'AI Agent Activity Summary',
    title_ar: 'ملخص نشاط الوكيل الذكي',
    content: {
      breakdown: agentActivity.rows,
      total_actions: totalAgentActions,
    },
  });

  // i. Recommendations — governance recommendations drafted or accepted
  const recommendations = await safeQuery(
    `SELECT recommendation_id, recommendation_text, accepted_status, priority, created_at
     FROM "${schema}".governance_recommendations
     WHERE accepted_status IN ('drafted', 'accepted')
     ORDER BY
       CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       created_at DESC
     LIMIT 20`
  );
  sections.push({
    section_type: 'recommendations',
    title_en: 'Recommendations',
    title_ar: 'التوصيات',
    content: {
      items: recommendations.rows,
      count: recommendations.rows.length,
    },
  });

  const now = new Date().toISOString();
  return {
    title_en: `Board Report — ${opts.pack_type || 'Quarterly'}`,
    title_ar: `تقرير مجلس الإدارة — ${opts.pack_type || 'ربع سنوي'}`,
    period: { from: opts.period_start, to: opts.period_end },
    generated_at: now,
    generated_by: opts.userId,
    sections,
  };
}

// ── HTML Rendering ──

/**
 * Render a BoardReportData structure as a self-contained, printer-friendly
 * HTML document with inline CSS. Supports bilingual section headers (EN/AR).
 */
export function renderBoardReportHtml(data: BoardReportData): string {
  const esc = (s: string | null | undefined): string =>
    (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const sectionHtml = data.sections.map((s) => renderSection(s, esc)).join('\n');

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(data.title_en)}</title>
  <style>
    /* Reset & base */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12pt; color: #1a1a1a; line-height: 1.6; }
    /* Printer-friendly A4 page breaks */
    @media print {
      .section { page-break-inside: avoid; }
      .page-break { page-break-after: always; }
    }
    @page { size: A4; margin: 20mm; }
    /* Header */
    .report-header { text-align: center; padding: 24px 0 16px; border-bottom: 3px solid #0d47a1; margin-bottom: 24px; }
    .report-header h1 { font-size: 22pt; color: #0d47a1; margin-bottom: 4px; }
    .report-header .title-ar { font-size: 18pt; color: #1565c0; direction: rtl; }
    .report-header .meta { font-size: 10pt; color: #666; margin-top: 8px; }
    /* Sections */
    .section { margin-bottom: 28px; }
    .section-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #e0e0e0; padding-bottom: 6px; margin-bottom: 12px; }
    .section-header h2 { font-size: 15pt; color: #0d47a1; }
    .section-header .title-ar { font-size: 13pt; color: #666; direction: rtl; }
    /* Score gauge */
    .score-gauge { display: inline-flex; align-items: center; justify-content: center; width: 100px; height: 100px; border-radius: 50%; border: 6px solid #0d47a1; font-size: 28pt; font-weight: bold; color: #0d47a1; margin: 12px auto; }
    .score-gauge.high { border-color: #2e7d32; color: #2e7d32; }
    .score-gauge.medium { border-color: #f57f17; color: #f57f17; }
    .score-gauge.low { border-color: #c62828; color: #c62828; }
    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10pt; }
    th, td { padding: 6px 10px; border: 1px solid #ccc; text-align: left; }
    th { background: #e3f2fd; color: #0d47a1; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    /* Heatmap */
    .heatmap td { text-align: center; font-weight: bold; min-width: 48px; }
    .heatmap .heat-0 { background: #e8f5e9; }
    .heatmap .heat-low { background: #fff9c4; }
    .heatmap .heat-med { background: #ffcc80; }
    .heatmap .heat-high { background: #ef9a9a; }
    .heatmap .heat-crit { background: #c62828; color: #fff; }
    .heatmap th { background: #0d47a1; color: #fff; }
    /* Narrative */
    .narrative { white-space: pre-wrap; background: #f5f5f5; padding: 14px; border-radius: 6px; font-size: 11pt; }
    /* Summary cards */
    .summary-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .summary-card { flex: 1; min-width: 120px; border: 1px solid #ccc; border-radius: 6px; padding: 12px; text-align: center; }
    .summary-card .label { font-size: 9pt; color: #666; }
    .summary-card .value { font-size: 18pt; font-weight: bold; color: #0d47a1; }
    /* Recommendation list */
    .rec-list { list-style: none; }
    .rec-list li { padding: 8px 0; border-bottom: 1px solid #eee; }
    .rec-priority { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 9pt; font-weight: 600; margin-right: 6px; }
    .rec-priority.critical { background: #c62828; color: #fff; }
    .rec-priority.high { background: #ef6c00; color: #fff; }
    .rec-priority.medium { background: #f9a825; color: #222; }
    .rec-priority.low { background: #66bb6a; color: #fff; }
    /* Footer */
    .report-footer { text-align: center; font-size: 9pt; color: #999; padding-top: 16px; border-top: 1px solid #e0e0e0; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${esc(data.title_en)}</h1>
    <div class="title-ar">${esc(data.title_ar)}</div>
    <div class="meta">
      Period: ${esc(data.period.from)} &ndash; ${esc(data.period.to)} |
      Generated: ${esc(data.generated_at)} |
      By: ${esc(data.generated_by)}
    </div>
  </div>

  ${sectionHtml}

  <div class="report-footer">
    AGRC-OS Board Report &mdash; Confidential &mdash; Generated ${esc(data.generated_at)}
  </div>
</body>
</html>`;
}

/** Render a single section to HTML based on its type */
function renderSection(
  s: BoardReportSection,
  esc: (v: string | null | undefined) => string
): string {
  const header = `<div class="section">
  <div class="section-header">
    <h2>${esc(s.title_en)}</h2>
    <span class="title-ar">${esc(s.title_ar)}</span>
  </div>`;
  const footer = `</div>`;
  const c = s.content as any;

  switch (s.section_type) {
    case 'executive_summary':
      return `${header}<div class="narrative">${esc(c.narrative)}</div>${footer}`;

    case 'compliance_score': {
      const score = c.current_score != null ? Math.round(c.current_score) : 'N/A';
      const cls = typeof score === 'number'
        ? score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low'
        : '';
      return `${header}
        <div style="text-align:center;">
          <div class="score-gauge ${cls}">${score}${typeof score === 'number' ? '%' : ''}</div>
        </div>
        <p style="text-align:center;font-size:10pt;color:#666;">${c.snapshot_count || 0} snapshots in period</p>
      ${footer}`;
    }

    case 'risk_heatmap': {
      const grid = c.grid || {};
      const levels = ['very_low', 'low', 'medium', 'high', 'very_high'];
      const labels: Record<string, string> = { very_low: 'Very Low', low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very High' };
      let rows = '';
      for (const impact of [...levels].reverse()) {
        let cells = `<td><strong>${esc(labels[impact])}</strong></td>`;
        for (const lk of levels) {
          const val = grid[impact]?.[lk] ?? 0;
          const heatCls = val === 0 ? 'heat-0' : val <= 2 ? 'heat-low' : val <= 5 ? 'heat-med' : val <= 10 ? 'heat-high' : 'heat-crit';
          cells += `<td class="${heatCls}">${val}</td>`;
        }
        rows += `<tr>${cells}</tr>`;
      }
      return `${header}
        <p>Total risks: ${c.total_risks || 0}</p>
        <table class="heatmap">
          <thead>
            <tr><th>Impact \\ Likelihood</th>${levels.map(l => `<th>${esc(labels[l])}</th>`).join('')}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      ${footer}`;
    }

    case 'control_effectiveness': {
      const statusMap = c.by_status || {};
      const cards = Object.entries(statusMap).map(([status, count]) =>
        `<div class="summary-card"><div class="label">${esc(status)}</div><div class="value">${count}</div></div>`
      ).join('');
      return `${header}
        <p>Total controls: ${c.total || 0}</p>
        <div class="summary-row">${cards}</div>
      ${footer}`;
    }

    case 'open_findings': {
      const findings = c.findings || [];
      if (findings.length === 0) return `${header}<p>No open findings.</p>${footer}`;
      let tableRows = '';
      for (const f of findings) {
        tableRows += `<tr><td>${esc(f.title)}</td><td>${esc(f.severity)}</td><td>${esc(f.status)}</td><td>${esc(f.due_date)}</td></tr>`;
      }
      return `${header}
        <table>
          <thead><tr><th>Finding</th><th>Severity</th><th>Status</th><th>Due Date</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      ${footer}`;
    }

    case 'policy_coverage': {
      const pm = c.by_status || {};
      const cards = Object.entries(pm).map(([status, count]) =>
        `<div class="summary-card"><div class="label">${esc(status)}</div><div class="value">${count}</div></div>`
      ).join('');
      return `${header}
        <p>Total policies: ${c.total || 0}</p>
        <div class="summary-row">${cards}</div>
      ${footer}`;
    }

    case 'evidence_collection': {
      const em = c.by_status || {};
      const cards = Object.entries(em).map(([status, count]) =>
        `<div class="summary-card"><div class="label">${esc(status)}</div><div class="value">${count}</div></div>`
      ).join('');
      return `${header}
        <p>Total evidence tasks in period: ${c.total || 0}</p>
        <div class="summary-row">${cards}</div>
      ${footer}`;
    }

    case 'agent_activity': {
      const items = c.breakdown || [];
      if (items.length === 0) return `${header}<p>No agent activity recorded in period.</p>${footer}`;
      let tableRows = '';
      for (const a of items) {
        tableRows += `<tr><td>${esc(a.module)}</td><td>${esc(a.event)}</td><td>${a.count}</td></tr>`;
      }
      return `${header}
        <p>Total agent actions: ${c.total_actions || 0}</p>
        <table>
          <thead><tr><th>Module</th><th>Event</th><th>Count</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      ${footer}`;
    }

    case 'recommendations': {
      const recs = c.items || [];
      if (recs.length === 0) return `${header}<p>No pending recommendations.</p>${footer}`;
      const listItems = recs.map((r: GenericRow) => {
        const pCls = r.priority || 'medium';
        return `<li>
          <span class="rec-priority ${pCls}">${esc(r.priority || 'medium')}</span>
          ${esc(r.recommendation_text)}
          <span style="font-size:9pt;color:#999;margin-left:8px;">[${esc(r.accepted_status)}]</span>
        </li>`;
      }).join('');
      return `${header}
        <ul class="rec-list">${listItems}</ul>
      ${footer}`;
    }

    default:
      return `${header}<pre>${esc(JSON.stringify(c, null, 2))}</pre>${footer}`;
  }
}

// ── Schedule Management ──

/**
 * Save a board report generation schedule. The schedule will be
 * picked up by the platform job scheduler for periodic execution.
 */
export async function scheduleBoardReport(
  tenantId: string,
  opts: { cron: string; pack_type: string; recipients: string[] }
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const id = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".board_report_schedules
       (schedule_id, tenant_id, cron_expression, pack_type, recipients, active, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, true, NOW())
     ON CONFLICT (tenant_id, pack_type) DO UPDATE
       SET cron_expression = EXCLUDED.cron_expression,
           recipients = EXCLUDED.recipients,
           active = true,
           updated_at = NOW()`,
    [id, tenantId, opts.cron, opts.pack_type, JSON.stringify(opts.recipients)]
  );
}

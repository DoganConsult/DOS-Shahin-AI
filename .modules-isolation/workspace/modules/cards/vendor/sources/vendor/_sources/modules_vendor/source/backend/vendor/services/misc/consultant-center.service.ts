// ============================================
// Shahin — Consultant Command Center Service
// Multi-client management for consultant admins:
// portfolio health, findings, benchmarks, timeline,
// context-switch JWT, and PDF portfolio report.
//
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
// ============================================

import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import { randomUUID } from 'node:crypto';
import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { createNotification } from '../../../notification/services/notification.service';
import { getJwtSecret } from '../../ports/auth.port';
import {
  Client,
  PortfolioHealth,
  Finding,
  FindingInput,
  Benchmark,
  TimelineEvent,
} from '@dos/types';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';



// ── Assignment Validation ──────────────────────────────────────────────────

/**
 * Validates that a consultant is assigned to a given client tenant.
 * Queries consultant_assignments in the master/public schema.
 */
async function validateAssignment(
  consultantId: string,
  clientTenantId: string,
): Promise<boolean> {
  const result = await safeQuery(
    `SELECT 1 FROM public.consultant_assignments
     WHERE consultant_id = $1 AND tenant_id = $2
     LIMIT 1`,
    [consultantId, clientTenantId],
  );
  return result.rows.length > 0;
}

/**
 * Returns the list of assigned client tenant IDs for a consultant.
 */
async function getAssignedTenantIds(consultantId: string): Promise<string[]> {
  const result = await safeQuery(
    `SELECT tenant_id FROM public.consultant_assignments
     WHERE consultant_id = $1`,
    [consultantId],
  );
  return result.rows.map((r: GenericRow) => r.tenant_id);
}

// ── Service Functions ──────────────────────────────────────────────────────

/**
 * Returns all clients assigned to the consultant with summary metrics.
 */
export async function getClients(consultantId: string): Promise<Client[]> {
  const tenantIds = await getAssignedTenantIds(consultantId);
  if (tenantIds.length === 0) return [];

  const clients: Client[] = [];
  for (const tid of tenantIds) {
    try {
      const schema = tenantSchema(tid);
      const tenantResult = await safeQuery(
        `SELECT name FROM public.tenants WHERE tenant_id = $1 LIMIT 1`,
        [tid],
      );
      const tenantName = getFirstRow(tenantResult)?.name ?? tid;

      // Compliance score — average control effectiveness
      const compResult = await safeQuery(
        `SELECT COALESCE(AVG(effectiveness), 0) AS avg_score
         FROM "${schema}".controls WHERE status = 'active'`,
      );
      const complianceScore = Math.round(Number(getFirstRow(compResult)?.avg_score ?? 0));

      // Risk level — highest open risk
      const riskResult = await safeQuery(
        `SELECT COALESCE(MAX(risk_score), 0) AS max_risk
         FROM "${schema}".risks WHERE status = 'open'`,
      );
      const maxRisk = Number(getFirstRow(riskResult)?.max_risk ?? 0);
      const riskLevel = maxRisk >= 80 ? 'critical' : maxRisk >= 60 ? 'high' : maxRisk >= 40 ? 'medium' : 'low';

      // Engagement score — latest
      const esResult = await safeQuery(
        `SELECT total_score FROM "${schema}".vendor_engagement_scores
         ORDER BY computed_at DESC LIMIT 1`,
      );
      const engagementScore = Number(getFirstRow(esResult)?.total_score ?? 0);

      clients.push({
        tenantId: tid,
        name: tenantName,
        complianceScore,
        riskLevel,
        engagementScore,
        status: 'active',
      });
    } catch {
      // Skip tenants with errors
      clients.push({
        tenantId: tid,
        name: tid,
        complianceScore: 0,
        riskLevel: 'any',
        engagementScore: 0,
        status: 'error',
      });
    }
  }
  return clients;
}

/**
 * Issues a Scoped JWT with consultant_admin role scoped to the target
 * client tenant, with a 1-hour expiry.
 *
 * Requirement 8.2
 */
export async function getClientContext(
  consultantId: string,
  clientTenantId: string,
): Promise<{ scopedJwt: string }> {
  const allowed = await validateAssignment(consultantId, clientTenantId);
  if (!allowed) {
    const e = new Error('Consultant is not assigned to this tenant');
    (e as any).statusCode = 403;
    throw e;
  }

  const secret = getJwtSecret();
  const scopedJwt = jwt.sign(
    {
      sub: consultantId,
      tenantId: clientTenantId,
      scopeTenantId: clientTenantId,
      role: 'consultant_admin',
      aud: 'dos',
    },
    secret,
    { expiresIn: '1h' },
  );

  return { scopedJwt };
}

/**
 * Aggregates portfolio health metrics across all assigned clients.
 *
 * Requirement 8.4
 */
export async function getPortfolioHealth(
  consultantId: string,
): Promise<PortfolioHealth> {
  const clients = await getClients(consultantId);
  const activeClients = clients.filter((c) => c.status === 'active');
  const count = activeClients.length;

  if (count === 0) {
    return {
      clientCount: 0,
      averageComplianceScore: 0,
      averageRiskLevel: 'low',
      averageEngagementScore: 0,
      criticalFindings: 0,
    };
  }

  const avgCompliance = Math.round(
    activeClients.reduce((s, c) => s + (c.complianceScore ?? 0), 0) / count,
  );
  const avgEngagement = Math.round(
    activeClients.reduce((s, c) => s + (c.engagementScore ?? 0), 0) / count,
  );

  // Determine average risk level from individual levels
  const riskMap: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  const avgRiskNum =
    activeClients.reduce((s, c) => s + (riskMap[c.riskLevel ?? 'low'] ?? 1), 0) / count;
  const averageRiskLevel =
    avgRiskNum >= 3.5 ? 'critical' : avgRiskNum >= 2.5 ? 'high' : avgRiskNum >= 1.5 ? 'medium' : 'low';

  // Count critical findings across all client tenants
  let criticalFindings = 0;
  for (const client of activeClients) {
    try {
      const schema = tenantSchema(client.tenantId);
      const result = await safeQuery(
        `SELECT COUNT(*) AS cnt FROM "${schema}".findings
         WHERE severity = 'critical' AND status = 'open'`,
      );
      criticalFindings += Number(getFirstRow(result)?.cnt ?? 0);
    } catch {
      // Skip on error
    }
  }

  return {
    clientCount: count,
    averageComplianceScore: avgCompliance,
    averageRiskLevel,
    averageEngagementScore: avgEngagement,
    criticalFindings,
  };
}

/**
 * Returns findings for a specific client tenant.
 */
export async function getClientFindings(
  consultantId: string,
  clientTenantId: string,
): Promise<Finding[]> {
  const allowed = await validateAssignment(consultantId, clientTenantId);
  if (!allowed) return [];

  const schema = tenantSchema(clientTenantId);
  const result = await safeQuery(
    `SELECT finding_id AS "findingId", title, severity, status, entity_type AS "entityType", entity_id AS "entityId", recommendation
     FROM "${schema}".findings
     ORDER BY created_at DESC
     LIMIT 100`,
  ).catch(() => ({ rows: [] as any[] }));

  return result.rows as Finding[];
}

/**
 * Publishes an advisory finding for a client tenant.
 * Publishes consultant.finding_added event and notifies the client's
 * compliance officer.
 *
 * Requirement 8.3
 */
export async function publishFinding(
  consultantId: string,
  clientTenantId: string,
  finding: FindingInput,
): Promise<Finding> {
  const allowed = await validateAssignment(consultantId, clientTenantId);
  if (!allowed) {
    const e = new Error('Consultant is not assigned to this tenant');
    (e as any).statusCode = 403;
    throw e;
  }

  const schema = tenantSchema(clientTenantId);
  const findingId = randomUUID();

  await safeQuery(
    `INSERT INTO "${schema}".findings
      (finding_id, title, severity, status, entity_type, entity_id, recommendation, created_at)
     VALUES ($1, $2, $3, 'open', $4, $5, $6, NOW())`,
    [
      findingId,
      finding.title ?? 'Consultant advisory finding',
      finding.severity ?? 'medium',
      finding.entityType ?? null,
      finding.entityId ?? null,
      (finding as any).recommendation ?? null,
    ],
  ).catch(() => undefined);

  await eventBus.publish(({
    tenantId: clientTenantId,
    eventType: 'consultant.finding_added',
    severity: 'info',
    entityType: 'finding',
    entityId: findingId,
    payload: { consultantId, findingId },
  } as any)).catch(() => undefined);

  await createNotification(clientTenantId, {
    type: 'consultant_finding_added',
    title: 'New consultant finding',
    body: finding.title ?? 'A consultant published a finding.',
    findingId,
  }).catch(() => undefined);

  return {
    findingId,
    title: finding.title,
    severity: finding.severity,
    status: 'open',
    entityType: finding.entityType,
    entityId: finding.entityId,
    recommendation: (finding as any).recommendation,
  } as Finding;
}

/**
 * Aggregates anonymized metrics across all assigned clients for
 * cross-client benchmarking.
 *
 * Requirement 8.4
 */
export async function getBenchmarks(consultantId: string): Promise<Benchmark[]> {
  const tenantIds = await getAssignedTenantIds(consultantId);
  if (tenantIds.length === 0) return [];

  const complianceValues: Array<{ clientId: string; value: number }> = [];
  const riskValues: Array<{ clientId: string; value: number }> = [];
  const engagementValues: Array<{ clientId: string; value: number }> = [];

  for (const tid of tenantIds) {
    try {
      const schema = tenantSchema(tid);

      const compResult = await safeQuery(
        `SELECT COALESCE(AVG(effectiveness), 0) AS avg
         FROM "${schema}".controls WHERE status = 'active'`,
      );
      complianceValues.push({ clientId: tid, value: Math.round(Number(getFirstRow(compResult)?.avg ?? 0)) });

      const riskResult = await safeQuery(
        `SELECT COALESCE(AVG(risk_score), 0) AS avg
         FROM "${schema}".risks WHERE status = 'open'`,
      );
      riskValues.push({ clientId: tid, value: Math.round(Number(getFirstRow(riskResult)?.avg ?? 0)) });

      const esResult = await safeQuery(
        `SELECT total_score FROM "${schema}".vendor_engagement_scores
         ORDER BY computed_at DESC LIMIT 1`,
      );
      engagementValues.push({ clientId: tid, value: Number(getFirstRow(esResult)?.total_score ?? 0) });
    } catch {
      // Skip tenants with errors
    }
  }

  return [
    buildBenchmark('compliance_score', complianceValues),
    buildBenchmark('risk_score', riskValues),
    buildBenchmark('engagement_score', engagementValues),
  ];
}

/**
 * Returns a chronological timeline of key engagement events across
 * all assigned clients.
 */
export async function getEngagementTimeline(
  consultantId: string,
): Promise<TimelineEvent[]> {
  const tenantIds = await getAssignedTenantIds(consultantId);
  if (tenantIds.length === 0) return [];

  const events: TimelineEvent[] = [];

  for (const tid of tenantIds) {
    try {
      const schema = tenantSchema(tid);
      const result = await safeQuery(
        `SELECT event_id, event_type, entity_type, entity_id, payload, created_at
         FROM "${schema}".agrc_event_log
         WHERE event_type IN (
           'consultant.finding_added',
           'vendor.questionnaire_responded',
           'vendor.engagement_score_low',
           'risk.changed',
           'engagement.cycle_completed'
         )
         ORDER BY created_at DESC
         LIMIT 50`,
      );

      for (const row of result.rows) {
        events.push({
          eventId: row.event_id,
          clientTenantId: tid,
          eventType: row.event_type,
          description: row.payload?.description ?? row.event_type,
          timestamp: row.created_at,
        });
      }
    } catch {
      // Skip tenants with errors
    }
  }

  // Sort all events chronologically (most recent first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events.slice(0, 100);
}

/**
 * Generates a PDF portfolio report with cross-client comparison
 * and anonymized benchmarks using pdfkit.
 *
 * Includes: header, executive summary, findings table with severity
 * indicators, risk matrix, compliance score summary, and page footers.
 *
 * Returns a Buffer containing the PDF content.
 */
export async function getPortfolioReport(
  consultantId: string,
): Promise<Buffer> {
  const clients = await getClients(consultantId);
  const health = await getPortfolioHealth(consultantId);
  const benchmarks = await getBenchmarks(consultantId);

  // Collect all findings across client tenants for the findings table
  const allFindings: Array<Finding & { clientName: string }> = [];
  for (const client of clients) {
    try {
      const findings = await getClientFindings(consultantId, client.tenantId);
      for (const f of findings) {
        allFindings.push({ ...f, clientName: client.name });
      }
    } catch {
      // Skip clients where findings retrieval fails
    }
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));

    const pageWidth = doc.page.width;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;
    const generatedDate = new Date().toISOString().split('T')[0];

    // Color palette
    const PRIMARY = '#0c4a6e';
    const _ACCENT = '#0ea5e9';
    const RED = '#dc2626';
    const ORANGE = '#f97316';
    const YELLOW = '#eab308';
    const GREEN = '#16a34a';

    // ── Helper: severity color ──
    function severityColor(severity: string): string {
      switch (severity) {
        case 'critical': return RED;
        case 'high': return ORANGE;
        case 'medium': return YELLOW;
        case 'low': return GREEN;
        default: return '#6b7280';
      }
    }

    // ── Helper: risk level color ──
    function riskLevelColor(level: string): string {
      switch (level) {
        case 'critical': return RED;
        case 'high': return ORANGE;
        case 'medium': return YELLOW;
        case 'low': return GREEN;
        default: return '#6b7280';
      }
    }

    // ── Helper: draw a horizontal rule ──
    function drawHR(y: number): void {
      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(margin, y).lineTo(pageWidth - margin, y).stroke();
    }

    // ── Helper: section heading ──
    function sectionHeading(title: string): void {
      if (doc.y > 680) doc.addPage();
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor(PRIMARY).text(title, margin, doc.y, { width: contentWidth });
      drawHR(doc.y + 4);
      doc.moveDown(0.5);
    }

    // ═══════════════════════════════════════════════
    // PAGE 1: Header & Executive Summary
    // ═══════════════════════════════════════════════

    // Header background bar
    doc.rect(0, 0, pageWidth, 100).fill(PRIMARY);
    doc.fontSize(22).fillColor('#ffffff').text('AGRC-OS', margin, 25, { width: contentWidth });
    doc.fontSize(11).fillColor('#bae6fd').text('Consultant Portfolio Report', margin, 52, { width: contentWidth });
    doc.fontSize(9).fillColor('#7dd3fc').text(`Generated: ${generatedDate}  |  Consultant: ${consultantId}`, margin, 72, { width: contentWidth });

    doc.y = 120;

    // ── Executive Summary ──
    sectionHeading('Executive Summary');

    const kpiY = doc.y;
    const kpiBoxWidth = contentWidth / 4 - 8;

    // KPI boxes
    const kpis = [
      { label: 'Total Clients', value: String(health.clientCount), color: PRIMARY },
      { label: 'Avg Compliance', value: `${health.averageComplianceScore}%`, color: health.averageComplianceScore >= 70 ? GREEN : YELLOW },
      { label: 'Avg Risk Level', value: health.averageRiskLevel.toUpperCase(), color: riskLevelColor(health.averageRiskLevel) },
      { label: 'Critical Findings', value: String(health.criticalFindings), color: health.criticalFindings > 0 ? RED : GREEN },
    ];

    kpis.forEach((kpi, i) => {
      const x = margin + i * (kpiBoxWidth + 10);
      doc.roundedRect(x, kpiY, kpiBoxWidth, 60, 6).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fontSize(18).fillColor(kpi.color).text(kpi.value, x, kpiY + 10, { width: kpiBoxWidth, align: 'center' });
      doc.fontSize(8).fillColor('#64748b').text(kpi.label, x, kpiY + 38, { width: kpiBoxWidth, align: 'center' });
    });

    doc.y = kpiY + 80;

    // ── Client Summary Table ──
    sectionHeading('Client Portfolio');

    // Table header
    const colWidths = [150, 80, 80, 80, 80];
    const headers = ['Client', 'Compliance', 'Risk Level', 'Engagement', 'Status'];
    let tableY = doc.y;

    doc.rect(margin, tableY, contentWidth, 20).fill('#f0f9ff');
    headers.forEach((h, i) => {
      const x = margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 6;
      doc.fontSize(8).fillColor(PRIMARY).text(h, x, tableY + 5, { width: colWidths[i] - 12 });
    });
    tableY += 20;

    // Table rows
    for (const client of clients) {
      if (tableY > 720) {
        doc.addPage();
        tableY = margin;
      }

      const rowColor = clients.indexOf(client) % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(margin, tableY, contentWidth, 18).fill(rowColor);

      const riskLevel = client.riskLevel ?? 'low';
      const rowData = [
        client.name,
        `${client.complianceScore ?? 0}%`,
        riskLevel.toUpperCase(),
        String(client.engagementScore ?? 0),
        client.status,
      ];

      rowData.forEach((val, i) => {
        const x = margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 6;
        const color = i === 2 ? riskLevelColor(riskLevel) : '#1e293b';
        doc.fontSize(8).fillColor(color).text(val, x, tableY + 4, { width: colWidths[i] - 12 });
      });

      tableY += 18;
    }

    doc.y = tableY + 10;

    // ═══════════════════════════════════════════════
    // Findings Table
    // ═══════════════════════════════════════════════
    sectionHeading('Findings Summary');

    if (allFindings.length === 0) {
      doc.fontSize(10).fillColor('#64748b').text('No findings recorded across client portfolio.', margin, doc.y, { width: contentWidth });
    } else {
      const fColWidths = [100, 60, 150, 160];
      const fHeaders = ['Client', 'Severity', 'Description', 'Recommendation'];
      let fTableY = doc.y;

      doc.rect(margin, fTableY, contentWidth, 20).fill('#f0f9ff');
      fHeaders.forEach((h, i) => {
        const x = margin + fColWidths.slice(0, i).reduce((a, b) => a + b, 0) + 6;
        doc.fontSize(8).fillColor(PRIMARY).text(h, x, fTableY + 5, { width: fColWidths[i] - 12 });
      });
      fTableY += 20;

      // Show up to 20 most recent findings
      const displayFindings = allFindings.slice(0, 20);
      for (const finding of displayFindings) {
        // Estimate row height; findings can be multi-line
        const rowHeight = 28;
        if (fTableY + rowHeight > 720) {
          doc.addPage();
          fTableY = margin;
        }

        const rowColor = displayFindings.indexOf(finding) % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(margin, fTableY, contentWidth, rowHeight).fill(rowColor);

        // Severity badge
        const sevX = margin + fColWidths[0] + 6;
        const severity = finding.severity ?? 'low';
        doc.roundedRect(sevX, fTableY + 6, 50, 14, 4).fill(severityColor(severity));
        doc.fontSize(7).fillColor('#ffffff').text(severity.toUpperCase(), sevX + 2, fTableY + 9, { width: 46, align: 'center' });

        // Client name
        doc.fontSize(7).fillColor('#1e293b').text(
          finding.clientName.substring(0, 22),
          margin + 6,
          fTableY + 8,
          { width: fColWidths[0] - 12 },
        );

        // Description (truncated)
        const descX = margin + fColWidths[0] + fColWidths[1] + 6;
        doc.fontSize(7).fillColor('#1e293b').text(

          finding.description.substring(0, 80),
          descX,
          fTableY + 8,
          { width: fColWidths[2] - 12 },
        );

        // Recommendation (truncated)
        const recX = descX + fColWidths[2];
        doc.fontSize(7).fillColor('#1e293b').text(
          (finding.recommendation ?? '').substring(0, 85),
          recX,
          fTableY + 8,
          { width: fColWidths[3] - 12 },
        );

        fTableY += rowHeight;
      }

      if (allFindings.length > 20) {
        doc.y = fTableY + 4;
        doc.fontSize(8).fillColor('#64748b').text(
          `Showing 20 of ${allFindings.length} total findings.`,
          margin, doc.y, { width: contentWidth },
        );
      }

      doc.y = fTableY + 10;
    }

    // ═══════════════════════════════════════════════
    // Risk Matrix Visualization
    // ═══════════════════════════════════════════════
    if (doc.y > 550) doc.addPage();
    sectionHeading('Risk Matrix');

    const matrixX = margin + 40;
    const matrixY = doc.y + 10;
    const cellSize = 50;
    const riskLabels = ['Low', 'Medium', 'High', 'Critical'];
    const _riskColors = [GREEN, YELLOW, ORANGE, RED];

    // Count clients by risk level for the matrix cells
    const riskCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const c of clients.filter(cl => cl.status === 'active')) {
      const level = (c.riskLevel ?? 'low').toLowerCase();
      if (level in riskCounts) riskCounts[level]++;
    }

    // Draw Y-axis label
    doc.fontSize(8).fillColor('#64748b').text('IMPACT', margin, matrixY + cellSize, { width: 35, align: 'center' });

    // Draw 4x4 grid (simplified: diagonal = risk level distribution)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = matrixX + col * cellSize;
        const y = matrixY + (3 - row) * cellSize;
        // Risk intensity increases toward top-right
        const intensity = row + col;
        let fillColor: string;
        if (intensity >= 5) fillColor = RED;
        else if (intensity >= 4) fillColor = ORANGE;
        else if (intensity >= 2) fillColor = YELLOW;
        else fillColor = GREEN;

        // Apply lower opacity via lighter fill for non-relevant cells
        doc.roundedRect(x, y, cellSize - 2, cellSize - 2, 3).fillAndStroke(fillColor, '#ffffff');
        doc.fillOpacity(0.3).rect(x, y, cellSize - 2, cellSize - 2).fill('#ffffff');
        doc.fillOpacity(1);

        // Show count if this is a diagonal cell matching a risk level
        if (row === col) {
          const levelKey = riskLabels[row].toLowerCase();
          const count = riskCounts[levelKey] || 0;
          if (count > 0) {
            doc.fontSize(14).fillColor('#ffffff').text(String(count), x, y + 14, { width: cellSize - 2, align: 'center' });
          }
        }
      }
    }

    // X-axis labels (Likelihood)
    for (let col = 0; col < 4; col++) {
      const x = matrixX + col * cellSize;
      doc.fontSize(7).fillColor('#64748b').text(riskLabels[col], x, matrixY + 4 * cellSize + 4, { width: cellSize, align: 'center' });
    }
    doc.fontSize(8).fillColor('#64748b').text('LIKELIHOOD', matrixX, matrixY + 4 * cellSize + 18, { width: 4 * cellSize, align: 'center' });

    // Y-axis labels
    for (let row = 0; row < 4; row++) {
      const y = matrixY + (3 - row) * cellSize + 18;
      doc.save();
      doc.fontSize(7).fillColor('#64748b').text(riskLabels[row], margin - 5, y, { width: 45, align: 'right' });
      doc.restore();
    }

    doc.y = matrixY + 4 * cellSize + 40;

    // ═══════════════════════════════════════════════
    // Compliance Score Summary (Benchmarks)
    // ═══════════════════════════════════════════════
    if (doc.y > 580) doc.addPage();
    sectionHeading('Benchmark Summary');

    if (benchmarks.length === 0) {
      doc.fontSize(10).fillColor('#64748b').text('No benchmark data available.', margin, doc.y, { width: contentWidth });
    } else {
      for (const bm of benchmarks) {
        if (doc.y > 700) doc.addPage();

        const label = bm.metricName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        doc.fontSize(10).fillColor('#1e293b').text(label, margin, doc.y, { width: contentWidth });

        const barY = doc.y + 4;
        const barWidth = contentWidth - 80;
        const avgPct = Math.min((bm as any).average, 100);
        const medPct = Math.min((bm as any).median, 100);

        // Average bar
        doc.rect(margin, barY, barWidth, 12).fill('#e2e8f0');
        const avgFillColor = avgPct >= 70 ? GREEN : avgPct >= 50 ? YELLOW : RED;
        doc.rect(margin, barY, (barWidth * avgPct) / 100, 12).fill(avgFillColor);
        doc.fontSize(8).fillColor('#1e293b').text(`Avg: ${bm.average}%`, margin + barWidth + 6, barY + 1);

        // Median marker line
        const medianX = margin + (barWidth * medPct) / 100;
        doc.strokeColor(PRIMARY).lineWidth(2).moveTo(medianX, barY - 2).lineTo(medianX, barY + 14).stroke();
        doc.fontSize(7).fillColor(PRIMARY).text(`Med: ${bm.median}`, medianX - 15, barY + 16);

        doc.y = barY + 32;
      }
    }

    // ═══════════════════════════════════════════════
    // Add page footers to all pages
    // ═══════════════════════════════════════════════
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - 35;
      drawHR(footerY);
      doc.fontSize(7).fillColor('#94a3b8').text(
        `AGRC-OS Consultant Portfolio Report  |  ${generatedDate}  |  Page ${i + 1} of ${pageCount}  |  Confidential`,
        margin,
        footerY + 6,
        { width: contentWidth, align: 'center' },
      );
    }

    doc.end();
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildBenchmark(
  metricName: string,
  values: Array<{ clientId: string; value: number }>,
): Benchmark {
  const nums = values.map((v) => v.value);
  const avg = nums.length > 0 ? Math.round(nums.reduce((s, n) => s + n, 0) / nums.length) : 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const median =
    sorted.length === 0
      ? 0
      : sorted.length % 2 === 1
        ? sorted[Math.floor(sorted.length / 2)]
        : Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2);

  return { metricName, values, average: avg, median };
}

function mapRowToFinding(row: Record<string, unknown>): Finding {
  return {

    findingId: row.finding_id,
    consultantId: row.consultant_id,
    clientTenantId: row.client_tenant_id,

    title: row.title,
    description: row.description,

    severity: row.severity,
    frameworkRef: row.framework_ref ?? null,

    recommendation: row.recommendation,

    status: row.status,
    createdAt: row.created_at,
  };
}

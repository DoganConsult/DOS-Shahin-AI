// ============================================
// AGRC-OS — Control Reporting Service
// Report catalog, on-demand report generation,
// and executive summary pack.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ReportType {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: ReportParameter[];
}

export interface ReportParameter {
  name: string;
  label: string;
  type: "string" | "date" | "select";
  required: boolean;
  options?: string[];
}

// ── Report Catalog (static) ──────────────────────────────────────────────────

const REPORT_CATALOG: ReportType[] = [
  {
    id: "control_inventory",
    name: "Control Inventory Report",
    description: "Full listing of all active controls with ownership and status.",
    category: "inventory",
    parameters: [
      { name: "status", label: "Status Filter", type: "select", required: false, options: ["active", "draft", "deprecated", "retired"] },
    ],
  },
  {
    id: "control_effectiveness",
    name: "Control Effectiveness Summary",
    description: "Effectiveness scores across all controls with trend analysis.",
    category: "effectiveness",
    parameters: [
      { name: "from_date", label: "From Date", type: "date", required: false },
      { name: "to_date", label: "To Date", type: "date", required: false },
    ],
  },
  {
    id: "deficiency_tracker",
    name: "Deficiency Tracker Report",
    description: "All open and recently closed deficiencies with remediation status.",
    category: "deficiency",
    parameters: [
      { name: "severity", label: "Severity Filter", type: "select", required: false, options: ["critical", "high", "medium", "low"] },
    ],
  },
  {
    id: "test_results",
    name: "Test Results Report",
    description: "Control test history and pass/fail rates.",
    category: "testing",
    parameters: [
      { name: "from_date", label: "From Date", type: "date", required: false },
      { name: "to_date", label: "To Date", type: "date", required: false },
    ],
  },
  {
    id: "sox_compliance",
    name: "SOX Controls Report",
    description: "SOX-relevant controls with testing status and deficiencies.",
    category: "compliance",
    parameters: [],
  },
  {
    id: "coverage_gaps",
    name: "Control Coverage Gap Report",
    description: "Controls without risk, obligation, or policy mappings.",
    category: "coverage",
    parameters: [],
  },
  {
    id: "executive_summary",
    name: "Executive Summary Pack",
    description: "Board-ready summary of control health, key metrics, and risk exposure.",
    category: "executive",
    parameters: [],
  },
];

// ── Service ───────────────────────────────────────────────────────────────────

export class ControlReportingService {
  /**
   * Returns the static report catalog (available report types).
   */
  async getReportCatalog(): Promise<ReportType[]> {
    return REPORT_CATALOG;
  }

  /**
   * Runs a specific report and returns the result as a JSON buffer.
   * The buffer contains UTF-8 encoded JSON suitable for download.
   */
  async runReport(
    tenantId: string,
    reportType: string,
    params?: Record<string, string>
  ): Promise<Buffer> {
    const schema = tenantSchema(tenantId);

    switch (reportType) {
      case "control_inventory":
        return this.runInventoryReport(schema, params);
      case "control_effectiveness":
        return this.runEffectivenessReport(schema, params);
      case "deficiency_tracker":
        return this.runDeficiencyReport(schema, params);
      case "test_results":
        return this.runTestResultsReport(schema, params);
      case "sox_compliance":
        return this.runSoxReport(schema);
      case "coverage_gaps":
        return this.runCoverageGapsReport(schema);
      case "executive_summary":
        return this.getExecutivePack(tenantId);
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  /**
   * Generates the executive summary pack: a board-ready JSON
   * document with key control health metrics.
   */
  async getExecutivePack(tenantId: string): Promise<Buffer> {
    const schema = tenantSchema(tenantId);

    const [summary, deficiencies, effectiveness] = await Promise.all([
      safeQuery(
        `SELECT
           COUNT(*)::int AS total_controls,
           COUNT(*) FILTER (WHERE is_sox = true)::int AS sox_controls,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active_controls,
           COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated_controls
         FROM ${schema}.controls
         WHERE deleted_at IS NULL`,
        []
      ),
      safeQuery(
        `SELECT
           COUNT(*)::int AS total_open,
           COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
           COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
           COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium,
           COUNT(*) FILTER (WHERE severity = 'low')::int AS low
         FROM ${schema}.control_issues
         WHERE status NOT IN ('closed', 'resolved')`,
        []
      ),
      safeQuery(
        `SELECT
           ROUND(AVG(overall_score)::numeric, 2)::float AS avg_overall,
           ROUND(AVG(design_score)::numeric, 2)::float AS avg_design,
           ROUND(AVG(operating_score)::numeric, 2)::float AS avg_operating
         FROM ${schema}.control_effectiveness_scores
         WHERE created_at > NOW() - INTERVAL '90 days'`,
        []
      ),
    ]);

    const pack = {
      reportType: "executive_summary",
      generatedAt: new Date().toISOString(),
      controlSummary: summary.rows[0] ?? {},
      openDeficiencies: deficiencies.rows[0] ?? {},
      effectivenessLast90d: effectiveness.rows[0] ?? {},
    };

    return Buffer.from(JSON.stringify(pack, null, 2), "utf-8");
  }

  // ── Private report runners ────────────────────────────────────────────────

  private async runInventoryReport(
    schema: string,
    params?: Record<string, string>
  ): Promise<Buffer> {
    const queryParams: unknown[] = [];
    let whereClause = "WHERE deleted_at IS NULL";

    if (params?.status) {
      whereClause += " AND status = $1";
      queryParams.push(params.status);
    }

    const result = await safeQuery(
      `SELECT control_id, title, status, control_type, owner,
              is_sox, frequency, last_tested_at, effectiveness_rating,
              created_at, updated_at
         FROM ${schema}.controls
        ${whereClause}
        ORDER BY title`,
      queryParams
    );

    return Buffer.from(
      JSON.stringify({ reportType: "control_inventory", generatedAt: new Date().toISOString(), data: result.rows }, null, 2),
      "utf-8"
    );
  }

  private async runEffectivenessReport(
    schema: string,
    params?: Record<string, string>
  ): Promise<Buffer> {
    const queryParams: unknown[] = [];
    let whereClause = "WHERE 1=1";
    let paramIdx = 1;

    if (params?.from_date) {
      whereClause += ` AND ces.created_at >= $${paramIdx}`;
      queryParams.push(params.from_date);
      paramIdx++;
    }
    if (params?.to_date) {
      whereClause += ` AND ces.created_at <= $${paramIdx}`;
      queryParams.push(params.to_date);
      paramIdx++;
    }

    const result = await safeQuery(
      `SELECT c.control_id, c.title, ces.design_score, ces.operating_score,
              ces.overall_score, ces.created_at AS scored_at
         FROM ${schema}.control_effectiveness_scores ces
         JOIN ${schema}.controls c ON c.control_id = ces.control_id
        ${whereClause}
        ORDER BY ces.created_at DESC`,
      queryParams
    );

    return Buffer.from(
      JSON.stringify({ reportType: "control_effectiveness", generatedAt: new Date().toISOString(), data: result.rows }, null, 2),
      "utf-8"
    );
  }

  private async runDeficiencyReport(
    schema: string,
    params?: Record<string, string>
  ): Promise<Buffer> {
    const queryParams: unknown[] = [];
    let whereClause = "WHERE 1=1";

    if (params?.severity) {
      whereClause += " AND ci.severity = $1";
      queryParams.push(params.severity);
    }

    const result = await safeQuery(
      `SELECT ci.id, ci.control_id, c.title AS control_title,
              ci.severity, ci.status, ci.assigned_to, ci.due_date,
              ci.description, ci.created_at
         FROM ${schema}.control_issues ci
         LEFT JOIN ${schema}.controls c ON c.control_id = ci.control_id
        ${whereClause}
        ORDER BY ci.created_at DESC`,
      queryParams
    );

    return Buffer.from(
      JSON.stringify({ reportType: "deficiency_tracker", generatedAt: new Date().toISOString(), data: result.rows }, null, 2),
      "utf-8"
    );
  }

  private async runTestResultsReport(
    schema: string,
    params?: Record<string, string>
  ): Promise<Buffer> {
    const queryParams: unknown[] = [];
    let whereClause = "WHERE 1=1";
    let paramIdx = 1;

    if (params?.from_date) {
      whereClause += ` AND ct.tested_at >= $${paramIdx}`;
      queryParams.push(params.from_date);
      paramIdx++;
    }
    if (params?.to_date) {
      whereClause += ` AND ct.tested_at <= $${paramIdx}`;
      queryParams.push(params.to_date);
      paramIdx++;
    }

    const result = await safeQuery(
      `SELECT ct.test_id, ct.control_id, c.title AS control_title,
              ct.test_result, ct.tester, ct.notes, ct.tested_at
         FROM ${schema}.control_tests ct
         JOIN ${schema}.controls c ON c.control_id = ct.control_id
        ${whereClause}
        ORDER BY ct.tested_at DESC`,
      queryParams
    );

    return Buffer.from(
      JSON.stringify({ reportType: "test_results", generatedAt: new Date().toISOString(), data: result.rows }, null, 2),
      "utf-8"
    );
  }

  private async runSoxReport(schema: string): Promise<Buffer> {
    const result = await safeQuery(
      `SELECT c.control_id, c.title, c.status, c.test_status,
              c.last_tested_at, c.effectiveness_rating,
              COUNT(ci.id) FILTER (WHERE ci.status NOT IN ('closed', 'resolved'))::int AS open_deficiencies
         FROM ${schema}.controls c
         LEFT JOIN ${schema}.control_issues ci ON ci.control_id = c.control_id
        WHERE c.is_sox = true AND c.deleted_at IS NULL
        GROUP BY c.control_id
        ORDER BY c.title`,
      []
    );

    return Buffer.from(
      JSON.stringify({ reportType: "sox_compliance", generatedAt: new Date().toISOString(), data: result.rows }, null, 2),
      "utf-8"
    );
  }

  private async runCoverageGapsReport(schema: string): Promise<Buffer> {
    const result = await safeQuery(
      `SELECT c.control_id, c.title, c.status, c.owner,
              EXISTS(SELECT 1 FROM ${schema}.control_risk_links rl WHERE rl.control_id = c.control_id) AS has_risk_link,
              EXISTS(SELECT 1 FROM ${schema}.control_obligation_mappings om WHERE om.control_id = c.control_id) AS has_obligation_link,
              EXISTS(SELECT 1 FROM ${schema}.control_policy_links pl WHERE pl.control_id = c.control_id) AS has_policy_link
         FROM ${schema}.controls c
        WHERE c.deleted_at IS NULL
          AND (
            NOT EXISTS(SELECT 1 FROM ${schema}.control_risk_links rl WHERE rl.control_id = c.control_id)
            OR NOT EXISTS(SELECT 1 FROM ${schema}.control_obligation_mappings om WHERE om.control_id = c.control_id)
            OR NOT EXISTS(SELECT 1 FROM ${schema}.control_policy_links pl WHERE pl.control_id = c.control_id)
          )
        ORDER BY c.title`,
      []
    );

    return Buffer.from(
      JSON.stringify({ reportType: "coverage_gaps", generatedAt: new Date().toISOString(), data: result.rows }, null, 2),
      "utf-8"
    );
  }
}

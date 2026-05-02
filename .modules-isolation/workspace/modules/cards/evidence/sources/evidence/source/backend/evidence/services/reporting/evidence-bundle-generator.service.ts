// ============================================================================
// Shahin — Evidence Bundle Generator
// SOC 2 Type I/II, ISO 27001 Annex A evidence bundles
// Generates structured JSON for audit packages.
// ============================================================================

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// ── SOC 2 Trust Service Criteria ──
const SOC2_TSC = [
  { id: "CC1", name: "Control Environment" },
  { id: "CC2", name: "Communication and Information" },
  { id: "CC3", name: "Risk Assessment" },
  { id: "CC4", name: "Monitoring Activities" },
  { id: "CC5", name: "Control Activities" },
  { id: "CC6", name: "Logical and Physical Access Controls" },
  { id: "CC7", name: "System Operations" },
  { id: "CC8", name: "Change Management" },
  { id: "CC9", name: "Risk Mitigation" },
  { id: "A1", name: "Availability" },
  { id: "C1", name: "Confidentiality" },
  { id: "P1", name: "Processing Integrity" },
  { id: "PI1", name: "Privacy" },
];

// ── ISO 27001 Annex A Domains ──
const ISO27001_DOMAINS = [
  { id: "A.5", name: "Information Security Policies" },
  { id: "A.6", name: "Organization of Information Security" },
  { id: "A.7", name: "Human Resource Security" },
  { id: "A.8", name: "Asset Management" },
  { id: "A.9", name: "Access Control" },
  { id: "A.10", name: "Cryptography" },
  { id: "A.11", name: "Physical and Environmental Security" },
  { id: "A.12", name: "Operations Security" },
  { id: "A.13", name: "Communications Security" },
  { id: "A.14", name: "System Acquisition, Development and Maintenance" },
  { id: "A.15", name: "Supplier Relationships" },
  { id: "A.16", name: "Information Security Incident Management" },
  { id: "A.17", name: "Business Continuity Management" },
  { id: "A.18", name: "Compliance" },
];

export interface BundleSection {
  criterionId: string;
  criterionName: string;
  controls: {
    controlId: string;
    controlTitle: string;
    status: string;
    evidenceItems: { evidenceId: string; title: string; status: string; submittedAt: string }[];
    exceptions: { exceptionId: string; reason: string; approvedBy: string }[];
  }[];
  coveragePercent: number;
}

export interface SOC2Bundle {
  type: "soc2-type1" | "soc2-type2";
  generatedAt: string;
  tenantId: string;
  observationPeriod?: { from: string; to: string };
  sections: BundleSection[];
  summary: { totalCriteria: number; coveredCriteria: number; totalControls: number; totalEvidence: number; overallCoverage: number };
}

/**
 * Generate SOC 2 Type I bundle (point-in-time design effectiveness).
 */
export async function generateSOC2Type1(tenantId: string): Promise<SOC2Bundle> {
  return generateSOC2Bundle(tenantId, "soc2-type1");
}

/**
 * Generate SOC 2 Type II bundle (operating effectiveness over a period).
 */
export async function generateSOC2Type2(
  tenantId: string,
  from: string,
  to: string
): Promise<SOC2Bundle> {
  return generateSOC2Bundle(tenantId, "soc2-type2", from, to);
}

async function generateSOC2Bundle(
  tenantId: string,
  type: "soc2-type1" | "soc2-type2",
  from?: string,
  to?: string
): Promise<SOC2Bundle> {
  const schema = tenantSchema(tenantId);
  const sections: BundleSection[] = [];
  let totalControls = 0;
  let totalEvidence = 0;

  for (const tsc of SOC2_TSC) {
    // Find controls mapped to this TSC (by matching control_id prefix or mapped_registry_nodes)
    const controlRes = await safeQuery(
      `SELECT control_id, control_title, status
       FROM "${schema}".controls
       WHERE control_id LIKE $1 OR control_title ILIKE $2
       ORDER BY control_id
       LIMIT 50`,
      [`${tsc.id}%`, `%${tsc.name}%`]
    );

    const controls = [];
    for (const ctrl of controlRes.rows) {
      totalControls++;

      // Get evidence for this control
      let evidenceQuery = `SELECT evidence_id, title, status, created_at
         FROM "${schema}".evidence
         WHERE control_id = $1`;
      const evidenceParams: unknown[] = [ctrl.control_id];

      if (type === "soc2-type2" && from && to) {
        evidenceQuery += ` AND created_at BETWEEN $2 AND $3`;
        evidenceParams.push(from, to);
      }
      evidenceQuery += ` ORDER BY created_at DESC`;

      const evidenceRes = await safeQuery(evidenceQuery, evidenceParams);
      totalEvidence += evidenceRes.rows.length;

      // Get exceptions
      const excRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT exception_id, reason, approved_by
         FROM "${schema}".control_exceptions
         WHERE control_id = $1 AND status = 'approved'
         LIMIT 10`,
        [ctrl.control_id]
      ), { tenantId: tenantId, operation: 'query control_exceptions' });

      controls.push({
        controlId: ctrl.control_id,
        controlTitle: ctrl.control_title || ctrl.control_id,
        status: ctrl.status || "active",
        evidenceItems: evidenceRes.rows.map((e: GenericRow) => ({
          evidenceId: e.evidence_id,
          title: e.title || "",
          status: e.status,
          submittedAt: e.created_at,
        })),
        exceptions: excRes.rows.map((ex: any) => ({
          exceptionId: ex.exception_id,
          reason: ex.reason || "",
          approvedBy: ex.approved_by || "",
        })),
      });
    }

    const coveredControls = controls.filter((c) => c.evidenceItems.length > 0).length;
    sections.push({
      criterionId: tsc.id,
      criterionName: tsc.name,
      controls,
      coveragePercent: controls.length > 0 ? Math.round((coveredControls / controls.length) * 100) : 0,
    });
  }

  const coveredCriteria = sections.filter((s) => s.controls.length > 0 && s.coveragePercent > 0).length;
  const overallCoverage = sections.length > 0
    ? Math.round(sections.reduce((s, sec) => s + sec.coveragePercent, 0) / sections.length)
    : 0;

  return {
    type,
    generatedAt: new Date().toISOString(),
    tenantId,
    ...(type === "soc2-type2" && from && to ? { observationPeriod: { from, to } } : {}),
    sections,
    summary: {
      totalCriteria: SOC2_TSC.length,
      coveredCriteria,
      totalControls,
      totalEvidence,
      overallCoverage,
    },
  };
}

// ── ISO 27001 Annex A ──

export interface ISO27001AnnexABundle {
  generatedAt: string;
  tenantId: string;
  domains: {
    domainId: string;
    domainName: string;
    controls: {
      controlId: string;
      controlTitle: string;
      applicable: boolean;
      justification: string;
      implementationStatus: string;
      evidenceCount: number;
    }[];
    coveragePercent: number;
  }[];
  summary: { totalDomains: number; totalControls: number; applicableControls: number; evidencedControls: number; overallCompliance: number };
}

/**
 * Generate ISO 27001 Annex A Statement of Applicability with evidence mapping.
 */
export async function generateISO27001AnnexA(tenantId: string): Promise<ISO27001AnnexABundle> {
  const schema = tenantSchema(tenantId);
  const domains = [];
  let totalControls = 0;
  let applicableControls = 0;
  let evidencedControls = 0;

  for (const domain of ISO27001_DOMAINS) {
    const controlRes = await safeQuery(
      `SELECT c.control_id, c.control_title, c.status,
              (SELECT COUNT(*) FROM "${schema}".evidence e
               WHERE e.control_id = c.control_id
                 AND e.status NOT IN ('expired', 'rejected', 'archived')) as evidence_count
       FROM "${schema}".controls c
       WHERE c.control_id LIKE $1 OR c.framework_code ILIKE 'iso%27001%'
       ORDER BY c.control_id
       LIMIT 50`,
      [`${domain.id}%`]
    );

    const controls = controlRes.rows.map((c: GenericRow) => {
      totalControls++;
      const evCount = parseInt(c.evidence_count || "0");
      const applicable = c.status !== "not_applicable";
      if (applicable) applicableControls++;
      if (evCount > 0) evidencedControls++;

      return {
        controlId: c.control_id,
        controlTitle: c.control_title || c.control_id,
        applicable,
        justification: applicable ? "Required by security policy" : "Not applicable to scope",
        implementationStatus: c.status || "planned",
        evidenceCount: evCount,
      };
    });

    const covered = controls.filter((c) => c.evidenceCount > 0 && c.applicable).length;
    const applicableInDomain = controls.filter((c) => c.applicable).length;

    domains.push({
      domainId: domain.id,
      domainName: domain.name,
      controls,
      coveragePercent: applicableInDomain > 0 ? Math.round((covered / applicableInDomain) * 100) : 0,
    });
  }

  const overallCompliance = applicableControls > 0
    ? Math.round((evidencedControls / applicableControls) * 100)
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    tenantId,
    domains,
    summary: {
      totalDomains: ISO27001_DOMAINS.length,
      totalControls,
      applicableControls,
      evidencedControls,
      overallCompliance,
    },
  };
}

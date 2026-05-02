import { safeQuery } from "@dos/db";

/**
 * Compliance Workspace Service — AGRC-OS
 *
 * Barrel re-export for backward compatibility.
 * The implementation has been decomposed into smaller modules:
 *
 *   - compliance.utils.ts                          — shared helpers & types
 *   - compliance-workspace-overview.service.ts     — overview, audit readiness, allowed actions, health
 *   - compliance-frameworks-obligations.service.ts — frameworks, domains, obligations
 *   - compliance-gaps-roadmap.service.ts           — gaps, roadmap, milestones
 *   - compliance-assessment-findings.service.ts    — assessment, findings, controls register, monitoring, savings
 *   - compliance-audit-export.service.ts           — audit package, export, calendar, regulatory changes, drift
 */

export * from "../../misc/compliance.utils.js";
export * from "../reporting/compliance-workspace-overview.service";
export * from "./compliance-frameworks-obligations.service";
export * from "../reporting/compliance-gaps-roadmap.service";
export * from "../assessments/compliance-assessment-findings.service";
export * from "../assessments/compliance-audit-export.service";

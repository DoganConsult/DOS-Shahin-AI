// ============================================
// AI-Governance — Digital Twin Service (re-export)
// Canonical implementation lives at ../digital/digital-twin.service.ts
// This file re-exports for backward compatibility with
// any imports targeting the misc/ path.
// Owner: Product — ai-governance module (Law 2)
// ============================================
export * from '../digital/digital-twin.types';
export * from '../digital/digital-twin-simulation.service';
export * from '../digital/digital-twin-impact.service';
export * from '../digital/digital-twin-org-analysis.service';
// Re-export barrel default exports
export { analyzeOrgStructureImpact } from '../digital/digital-twin.service';
//# sourceMappingURL=digital-twin.service.js.map
// ============================================
// Audit Package Generation Workflow
// Automated audit package compilation with
// evidence collection, traceability matrix,
// and procurement-ready export.
// Queue: agrc-reports
// ============================================

import {
  defineSignal,
  defineQuery,
  setHandler,
  proxyActivities,
  condition,
} from '@temporalio/workflow';
import type { AuditActivities } from '../../activities/audit.activities';
import { toErrorMessage } from '@dos/platform-core/resilience';

const acts = proxyActivities<AuditActivities>({
  startToCloseTimeout: '45m',
  retry: {
    maximumAttempts: 2,
    initialInterval: '10s',
    backoffCoefficient: 2,
    maximumInterval: '120s',
  },
});

// ── Signals ────────────────────────────────────────────────────────────────────

export const cancelPackageGenerationSignal = defineSignal('cancelPackageGeneration');

// ── Queries ────────────────────────────────────────────────────────────────────

export const packageStatusQuery = defineQuery<PackageStatus>('packageStatus');
export const packageProgressQuery = defineQuery<PackageProgress>('packageProgress');

// ── Input / Output ─────────────────────────────────────────────────────────────

export interface AuditPackageInput {
  tenantId: string;
  packageId: string;
  frameworkVersionId: string;
  /** Controls to include (empty = all applicable) */
  controlIds?: string[];
  /** Export formats: PDF, XLSX, ZIP */
  exportFormats: ('PDF' | 'XLSX' | 'ZIP')[];
  /** Include evidence artifacts */
  includeEvidence: boolean;
  /** Include traceability matrix */
  includeTraceability: boolean;
}

export interface AuditPackageResult {
  packageId: string;
  status: 'completed' | 'cancelled' | 'failed';
  controlsIncluded: number;
  evidenceIncluded: number;
  exportLocations: Record<string, string>;
  durationMs: number;
}

export interface PackageStatus {
  status: 'generating' | 'completed' | 'cancelled' | 'failed';
  currentPhase: string;
  controlsIncluded: number;
  evidenceIncluded: number;
  exportFormats: string[];
}

export interface PackageProgress {
  phase: string;
  progressPercent: number;
  controlsProcessed: number;
  totalControls: number;
  evidenceCollected: number;
}

// ── Workflow ────────────────────────────────────────────────────────────────────

/**
 * Audit package generation workflow that:
 * 1. Scopes controls and evidence
 * 2. Collects evidence artifacts
 * 3. Builds traceability matrix
 * 4. Generates exports (PDF/XLSX/ZIP)
 */
export async function auditPackageWorkflow(
  input: AuditPackageInput,
): Promise<AuditPackageResult> {
  const startTime = Date.now();
  let cancelled = false;
  let currentPhase = 'initializing';
  let controlsIncluded = 0;
  let evidenceIncluded = 0;
  let totalControls = 0;
  const exportLocations: Record<string, string> = {};

  setHandler(cancelPackageGenerationSignal, () => {
    cancelled = true;
  });

  setHandler(packageStatusQuery, () => ({
    status: cancelled ? 'cancelled' : 'generating',
    currentPhase,
    controlsIncluded,
    evidenceIncluded,
    exportFormats: input.exportFormats,
  }));

  setHandler(packageProgressQuery, () => {
    const progressPercent = totalControls > 0 ? (controlsIncluded / totalControls) * 100 : 0;
    return {
      phase: currentPhase,
      progressPercent,
      controlsProcessed: controlsIncluded,
      totalControls,
      evidenceCollected: evidenceIncluded,
    };
  });

  try {
    // ── Phase 1: Scope controls and evidence ────────────────────────────────────
    currentPhase = 'scoping';
    await condition(() => !cancelled);
    if (cancelled) throw new Error('Package generation cancelled');

    const scopeResult = await acts.scopeAuditPackage(
      input.tenantId,
      input.packageId,
      input.frameworkVersionId,
      input.controlIds,
    );
    totalControls = scopeResult.controlIds.length;

    // ── Phase 2: Collect evidence artifacts ──────────────────────────────────────
    let evidenceIds: string[] = [];
    if (input.includeEvidence) {
      currentPhase = 'collecting_evidence';
      await condition(() => !cancelled);
      if (cancelled) throw new Error('Package generation cancelled');

      const evidenceResult = await acts.collectEvidenceArtifacts(
        input.tenantId,
        input.packageId,
        scopeResult.controlIds,
      );
      evidenceIds = evidenceResult.evidenceIds;
      evidenceIncluded = evidenceIds.length;
    }

    // ── Phase 3: Build traceability matrix ──────────────────────────────────────
    if (input.includeTraceability) {
      currentPhase = 'building_traceability';
      await condition(() => !cancelled);
      if (cancelled) throw new Error('Package generation cancelled');

      await acts.buildTraceabilityMatrix(
        input.tenantId,
        input.packageId,
        scopeResult.controlIds,
        evidenceIds,
      );
    }

    // ── Phase 4: Generate exports ──────────────────────────────────────────────
    currentPhase = 'generating_exports';
    controlsIncluded = totalControls;

    for (const format of input.exportFormats) {
      await condition(() => !cancelled);
      if (cancelled) throw new Error('Package generation cancelled');

      const exportResult = await acts.generatePackageExport(
        input.tenantId,
        input.packageId,
        format,
        input.includeTraceability,
      );
      exportLocations[format] = exportResult.exportPath;
    }

    // ── Phase 5: Finalize package ────────────────────────────────────────────────
    currentPhase = 'finalizing';
    // Lifecycle auth enforced inside activity function (Patch 7 §2.13)
    await acts.finalizeAuditPackage(input.tenantId, input.packageId, {
      controlsIncluded,
      evidenceIncluded,
      exportLocations,
    });

    return {
      packageId: input.packageId,
      status: 'completed',
      controlsIncluded,
      evidenceIncluded,
      exportLocations,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    await acts.markPackageFailed(input.tenantId, input.packageId, toErrorMessage(err));
    return {
      packageId: input.packageId,
      status: cancelled ? 'cancelled' : 'failed',
      controlsIncluded,
      evidenceIncluded,
      exportLocations,
      durationMs: Date.now() - startTime,
    };
  }
}

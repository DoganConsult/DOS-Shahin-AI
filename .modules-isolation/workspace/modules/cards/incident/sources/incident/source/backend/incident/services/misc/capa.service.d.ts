export type CapaType = 'corrective' | 'preventive' | 'improvement';
export type CapaStatus = 'open' | 'investigating' | 'action_planned' | 'implementing' | 'verification' | 'closed' | 'reopened';
export type CapaPriority = 'critical' | 'high' | 'medium' | 'low';
export type CapaSourceType = 'audit_finding' | 'test_failure' | 'incident' | 'complaint' | 'observation' | 'risk_assessment' | 'management_review' | 'other';
export type EffectivenessRating = 'effective' | 'partial' | 'ineffective';
export interface CapaRecord {
    capaId: string;
    capaType: CapaType;
    titleEn: string;
    titleAr?: string;
    description?: string;
    sourceType: CapaSourceType;
    sourceId?: string;
    rootCauseAnalysis?: string;
    correctiveAction?: string;
    preventiveAction?: string;
    status: CapaStatus;
    priority: CapaPriority;
    assignedTo?: string;
    dueDate?: string;
    completedDate?: string;
    effectivenessReview?: string;
    effectivenessRating?: EffectivenessRating;
    effectivenessReviewedBy?: string;
    effectivenessReviewedAt?: string;
    evidenceIds?: string[];
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    statusLog?: CapaStatusLogEntry[];
    linkedEntities?: CapaLinkedEntity[];
}
export interface CapaStatusLogEntry {
    logId: string;
    capaId: string;
    fromStatus: CapaStatus | null;
    toStatus: CapaStatus;
    changedBy: string;
    reason?: string;
    changedAt: string;
}
export interface CapaLinkedEntity {
    entityType: string;
    entityId: string;
    entityTitle?: string;
}
export interface CapaInput {
    capaType: CapaType;
    titleEn: string;
    titleAr?: string;
    description?: string;
    sourceType: CapaSourceType;
    sourceId?: string;
    rootCauseAnalysis?: string;
    correctiveAction?: string;
    preventiveAction?: string;
    priority?: CapaPriority;
    assignedTo?: string;
    dueDate?: string;
    createdBy?: string;
}
export interface CapaFilters {
    status?: CapaStatus;
    capaType?: CapaType;
    priority?: CapaPriority;
    sourceType?: CapaSourceType;
    assignedTo?: string;
    overdue?: boolean;
}
export interface CapaDashboard {
    tenantId: string;
    generatedAt: string;
    byStatus: Record<CapaStatus, number>;
    byType: Record<CapaType, number>;
    byPriority: Record<CapaPriority, number>;
    overdueCount: number;
    total: number;
    avgDaysToClose: number;
}
/**
 * Create a new CAPA record linked to a source entity.
 */
export declare function createCAPA(tenantId: string, input: CapaInput): Promise<CapaRecord>;
/**
 * Update a CAPA record's fields (not status -- use transitionStatus for that).
 */
export declare function updateCAPA(tenantId: string, capaId: string, updates: Partial<CapaInput>): Promise<CapaRecord | null>;
/**
 * Get a single CAPA record with its status log and linked entities.
 */
export declare function getCAPA(tenantId: string, capaId: string): Promise<CapaRecord | null>;
/**
 * List CAPAs with filtering, pagination, and priority sorting.
 */
export declare function listCAPAs(tenantId: string, filters?: CapaFilters, limit?: number, offset?: number): Promise<{
    records: CapaRecord[];
    total: number;
}>;
/**
 * Transition a CAPA's status using the state machine.
 * Validates the transition and records the change in the status log.
 */
export declare function transitionStatus(tenantId: string, capaId: string, newStatus: CapaStatus, reason: string, changedBy: string): Promise<CapaRecord>;
/**
 * Record an effectiveness review for a CAPA in verification status.
 */
export declare function recordEffectivenessReview(tenantId: string, capaId: string, result: EffectivenessRating, notes: string, evidenceIds?: string[]): Promise<CapaRecord>;
/**
 * Get all CAPAs that are past their due date and not closed.
 */
export declare function getOverdueCAPAs(tenantId: string): Promise<CapaRecord[]>;
/**
 * Get CAPA dashboard with aggregated counts by status, type, priority, and overdue.
 */
export declare function getCAPADashboard(tenantId: string): Promise<CapaDashboard>;
/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use createCAPA instead */
export declare const createCapa: typeof createCAPA;
/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use getCAPA instead */
export declare const getCapa: typeof getCAPA;
/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use listCAPAs instead */
export declare function listCapas(tenantId: string, filters?: {
    status?: CapaStatus;
    type?: CapaType;
    controlId?: string;
    findingId?: string;
}, limit?: number, offset?: number): Promise<{
    records: CapaRecord[];
    total: number;
}>;
/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use updateCAPA instead */
export declare const updateCapa: typeof updateCAPA;
/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use transitionStatus instead */
export declare function updateCapaStatus(tenantId: string, capaId: string, newStatus: CapaStatus, updatedBy: string): Promise<void>;
/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use recordEffectivenessReview instead */
export declare function reviewEffectiveness(tenantId: string, capaId: string, review: string, rating: EffectivenessRating, _reviewedBy: string): Promise<void>;
/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement action-item.service.ts Use getOverdueCAPAs instead */
export declare function markOverdueCapas(tenantId: string): Promise<number>;

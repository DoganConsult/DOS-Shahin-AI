/**
 * Public Foundation entity types — pure TypeScript, zero runtime.
 *
 * Re-exported by `@dos/module-foundation/contracts` so peer modules can consume
 * Foundation domain types without reaching into module internals.
 *
 * NOTE: This file is the typed boundary between Foundation and other modules.
 * Do NOT add runtime code here. For runtime constants, use
 * `./foundation.constants`.
 */
export type FoundationEntityType = 'organization' | 'business_unit' | 'department' | 'position' | 'legal_entity';
export type FoundationStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'active' | 'suspended' | 'archived';
/** DB-shape (snake_case) row representation. Prefer FoundationNodeResponseDTO across module boundaries. */
export interface FoundationNode {
    id: string;
    tenant_id: string;
    entity_type: FoundationEntityType;
    parent_id: string | null;
    name_en: string;
    name_ar: string | null;
    code: string;
    status: FoundationStatus;
    level: number;
    path: string;
    owner_id: string | null;
    metadata: Record<string, unknown>;
    created_by: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}
export interface FoundationEventPayload {
    tenantId: string;
    entityType: FoundationEntityType;
    entityId: string;
    triggeredBy: string;
    timestamp: string;
    data: Record<string, unknown>;
}

/**
 * Packs -- Response Mappers
 *
 * Maps internal data structures to API response shapes.
 * Audience-aware field filtering, audit redaction, and export shaping.
 *
 * @owner DOS
 * @module packs
 */

// ── Audience Levels ─────────────────────────────────────────────────
export type AudienceLevel = 'public' | 'internal' | 'admin';

const SENSITIVE_FIELDS: readonly string[] = ['install_log', 'manifest_json', 'policy_snapshot'];
const ADMIN_ONLY_FIELDS: readonly string[] = ['tenant_id', 'deleted_at', 'internal_notes'];

// ── Catalog Entry Mapper ────────────────────────────────────────────

export interface CatalogEntryDTO {
  packId: string;
  code: string;
  version: string;
  nameEn: string;
  nameAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  packType: string;
  packLayer: number;
  dependsOn: string[];
  isActive: boolean;
  isSystem: boolean;
}

/**
 * Map a pack registry row to a catalog entry DTO.
 */
export function toCatalogEntry(row: Record<string, unknown>): CatalogEntryDTO {
  return {
    packId: row.pack_id as string,
    code: row.code as string,
    version: row.version as string,
    nameEn: (row.name_en as string) ?? '',
    nameAr: (row.name_ar as string) ?? null,
    descriptionEn: (row.description_en as string) ?? null,
    descriptionAr: (row.description_ar as string) ?? null,
    packType: row.pack_type as string,
    packLayer: (row.pack_layer as number) ?? 0,
    dependsOn: (row.depends_on as string[]) ?? [],
    isActive: !!(row.is_active),
    isSystem: !!(row.is_system),
  };
}

// ── Installation Record Mapper ──────────────────────────────────────

export interface InstallationRecordDTO {
  installationId: string;
  tenantId: string;
  packCode: string;
  packVersion: string;
  status: string;
  installedBy: string;
  installedAt: string;
  installDurationMs: number | null;
  artifactCounts: Record<string, number>;
}

/**
 * Map a tenant_pack_installations row to an installation record DTO.
 */
export function toInstallationRecord(row: Record<string, unknown>): InstallationRecordDTO {
  return {
    installationId: row.installation_id as string,
    tenantId: row.tenant_id as string,
    packCode: row.pack_code as string,
    packVersion: row.pack_version as string,
    status: row.status as string,
    installedBy: (row.installed_by as string) ?? 'system',
    installedAt: row.installed_at as string,
    installDurationMs: (row.install_duration_ms as number) ?? null,
    artifactCounts: (row.artifact_counts as Record<string, number>) ?? {},
  };
}

// ── Dashboard Summary Mapper ────────────────────────────────────────

export interface DashboardSummaryDTO {
  totalPacks: number;
  installedPacks: number;
  availablePacks: number;
  outdatedPacks: number;
  failedInstallations: number;
  lastInstallDate: string | null;
}

/**
 * Map metrics data to a dashboard summary DTO.
 */
export function toDashboardSummary(metrics: Record<string, unknown>): DashboardSummaryDTO {
  return {
    totalPacks: (metrics.totalInstalled as number) + (metrics.totalAvailable as number),
    installedPacks: (metrics.totalInstalled as number) ?? 0,
    availablePacks: (metrics.totalAvailable as number) ?? 0,
    outdatedPacks: (metrics.outdatedPacks as number) ?? 0,
    failedInstallations: (metrics.failedInstallations as number) ?? 0,
    lastInstallDate: (metrics.lastInstallDate as string) ?? null,
  };
}

// ── Audience-Aware Shaping ──────────────────────────────────────────

/**
 * Shape an entity for the given audience level.
 * Removes sensitive and admin-only fields for non-admin audiences.
 */
export function toAudienceShaped(
  entity: Record<string, unknown>,
  audience: AudienceLevel,
): Record<string, unknown> {
  const result = { ...entity };
  if (audience === 'public') {
    for (const f of SENSITIVE_FIELDS) delete result[f];
    for (const f of ADMIN_ONLY_FIELDS) delete result[f];
  }
  if (audience === 'internal') {
    for (const f of ADMIN_ONLY_FIELDS) delete result[f];
  }
  return result;
}

/**
 * Return full entity for admin audience.
 */
export function toAdminResponse(entity: Record<string, unknown>): Record<string, unknown> {
  return { ...entity };
}

// ── Audit Redaction ─────────────────────────────────────────────────

/**
 * Redact sensitive fields for audit logging.
 */
export function redactForAudit(entity: Record<string, unknown>): Record<string, unknown> {
  const result = { ...entity };
  for (const f of SENSITIVE_FIELDS) {
    if (f in result) result[f] = '[REDACTED]';
  }
  return result;
}

/**
 * Map a raw audit row to a typed audit entry.
 */
export function toAuditEntry(raw: Record<string, unknown>): {
  entityId: string;
  entityType: string;
  action: string;
  actorId: string;
  actorType: string;
  timestamp: string;
  previousState?: string;
  newState?: string;
  metadata?: Record<string, unknown>;
} {
  return {
    entityId: raw.entity_id as string,
    entityType: raw.entity_type as string,
    action: raw.action as string,
    actorId: raw.actor_id as string,
    actorType: (raw.actor_type as string) ?? 'user',
    timestamp: raw.timestamp as string,
    previousState: raw.previous_state as string | undefined,
    newState: raw.new_state as string | undefined,
    metadata: raw.metadata as Record<string, unknown> | undefined,
  };
}

import type { Asset, AssetCreateInput } from '@dos/types/asset';
import type { GenericRow } from '@dos/types';
export declare function toEntity(row: GenericRow): Asset;
export declare function toEntityList(rows: GenericRow[]): Asset[];
export declare function toCreateInput(dto: Record<string, unknown>, tenantId: string, userId: string): AssetCreateInput;
export declare function toApiResponse(entity: Asset): Record<string, unknown>;
export declare function toApiListResponse(entities: Asset[], total: number): {
    data: Record<string, unknown>[];
    total: number;
};
export type AudienceLevel = 'public' | 'internal' | 'admin' | 'ai_agent' | 'export';
export declare function toAudienceShaped(entity: Record<string, unknown>, audience: AudienceLevel): Record<string, unknown>;
export declare function toAdminResponse(entity: Record<string, unknown>): Record<string, unknown>;
export declare function toListItem(entity: Record<string, unknown>): Record<string, unknown>;
export declare function redactForAudit(entity: Record<string, unknown>): Record<string, unknown>;
export declare function stripFieldsForExport(entity: Record<string, unknown>, excludeFields?: string[]): Record<string, unknown>;
export declare function toImportEntity(row: Record<string, unknown>, tenantId: string, userId: string): Record<string, unknown>;

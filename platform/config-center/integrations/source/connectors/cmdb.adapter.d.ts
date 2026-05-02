import type { ConnectorConfig, EvidenceSubmission } from '@dos/types';
import { BaseAdapter, type AuthToken, type ExtractionResult } from './base.adapter';
export declare class CMDBAdapter extends BaseAdapter {
    authenticate(config: ConnectorConfig): Promise<AuthToken>;
    extract(config: ConnectorConfig, query?: Record<string, unknown>): Promise<ExtractionResult>;
    map(raw: Record<string, unknown>[], fieldMapping?: Record<string, string>): EvidenceSubmission[];
}

/**
 * DOS Platform — Data Classification Registry
 *
 * PDPL (Saudi Personal Data Protection Law) & GDPR compliance.
 * Maps every database table to its data classification level,
 * PII inventory, and regulatory article references.
 *
 * Source: ops/migrations/000–010 (183 tables total).
 *
 * Classification levels (ISO 27001 / NCA ECC aligned):
 *   public       — no restrictions
 *   internal     — org-internal, no PII
 *   confidential — contains PII or sensitive business data
 *   restricted   — authentication secrets, tokens, credentials
 */
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';
export interface TableClassification {
    /** Fully qualified table name (schema.table) */
    table: string;
    classification: DataClassification;
    containsPII: boolean;
    /** PII field names within this table */
    piiFields?: string[];
    /** Saudi PDPL article reference */
    pdplArticle?: string;
    /** EU GDPR article reference */
    gdprArticle?: string;
    /** Data retention in days (0 = indefinite / policy-driven) */
    retentionDays?: number;
    notes?: string;
}
export declare const DATA_CLASSIFICATION_REGISTRY: TableClassification[];
/** All tables that contain PII */
export declare const PII_TABLES: TableClassification[];
/** All restricted-classification tables */
export declare const RESTRICTED_TABLES: TableClassification[];
/** Lookup by table name */
export declare function getClassification(table: string): TableClassification | undefined;
/** All unique PII field names across the registry */
export declare const ALL_PII_FIELDS: string[];

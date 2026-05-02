import type { DbPool } from '../db.js';

/**
 * Wave 11h-§12 i18n governance — manager covering 5 §12 tables (migration
 * 20260502_0117): translation_namespaces, translation_versions,
 * translation_overrides, locale_user_preferences, rtl_validation_results.
 */
export class UiOsI18nExtManager {
  constructor(private readonly pool: DbPool) {}

  // ── Namespaces ──────────────────────────────────────────────
  async listNamespaces(tenantId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, namespace_code, description_key, is_active
         FROM dos.ui_translation_namespaces
        WHERE tenant_id=$1 ORDER BY namespace_code`, [tenantId]);
    return rows;
  }
  async upsertNamespace(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_translation_namespaces
        (tenant_id, namespace_code, description_key, is_active)
       VALUES ($1,$2,$3,COALESCE($4,TRUE))
       ON CONFLICT (tenant_id, namespace_code) DO UPDATE
         SET description_key=EXCLUDED.description_key,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, namespace_code, is_active`,
      [tenantId, body.namespace_code, body.description_key ?? null, body.is_active ?? null]);
    return rows[0];
  }
  async deleteNamespace(tenantId: string, namespaceId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_translation_namespaces WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, namespaceId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Versions ────────────────────────────────────────────────
  async listVersions(tenantId: string, namespaceId: string, locale?: string | null) {
    const { rows } = await this.pool.query(
      `SELECT id::text, locale, version, is_current, published_at, source_url
         FROM dos.ui_translation_versions
        WHERE tenant_id=$1 AND namespace_id=$2::uuid
          AND ($3::text IS NULL OR locale=$3)
        ORDER BY locale, published_at DESC NULLS LAST`,
      [tenantId, namespaceId, locale ?? null]);
    return rows;
  }
  async upsertVersion(tenantId: string, namespaceId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_translation_versions
        (tenant_id, namespace_id, locale, version, is_current, published_at, source_url)
       VALUES ($1,$2::uuid,$3,$4,COALESCE($5,FALSE),$6::timestamptz,$7)
       ON CONFLICT (namespace_id, locale, version) DO UPDATE
         SET is_current=EXCLUDED.is_current,
             published_at=EXCLUDED.published_at,
             source_url=EXCLUDED.source_url, updated_at=NOW()
       RETURNING id::text, locale, version, is_current`,
      [tenantId, namespaceId, body.locale, body.version,
       body.is_current ?? null, body.published_at ?? null, body.source_url ?? null]);
    return rows[0];
  }
  async setCurrentVersion(tenantId: string, namespaceId: string, locale: string, version: string) {
    await this.pool.query('BEGIN');
    try {
      await this.pool.query(
        `UPDATE dos.ui_translation_versions SET is_current=FALSE, updated_at=NOW()
          WHERE tenant_id=$1 AND namespace_id=$2::uuid AND locale=$3 AND is_current=TRUE`,
        [tenantId, namespaceId, locale]);
      const { rows } = await this.pool.query(
        `UPDATE dos.ui_translation_versions SET is_current=TRUE, updated_at=NOW()
          WHERE tenant_id=$1 AND namespace_id=$2::uuid AND locale=$3 AND version=$4
          RETURNING id::text, version, is_current`,
        [tenantId, namespaceId, locale, version]);
      await this.pool.query('COMMIT');
      return rows[0] ?? null;
    } catch (e) { await this.pool.query('ROLLBACK'); throw e; }
  }

  // ── Overrides ───────────────────────────────────────────────
  async listOverrides(tenantId: string, namespaceId: string, locale?: string | null) {
    const { rows } = await this.pool.query(
      `SELECT id::text, locale, translation_key, override_value, is_active, updated_at
         FROM dos.ui_translation_overrides
        WHERE tenant_id=$1 AND namespace_id=$2::uuid
          AND ($3::text IS NULL OR locale=$3)
        ORDER BY locale, translation_key`,
      [tenantId, namespaceId, locale ?? null]);
    return rows;
  }
  async upsertOverride(tenantId: string, userId: string, namespaceId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_translation_overrides
        (tenant_id, namespace_id, locale, translation_key, override_value, is_active,
         created_by, updated_by)
       VALUES ($1,$2::uuid,$3,$4,$5,COALESCE($6,TRUE),$7,$7)
       ON CONFLICT (tenant_id, namespace_id, locale, translation_key) DO UPDATE
         SET override_value=EXCLUDED.override_value,
             is_active=EXCLUDED.is_active,
             updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING id::text, translation_key, is_active`,
      [tenantId, namespaceId, body.locale, body.translation_key,
       body.override_value, body.is_active ?? null, userId]);
    return rows[0];
  }
  async deleteOverride(tenantId: string, overrideId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_translation_overrides WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, overrideId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Locale user preferences ─────────────────────────────────
  async getLocalePreferences(tenantId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, locale, direction::text AS direction, timezone,
              date_format, time_format, number_format, updated_at
         FROM dos.ui_locale_user_preferences
        WHERE tenant_id=$1 AND user_id=$2 LIMIT 1`,
      [tenantId, userId]);
    return rows[0] ?? null;
  }
  async upsertLocalePreferences(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_locale_user_preferences
        (tenant_id, user_id, locale, direction, timezone,
         date_format, time_format, number_format)
       VALUES ($1,$2,$3,COALESCE($4,'ltr')::dos.ui_locale_direction_t,
               COALESCE($5,'Asia/Riyadh'),$6,$7,$8)
       ON CONFLICT (tenant_id, user_id) DO UPDATE
         SET locale=EXCLUDED.locale, direction=EXCLUDED.direction,
             timezone=EXCLUDED.timezone,
             date_format=EXCLUDED.date_format, time_format=EXCLUDED.time_format,
             number_format=EXCLUDED.number_format, updated_at=NOW()
       RETURNING id::text, locale, direction::text AS direction, timezone`,
      [tenantId, userId, body.locale, body.direction ?? null, body.timezone ?? null,
       body.date_format ?? null, body.time_format ?? null, body.number_format ?? null]);
    return rows[0];
  }

  // ── RTL validation results ──────────────────────────────────
  async listRtlValidations(tenantId: string, opts: { subjectKind?: string | null; subjectId?: string | null; limit?: number }) {
    const { rows } = await this.pool.query(
      `SELECT id::text, subject_kind, subject_id, passed, findings,
              validator_version, validated_at
         FROM dos.ui_rtl_validation_results
        WHERE tenant_id=$1
          AND ($2::text IS NULL OR subject_kind=$2)
          AND ($3::text IS NULL OR subject_id=$3)
        ORDER BY validated_at DESC LIMIT $4`,
      [tenantId, opts.subjectKind ?? null, opts.subjectId ?? null,
       Math.min(opts.limit ?? 100, 500)]);
    return rows;
  }
  async recordRtlValidation(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_rtl_validation_results
        (tenant_id, subject_kind, subject_id, passed, findings, validator_version)
       VALUES ($1,$2,$3,$4,COALESCE($5::jsonb,'[]'::jsonb),$6)
       RETURNING id::text, subject_kind, subject_id, passed, validated_at`,
      [tenantId, body.subject_kind, body.subject_id, body.passed,
       body.findings !== undefined ? JSON.stringify(body.findings) : null,
       body.validator_version ?? null]);
    return rows[0];
  }
}

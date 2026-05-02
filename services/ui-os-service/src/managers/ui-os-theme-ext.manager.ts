import type { DbPool } from '../db.js';

/**
 * Wave 11g-§11 Theme/Branding ext — manager covering 8 §11 tables (migrations
 * 20260502_0115 + 0116): theme_profiles, theme_tokens, theme_assignments,
 * brand_assets, login_branding, email_branding, report_branding, print_templates.
 */
export class UiOsThemeExtManager {
  constructor(private readonly pool: DbPool) {}

  // ── Theme profiles ──────────────────────────────────────────
  async listProfiles(tenantId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, profile_code, parent_profile_id::text AS parent_profile_id,
              display_name_key, description_key, is_default, is_active
         FROM dos.ui_theme_profiles
        WHERE tenant_id=$1 ORDER BY profile_code`, [tenantId]);
    return rows;
  }
  async upsertProfile(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_theme_profiles
        (tenant_id, profile_code, parent_profile_id, display_name_key, description_key,
         is_default, is_active, created_by, updated_by)
       VALUES ($1,$2,$3::uuid,$4,$5,COALESCE($6,FALSE),COALESCE($7,TRUE),$8,$8)
       ON CONFLICT (tenant_id, profile_code) DO UPDATE
         SET parent_profile_id=EXCLUDED.parent_profile_id,
             display_name_key=EXCLUDED.display_name_key,
             description_key=EXCLUDED.description_key,
             is_default=EXCLUDED.is_default,
             is_active=EXCLUDED.is_active,
             updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING id::text, profile_code, is_default, is_active`,
      [tenantId, body.profile_code, body.parent_profile_id ?? null,
       body.display_name_key ?? null, body.description_key ?? null,
       body.is_default ?? null, body.is_active ?? null, userId]);
    return rows[0];
  }
  async deleteProfile(tenantId: string, profileId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_theme_profiles WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, profileId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Theme tokens ────────────────────────────────────────────
  async listTokens(tenantId: string, profileId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, token_key, token_kind::text AS token_kind, token_value, is_active
         FROM dos.ui_theme_tokens
        WHERE tenant_id=$1 AND theme_profile_id=$2::uuid
        ORDER BY token_kind, token_key`, [tenantId, profileId]);
    return rows;
  }
  async upsertToken(tenantId: string, profileId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_theme_tokens
        (tenant_id, theme_profile_id, token_key, token_kind, token_value, is_active)
       VALUES ($1,$2::uuid,$3,$4::dos.ui_theme_token_kind_t,$5,COALESCE($6,TRUE))
       ON CONFLICT (theme_profile_id, token_key) DO UPDATE
         SET token_kind=EXCLUDED.token_kind,
             token_value=EXCLUDED.token_value,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, token_key, token_kind::text AS token_kind`,
      [tenantId, profileId, body.token_key, body.token_kind, body.token_value, body.is_active ?? null]);
    return rows[0];
  }
  async deleteToken(tenantId: string, tokenId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_theme_tokens WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, tokenId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Theme assignments ───────────────────────────────────────
  async listAssignments(tenantId: string, targetKind?: string | null) {
    const { rows } = await this.pool.query(
      `SELECT a.id::text, a.target_kind::text AS target_kind, a.target_id,
              a.theme_profile_id::text AS theme_profile_id, p.profile_code, a.is_active
         FROM dos.ui_theme_assignments a
         JOIN dos.ui_theme_profiles p ON p.id=a.theme_profile_id
        WHERE a.tenant_id=$1 AND ($2::text IS NULL OR a.target_kind::text=$2)
        ORDER BY a.target_kind, a.target_id`,
      [tenantId, targetKind ?? null]);
    return rows;
  }
  async upsertAssignment(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_theme_assignments
        (tenant_id, target_kind, target_id, theme_profile_id, is_active)
       VALUES ($1,$2::dos.ui_theme_target_kind_t,$3,$4::uuid,COALESCE($5,TRUE))
       ON CONFLICT (tenant_id, target_kind, target_id) DO UPDATE
         SET theme_profile_id=EXCLUDED.theme_profile_id,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, target_kind::text AS target_kind, target_id`,
      [tenantId, body.target_kind, body.target_id, body.theme_profile_id, body.is_active ?? null]);
    return rows[0];
  }
  async deleteAssignment(tenantId: string, assignmentId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_theme_assignments WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, assignmentId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Brand assets ────────────────────────────────────────────
  async listAssets(tenantId: string, kind?: string | null) {
    const { rows } = await this.pool.query(
      `SELECT id::text, asset_kind::text AS asset_kind, variant, url, mime_type,
              width_px, height_px, size_bytes, checksum, is_active
         FROM dos.ui_brand_assets
        WHERE tenant_id=$1 AND ($2::text IS NULL OR asset_kind::text=$2)
        ORDER BY asset_kind, variant`, [tenantId, kind ?? null]);
    return rows;
  }
  async upsertAsset(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_brand_assets
        (tenant_id, asset_kind, variant, url, mime_type, width_px, height_px,
         size_bytes, checksum, is_active, created_by, updated_by)
       VALUES ($1,$2::dos.ui_brand_asset_kind_t,COALESCE($3,'default'),$4,$5,$6,$7,
               $8,$9,COALESCE($10,TRUE),$11,$11)
       ON CONFLICT (tenant_id, asset_kind, variant) DO UPDATE
         SET url=EXCLUDED.url, mime_type=EXCLUDED.mime_type,
             width_px=EXCLUDED.width_px, height_px=EXCLUDED.height_px,
             size_bytes=EXCLUDED.size_bytes, checksum=EXCLUDED.checksum,
             is_active=EXCLUDED.is_active,
             updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING id::text, asset_kind::text AS asset_kind, variant, url`,
      [tenantId, body.asset_kind, body.variant ?? null, body.url, body.mime_type ?? null,
       body.width_px ?? null, body.height_px ?? null, body.size_bytes ?? null,
       body.checksum ?? null, body.is_active ?? null, userId]);
    return rows[0];
  }
  async deleteAsset(tenantId: string, assetId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_brand_assets WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, assetId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Login branding ──────────────────────────────────────────
  async getLoginBranding(tenantId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, hero_asset_id::text AS hero_asset_id,
              logo_asset_id::text AS logo_asset_id, welcome_text_key,
              support_link, config, is_active
         FROM dos.ui_login_branding WHERE tenant_id=$1 LIMIT 1`, [tenantId]);
    return rows[0] ?? null;
  }
  async upsertLoginBranding(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_login_branding
        (tenant_id, hero_asset_id, logo_asset_id, welcome_text_key, support_link, config, is_active)
       VALUES ($1,$2::uuid,$3::uuid,$4,$5,COALESCE($6::jsonb,'{}'::jsonb),COALESCE($7,TRUE))
       ON CONFLICT (tenant_id) DO UPDATE
         SET hero_asset_id=EXCLUDED.hero_asset_id,
             logo_asset_id=EXCLUDED.logo_asset_id,
             welcome_text_key=EXCLUDED.welcome_text_key,
             support_link=EXCLUDED.support_link,
             config=EXCLUDED.config, is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, is_active`,
      [tenantId, body.hero_asset_id ?? null, body.logo_asset_id ?? null,
       body.welcome_text_key ?? null, body.support_link ?? null,
       body.config !== undefined ? JSON.stringify(body.config) : null, body.is_active ?? null]);
    return rows[0];
  }

  // ── Email branding ──────────────────────────────────────────
  async getEmailBranding(tenantId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, header_html, footer_html, accent_color,
              logo_asset_id::text AS logo_asset_id, config, is_active
         FROM dos.ui_email_branding WHERE tenant_id=$1 LIMIT 1`, [tenantId]);
    return rows[0] ?? null;
  }
  async upsertEmailBranding(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_email_branding
        (tenant_id, header_html, footer_html, accent_color, logo_asset_id, config, is_active)
       VALUES ($1,$2,$3,$4,$5::uuid,COALESCE($6::jsonb,'{}'::jsonb),COALESCE($7,TRUE))
       ON CONFLICT (tenant_id) DO UPDATE
         SET header_html=EXCLUDED.header_html, footer_html=EXCLUDED.footer_html,
             accent_color=EXCLUDED.accent_color, logo_asset_id=EXCLUDED.logo_asset_id,
             config=EXCLUDED.config, is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, is_active`,
      [tenantId, body.header_html ?? null, body.footer_html ?? null,
       body.accent_color ?? null, body.logo_asset_id ?? null,
       body.config !== undefined ? JSON.stringify(body.config) : null, body.is_active ?? null]);
    return rows[0];
  }

  // ── Report branding ─────────────────────────────────────────
  async getReportBranding(tenantId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, cover_template_html, watermark_text,
              watermark_asset_id::text AS watermark_asset_id, legal_footer, config, is_active
         FROM dos.ui_report_branding WHERE tenant_id=$1 LIMIT 1`, [tenantId]);
    return rows[0] ?? null;
  }
  async upsertReportBranding(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_report_branding
        (tenant_id, cover_template_html, watermark_text, watermark_asset_id,
         legal_footer, config, is_active)
       VALUES ($1,$2,$3,$4::uuid,$5,COALESCE($6::jsonb,'{}'::jsonb),COALESCE($7,TRUE))
       ON CONFLICT (tenant_id) DO UPDATE
         SET cover_template_html=EXCLUDED.cover_template_html,
             watermark_text=EXCLUDED.watermark_text,
             watermark_asset_id=EXCLUDED.watermark_asset_id,
             legal_footer=EXCLUDED.legal_footer,
             config=EXCLUDED.config, is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, is_active`,
      [tenantId, body.cover_template_html ?? null, body.watermark_text ?? null,
       body.watermark_asset_id ?? null, body.legal_footer ?? null,
       body.config !== undefined ? JSON.stringify(body.config) : null, body.is_active ?? null]);
    return rows[0];
  }

  // ── Print templates ─────────────────────────────────────────
  async listPrintTemplates(tenantId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, template_key, engine::text AS engine, default_locale, is_active
         FROM dos.ui_print_templates WHERE tenant_id=$1
        ORDER BY template_key, default_locale`, [tenantId]);
    return rows;
  }
  async getPrintTemplate(tenantId: string, templateId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, template_key, engine::text AS engine, template_body,
              default_locale, is_active
         FROM dos.ui_print_templates WHERE tenant_id=$1 AND id=$2::uuid LIMIT 1`,
      [tenantId, templateId]);
    return rows[0] ?? null;
  }
  async upsertPrintTemplate(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_print_templates
        (tenant_id, template_key, engine, template_body, default_locale, is_active,
         created_by, updated_by)
       VALUES ($1,$2,COALESCE($3,'html')::dos.ui_print_engine_t,$4,
               COALESCE($5,'en'),COALESCE($6,TRUE),$7,$7)
       ON CONFLICT (tenant_id, template_key, default_locale) DO UPDATE
         SET engine=EXCLUDED.engine, template_body=EXCLUDED.template_body,
             is_active=EXCLUDED.is_active,
             updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING id::text, template_key, engine::text AS engine, default_locale`,
      [tenantId, body.template_key, body.engine ?? null, body.template_body,
       body.default_locale ?? null, body.is_active ?? null, userId]);
    return rows[0];
  }
  async deletePrintTemplate(tenantId: string, templateId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_print_templates WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, templateId]);
    return (r.rowCount ?? 0) > 0;
  }
}

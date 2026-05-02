const EMPTY = {
    brand_name: null, logo_url: null, logo_dark_url: null, favicon_url: null,
    primary_color: null, secondary_color: null, accent_color: null,
    theme_tokens: {}, css_overrides: {},
    login_background_url: null, landing_config: {}, is_active: true,
};
export class UiOsBrandingManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async get(tenantId) {
        const { rows } = await this.pool.query(`SELECT brand_name, logo_url, logo_dark_url, favicon_url,
              primary_color, secondary_color, accent_color,
              theme_tokens, css_overrides, login_background_url,
              landing_config, is_active
         FROM dos.ui_tenant_branding
        WHERE tenant_id = $1
        LIMIT 1`, [tenantId]);
        return rows[0] ?? EMPTY;
    }
    async upsert(tenantId, patch) {
        const cur = await this.get(tenantId);
        const m = {
            brand_name: patch.brand_name ?? cur.brand_name,
            logo_url: patch.logo_url ?? cur.logo_url,
            logo_dark_url: patch.logo_dark_url ?? cur.logo_dark_url,
            favicon_url: patch.favicon_url ?? cur.favicon_url,
            primary_color: patch.primary_color ?? cur.primary_color,
            secondary_color: patch.secondary_color ?? cur.secondary_color,
            accent_color: patch.accent_color ?? cur.accent_color,
            theme_tokens: patch.theme_tokens ?? cur.theme_tokens,
            css_overrides: patch.css_overrides ?? cur.css_overrides,
            login_background_url: patch.login_background_url ?? cur.login_background_url,
            landing_config: patch.landing_config ?? cur.landing_config,
            is_active: patch.is_active ?? cur.is_active,
        };
        await this.pool.query(`INSERT INTO dos.ui_tenant_branding
        (tenant_id, brand_name, logo_url, logo_dark_url, favicon_url,
         primary_color, secondary_color, accent_color,
         theme_tokens, css_overrides, login_background_url, landing_config, is_active, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12::jsonb,$13, NOW())
       ON CONFLICT (tenant_id) DO UPDATE
         SET brand_name           = EXCLUDED.brand_name,
             logo_url             = EXCLUDED.logo_url,
             logo_dark_url        = EXCLUDED.logo_dark_url,
             favicon_url          = EXCLUDED.favicon_url,
             primary_color        = EXCLUDED.primary_color,
             secondary_color      = EXCLUDED.secondary_color,
             accent_color         = EXCLUDED.accent_color,
             theme_tokens         = EXCLUDED.theme_tokens,
             css_overrides        = EXCLUDED.css_overrides,
             login_background_url = EXCLUDED.login_background_url,
             landing_config       = EXCLUDED.landing_config,
             is_active            = EXCLUDED.is_active,
             updated_at           = NOW()`, [
            tenantId, m.brand_name, m.logo_url, m.logo_dark_url, m.favicon_url,
            m.primary_color, m.secondary_color, m.accent_color,
            JSON.stringify(m.theme_tokens),
            JSON.stringify(m.css_overrides),
            m.login_background_url,
            JSON.stringify(m.landing_config),
            m.is_active,
        ]);
        return m;
    }
}
//# sourceMappingURL=ui-os-branding.manager.js.map
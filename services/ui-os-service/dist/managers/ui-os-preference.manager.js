const DEFAULTS = {
    locale: 'en',
    timezone: 'Asia/Riyadh',
    direction: 'ltr',
    appearance: 'system',
    density: 'comfortable',
    accent_color: null,
    default_module_code: null,
    preferences: {},
};
export class UiOsPreferenceManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async get(tenantId, userId) {
        const { rows } = await this.pool.query(`SELECT locale, timezone, direction, appearance, density,
              accent_color, default_module_code, preferences
         FROM dos.ui_user_preferences
        WHERE tenant_id = $1 AND user_id = $2
        LIMIT 1`, [tenantId, userId]);
        if (rows.length === 0)
            return DEFAULTS;
        const r = rows[0];
        return {
            locale: r.locale ?? DEFAULTS.locale,
            timezone: r.timezone ?? DEFAULTS.timezone,
            direction: r.direction ?? DEFAULTS.direction,
            appearance: r.appearance ?? DEFAULTS.appearance,
            density: r.density ?? DEFAULTS.density,
            accent_color: r.accent_color ?? null,
            default_module_code: r.default_module_code ?? null,
            preferences: r.preferences ?? {},
        };
    }
    async upsert(tenantId, userId, patch) {
        const current = await this.get(tenantId, userId);
        const merged = {
            locale: patch.locale ?? current.locale,
            timezone: patch.timezone ?? current.timezone,
            direction: patch.direction ?? current.direction,
            appearance: patch.appearance ?? current.appearance,
            density: patch.density ?? current.density,
            accent_color: patch.accent_color ?? current.accent_color,
            default_module_code: patch.default_module_code ?? current.default_module_code,
            preferences: patch.preferences !== undefined
                ? { ...current.preferences, ...patch.preferences }
                : current.preferences,
        };
        await this.pool.query(`INSERT INTO dos.ui_user_preferences
        (tenant_id, user_id, locale, timezone, direction, appearance, density,
         accent_color, default_module_code, preferences, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb, NOW())
       ON CONFLICT (tenant_id, user_id) DO UPDATE
         SET locale              = EXCLUDED.locale,
             timezone            = EXCLUDED.timezone,
             direction           = EXCLUDED.direction,
             appearance          = EXCLUDED.appearance,
             density             = EXCLUDED.density,
             accent_color        = EXCLUDED.accent_color,
             default_module_code = EXCLUDED.default_module_code,
             preferences         = EXCLUDED.preferences,
             updated_at          = NOW()`, [
            tenantId,
            userId,
            merged.locale,
            merged.timezone,
            merged.direction,
            merged.appearance,
            merged.density,
            merged.accent_color,
            merged.default_module_code,
            JSON.stringify(merged.preferences),
        ]);
        return merged;
    }
    async setLocale(tenantId, userId, locale, direction) {
        const dir = direction ?? (locale === 'ar' ? 'rtl' : 'ltr');
        return this.upsert(tenantId, userId, { locale, direction: dir });
    }
    async setTheme(tenantId, userId, appearance, accent) {
        return this.upsert(tenantId, userId, { appearance, accent_color: accent ?? null });
    }
    async setDensity(tenantId, userId, density) {
        return this.upsert(tenantId, userId, { density });
    }
}
//# sourceMappingURL=ui-os-preference.manager.js.map
export class UiOsI18nManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async listLocales() {
        const { rows } = await this.pool.query(`SELECT locale_code, native_name, english_name, direction, is_default, is_active
         FROM dos.ui_locales
        WHERE is_active = TRUE
        ORDER BY is_default DESC, locale_code`);
        return rows;
    }
    async getTranslations(tenantId, locale) {
        const { rows } = await this.pool.query(`SELECT namespace, translation_key, translation_value, source
         FROM dos.ui_translations
        WHERE locale_code = $1
          AND is_active = TRUE
          AND (tenant_id IS NULL OR tenant_id = $2)
        ORDER BY tenant_id NULLS FIRST, namespace, translation_key`, [locale, tenantId]);
        const out = {};
        for (const r of rows) {
            out[r.namespace] ??= {};
            out[r.namespace][r.translation_key] = r.translation_value;
        }
        return out;
    }
    async putTranslations(tenantId, locale, body) {
        const client = await this.pool.connect();
        let n = 0;
        try {
            await client.query('BEGIN');
            for (const t of body.translations) {
                await client.query(`INSERT INTO dos.ui_translations
             (tenant_id, locale_code, namespace, translation_key, translation_value, source, is_active, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6, TRUE, NOW())
           ON CONFLICT (locale_code, namespace, translation_key, COALESCE(tenant_id, '*'::varchar)) DO UPDATE
             SET translation_value = EXCLUDED.translation_value,
                 source            = COALESCE(EXCLUDED.source, dos.ui_translations.source),
                 is_active         = TRUE,
                 updated_at        = NOW()`, [tenantId, locale, t.namespace, t.translation_key, t.translation_value, t.source ?? 'manual']);
                n++;
            }
            await client.query('COMMIT');
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
        return { upserted: n };
    }
    async exportLocale(tenantId, locale) {
        const { rows } = await this.pool.query(`SELECT namespace, translation_key, translation_value, source
         FROM dos.ui_translations
        WHERE locale_code = $1 AND (tenant_id IS NULL OR tenant_id = $2) AND is_active = TRUE
        ORDER BY namespace, translation_key`, [locale, tenantId]);
        return rows;
    }
}
//# sourceMappingURL=ui-os-i18n.manager.js.map
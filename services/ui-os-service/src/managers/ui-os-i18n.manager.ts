import type { DbPool } from '../db.js';

export interface Locale {
  locale_code: string;
  native_name: string;
  english_name: string;
  direction: string;
  is_default: boolean;
  is_active: boolean;
}

export interface Translation {
  namespace: string;
  translation_key: string;
  translation_value: string;
  source: string | null;
}

export interface TranslationPut {
  translations: Array<{
    namespace: string;
    translation_key: string;
    translation_value: string;
    source?: string;
  }>;
}

export class UiOsI18nManager {
  constructor(private readonly pool: DbPool) {}

  async listLocales(): Promise<Locale[]> {
    const { rows } = await this.pool.query<Locale>(
      `SELECT locale_code, native_name, english_name, direction, is_default, is_active
         FROM dos.ui_locales
        WHERE is_active = TRUE
        ORDER BY is_default DESC, locale_code`,
    );
    return rows;
  }

  async getTranslations(tenantId: string, locale: string): Promise<Record<string, Record<string, string>>> {
    const { rows } = await this.pool.query<Translation>(
      `SELECT namespace, translation_key, translation_value, source
         FROM dos.ui_translations
        WHERE locale_code = $1
          AND is_active = TRUE
          AND (tenant_id IS NULL OR tenant_id = $2)
        ORDER BY tenant_id NULLS FIRST, namespace, translation_key`,
      [locale, tenantId],
    );
    const out: Record<string, Record<string, string>> = {};
    for (const r of rows) {
      out[r.namespace] ??= {};
      out[r.namespace][r.translation_key] = r.translation_value;
    }
    return out;
  }

  async putTranslations(tenantId: string, locale: string, body: TranslationPut): Promise<{ upserted: number }> {
    const client = await this.pool.connect();
    let n = 0;
    try {
      await client.query('BEGIN');
      for (const t of body.translations) {
        await client.query(
          `INSERT INTO dos.ui_translations
             (tenant_id, locale_code, namespace, translation_key, translation_value, source, is_active, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6, TRUE, NOW())
           ON CONFLICT (locale_code, namespace, translation_key, COALESCE(tenant_id, '*'::varchar)) DO UPDATE
             SET translation_value = EXCLUDED.translation_value,
                 source            = COALESCE(EXCLUDED.source, dos.ui_translations.source),
                 is_active         = TRUE,
                 updated_at        = NOW()`,
          [tenantId, locale, t.namespace, t.translation_key, t.translation_value, t.source ?? 'manual'],
        );
        n++;
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return { upserted: n };
  }

  async exportLocale(tenantId: string, locale: string): Promise<Translation[]> {
    const { rows } = await this.pool.query<Translation>(
      `SELECT namespace, translation_key, translation_value, source
         FROM dos.ui_translations
        WHERE locale_code = $1 AND (tenant_id IS NULL OR tenant_id = $2) AND is_active = TRUE
        ORDER BY namespace, translation_key`,
      [locale, tenantId],
    );
    return rows;
  }
}

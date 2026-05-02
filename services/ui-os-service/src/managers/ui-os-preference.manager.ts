import type { DbPool } from '../db.js';

export interface UiPreferences {
  locale: string;
  timezone: string;
  direction: string;
  appearance: string;
  density: string;
  accent_color: string | null;
  default_module_code: string | null;
  preferences: Record<string, unknown>;
}

export interface PreferencePatch {
  locale?: string;
  timezone?: string;
  direction?: string;
  appearance?: string;
  density?: string;
  accent_color?: string | null;
  default_module_code?: string | null;
  preferences?: Record<string, unknown>;
}

const DEFAULTS: UiPreferences = {
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
  constructor(private readonly pool: DbPool) {}

  async get(tenantId: string, userId: string): Promise<UiPreferences> {
    const { rows } = await this.pool.query<UiPreferences>(
      `SELECT locale, timezone, direction, appearance, density,
              accent_color, default_module_code, preferences
         FROM dos.ui_user_preferences
        WHERE tenant_id = $1 AND user_id = $2
        LIMIT 1`,
      [tenantId, userId],
    );
    if (rows.length === 0) return DEFAULTS;
    const r = rows[0];
    return {
      locale: r.locale ?? DEFAULTS.locale,
      timezone: r.timezone ?? DEFAULTS.timezone,
      direction: r.direction ?? DEFAULTS.direction,
      appearance: r.appearance ?? DEFAULTS.appearance,
      density: r.density ?? DEFAULTS.density,
      accent_color: r.accent_color ?? null,
      default_module_code: r.default_module_code ?? null,
      preferences: (r.preferences as Record<string, unknown>) ?? {},
    };
  }

  async upsert(
    tenantId: string,
    userId: string,
    patch: PreferencePatch,
  ): Promise<UiPreferences> {
    const current = await this.get(tenantId, userId);
    const merged: UiPreferences = {
      locale: patch.locale ?? current.locale,
      timezone: patch.timezone ?? current.timezone,
      direction: patch.direction ?? current.direction,
      appearance: patch.appearance ?? current.appearance,
      density: patch.density ?? current.density,
      accent_color: patch.accent_color ?? current.accent_color,
      default_module_code: patch.default_module_code ?? current.default_module_code,
      preferences:
        patch.preferences !== undefined
          ? { ...current.preferences, ...patch.preferences }
          : current.preferences,
    };

    await this.pool.query(
      `INSERT INTO dos.ui_user_preferences
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
             updated_at          = NOW()`,
      [
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
      ],
    );

    return merged;
  }

  async setLocale(tenantId: string, userId: string, locale: string, direction?: string): Promise<UiPreferences> {
    const dir = direction ?? (locale === 'ar' ? 'rtl' : 'ltr');
    return this.upsert(tenantId, userId, { locale, direction: dir });
  }

  async setTheme(tenantId: string, userId: string, appearance: string, accent?: string | null): Promise<UiPreferences> {
    return this.upsert(tenantId, userId, { appearance, accent_color: accent ?? null });
  }

  async setDensity(tenantId: string, userId: string, density: string): Promise<UiPreferences> {
    return this.upsert(tenantId, userId, { density });
  }
}

import { safeQuery, tenantSchema } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';

export interface AccessProfile {
  profileCode: string;
  nameEn: string;
  nameAr: string;
  isSystem: boolean;
  isActive: boolean;
  // Landing route is owned by dos.tenant_landing_config (resolved by
  // ui-os-service). access_profiles.default_landing_page is a legacy
  // column kept for migration safety; null means "no profile-level
  // override; consume tenant landing config instead".
  tenantLandingRoute: string | null;
  allowedModules: string[];
}

export async function getAccessProfiles(tenantId: string): Promise<AccessProfile[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT profile_code, name_en, name_ar, is_system, is_active,
            default_landing_page, allowed_modules
     FROM "${schema}".access_profiles
     WHERE is_active = TRUE ORDER BY profile_code`,
    [],
  );
  return rows.map(( r: any) => ({
    profileCode: r.profile_code,
    nameEn: r.name_en ?? '',
    nameAr: r.name_ar ?? '',
    isSystem: r.is_system === true,
    isActive: r.is_active === true,
    tenantLandingRoute: typeof r.default_landing_page === 'string' && r.default_landing_page.trim()
      ? r.default_landing_page.trim()
      : null,
    allowedModules: r.allowed_modules ?? [],
  }));
}

export async function getAccessProfile(tenantId: string, profileCode: string): Promise<AccessProfile | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT profile_code, name_en, name_ar, is_system, is_active,
            default_landing_page, allowed_modules
     FROM "${schema}".access_profiles
     WHERE profile_code = $1 LIMIT 1`,
    [profileCode],
  );
  if (!rows[0]) return null;
  const r = rows[0] as {
    profile_code: string;
    name_en?: string;
    name_ar?: string;
    is_system?: boolean;
    is_active?: boolean;
    default_landing_page?: string;
    allowed_modules?: string[];
  };
  return {
    profileCode: r.profile_code,
    nameEn: r.name_en ?? '',
    nameAr: r.name_ar ?? '',
    isSystem: r.is_system === true,
    isActive: r.is_active === true,
    tenantLandingRoute: typeof r.default_landing_page === 'string' && r.default_landing_page.trim()
      ? r.default_landing_page.trim()
      : null,
    allowedModules: r.allowed_modules ?? [],
  };
}

export async function assignAccessProfile(
  tenantId: string,
  userId: string,
  profileCode: string,
  assignedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".user_access_profiles (user_id, access_profile_code, is_active, created_by)
     VALUES ($1, $2, TRUE, $3)
     ON CONFLICT (user_id, access_profile_code) DO UPDATE SET is_active = TRUE, updated_at = NOW()`,
    [userId, profileCode, assignedBy],
  );
  await publish('dauth.access_profile.assigned', tenantId, { userId, profileCode, assignedBy });
}

export async function revokeAccessProfile(
  tenantId: string,
  userId: string,
  profileCode: string,
  revokedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".user_access_profiles SET is_active = FALSE, updated_at = NOW()
     WHERE user_id = $1 AND access_profile_code = $2`,
    [userId, profileCode],
  );
  await publish('dauth.access_profile.revoked', tenantId, { userId, profileCode, revokedBy });
}

export async function getUserAccessProfiles(tenantId: string, userId: string): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT access_profile_code FROM "${schema}".user_access_profiles
     WHERE user_id = $1 AND is_active = TRUE`,
    [userId],
  );
  return rows.map(( r: any) => r.access_profile_code);
}

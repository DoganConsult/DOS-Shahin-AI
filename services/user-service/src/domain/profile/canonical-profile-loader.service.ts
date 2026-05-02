import { safeQuery, tenantSchema } from '@dos/db';

export interface CanonicalProfile {
  userId: string;
  tenantId: string;
  displayName: string;
  displayNameAr: string | null;
  email: string | null;
  roleCode: string | null;
  departmentId: string | null;
  teamId: string | null;
  avatarUrl: string | null;
  languageCode: string;
  timezone: string;
  status: string;
  permissions: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalProfileMinimal {
  userId: string;
  displayName: string;
  displayNameAr: string | null;
  email: string | null;
  roleCode: string | null;
  avatarUrl: string | null;
  languageCode: string;
}

function mapProfileRow(row: Record<string, unknown>): CanonicalProfile {
  return {
    userId: String(row['user_id'] ?? row['userId']),
    tenantId: String(row['tenant_id'] ?? row['tenantId']),
    displayName: String(row['display_name'] ?? row['displayName'] ?? ''),
    displayNameAr: row['display_name_ar'] != null ? String(row['display_name_ar']) : null,
    email: row['email'] != null ? String(row['email']) : null,
    roleCode: row['role_code'] != null ? String(row['role_code']) : null,
    departmentId: row['department_id'] != null ? String(row['department_id']) : null,
    teamId: row['team_id'] != null ? String(row['team_id']) : null,
    avatarUrl: row['avatar_url'] != null ? String(row['avatar_url']) : null,
    languageCode: String(row['language_code'] ?? 'en'),
    timezone: String(row['timezone'] ?? 'UTC'),
    status: String(row['status'] ?? 'active'),
    permissions: Array.isArray(row['permissions']) ? row['permissions'] as string[] : [],
    metadata: (row['metadata'] as Record<string, unknown>) ?? {},
    createdAt: String(row['created_at'] ?? ''),
    updatedAt: String(row['updated_at'] ?? ''),
  };
}

export async function loadCanonicalProfile(tenantId: string, userId: string): Promise<CanonicalProfile | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT
       u.user_id, u.tenant_id, u.display_name, u.display_name_ar, u.email,
       u.role_code, u.department_id, u.team_id, u.avatar_url,
       u.language_code, u.timezone, u.status, u.metadata,
       u.created_at, u.updated_at,
       COALESCE(
         (SELECT array_agg(p.permission_code)
          FROM "${schema}".role_permissions p
          WHERE p.role_code = u.role_code),
         '{}'::text[]
       ) AS permissions
     FROM "${schema}".users u
     WHERE u.user_id = $1
     LIMIT 1`,
    [userId],
  );
  return rows.length > 0 ? mapProfileRow(rows[0]) : null;
}

export async function loadCanonicalProfileMinimal(tenantId: string, userId: string): Promise<CanonicalProfileMinimal | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT user_id, display_name, display_name_ar, email, role_code, avatar_url, language_code
     FROM "${schema}".users
     WHERE user_id = $1
     LIMIT 1`,
    [userId],
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    userId: String(row['user_id']),
    displayName: String(row['display_name'] ?? ''),
    displayNameAr: row['display_name_ar'] != null ? String(row['display_name_ar']) : null,
    email: row['email'] != null ? String(row['email']) : null,
    roleCode: row['role_code'] != null ? String(row['role_code']) : null,
    avatarUrl: row['avatar_url'] != null ? String(row['avatar_url']) : null,
    languageCode: String(row['language_code'] ?? 'en'),
  };
}

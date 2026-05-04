import { masterQuery } from '@dos/db/master';

async function actor(): Promise<void> {
  await masterQuery(`SET dos.actor = 'dos-master'`);
}

export interface PlatformAdminUser {
  id: string;
  email: string;
  display_name: string;
  status: string;
}

export async function ensureUser(email: string, displayName: string): Promise<PlatformAdminUser> {
  await actor();
  const r = await masterQuery(
    `INSERT INTO platform_admin.platform_admin_user (email, display_name, status)
     VALUES ($1,$2,'active')
     ON CONFLICT (email) DO UPDATE SET display_name=EXCLUDED.display_name
     RETURNING id, email, display_name, status`,
    [email, displayName],
  );
  return r.rows[0] as unknown as PlatformAdminUser;
}

export async function listUsers(): Promise<PlatformAdminUser[]> {
  const r = await masterQuery(
    `SELECT id, email, display_name, status
       FROM platform_admin.platform_admin_user
      ORDER BY email`,
  );
  return r.rows as unknown as PlatformAdminUser[];
}

export interface PillarRole {
  role_code: string;
  display_name: string;
  pillar: string;
  description: string | null;
}

export async function ensureRole(
  roleCode: string,
  displayName: string,
  pillar: 'DNOC' | 'DSOC' | 'DOS' | 'DAuth' | 'ALL',
  description?: string,
): Promise<void> {
  await actor();
  await masterQuery(
    `INSERT INTO platform_admin.platform_admin_role (role_code, display_name, pillar, description)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (role_code) DO UPDATE SET
       display_name=EXCLUDED.display_name,
       pillar=EXCLUDED.pillar,
       description=EXCLUDED.description`,
    [roleCode, displayName, pillar, description ?? null],
  );
}

export async function listRoles(pillar?: string): Promise<PillarRole[]> {
  const r = pillar
    ? await masterQuery(
        `SELECT role_code, display_name, pillar, description
           FROM platform_admin.platform_admin_role
          WHERE pillar = $1 ORDER BY role_code`,
        [pillar],
      )
    : await masterQuery(
        `SELECT role_code, display_name, pillar, description
           FROM platform_admin.platform_admin_role
          ORDER BY pillar, role_code`,
      );
  return r.rows as unknown as PillarRole[];
}

export async function grantRole(userId: string, roleCode: string, grantedBy: string): Promise<void> {
  await actor();
  await masterQuery(
    `INSERT INTO platform_admin.platform_admin_grant (user_id, role_code, granted_by)
     VALUES ($1::uuid,$2,$3)
     ON CONFLICT (user_id, role_code) DO UPDATE SET revoked_at = NULL, granted_by = EXCLUDED.granted_by`,
    [userId, roleCode, grantedBy],
  );
}

export async function listGrants(userId: string): Promise<{ role_code: string; pillar: string; granted_at: string }[]> {
  const r = await masterQuery(
    `SELECT g.role_code, r.pillar, g.granted_at
       FROM platform_admin.platform_admin_grant g
       JOIN platform_admin.platform_admin_role r ON r.role_code = g.role_code
      WHERE g.user_id = $1::uuid AND g.revoked_at IS NULL
      ORDER BY r.pillar, g.role_code`,
    [userId],
  );
  return r.rows as unknown as { role_code: string; pillar: string; granted_at: string }[];
}

export interface ConsoleBootstrap {
  user: PlatformAdminUser;
  pillars: { pillar: string; roles: string[] }[];
  permissions: string[];
  generatedAt: string;
}

export async function consoleBootstrap(email: string): Promise<ConsoleBootstrap> {
  const u = await masterQuery(
    `SELECT id, email, display_name, status
       FROM platform_admin.platform_admin_user
      WHERE email = $1 AND status = 'active'`,
    [email],
  );
  if (!u.rows.length) throw new Error('platform_admin_user_not_found');
  const user = u.rows[0] as unknown as PlatformAdminUser;
  const grants = await listGrants(user.id);
  const byPillar = new Map<string, string[]>();
  for (const g of grants) {
    if (!byPillar.has(g.pillar)) byPillar.set(g.pillar, []);
    byPillar.get(g.pillar)!.push(g.role_code);
  }
  const pillars = Array.from(byPillar.entries()).map(([pillar, roles]) => ({ pillar, roles }));
  // Permission derivation: pillar.<lower> + role-code; expand as M12 lands.
  const permissions = grants.flatMap((g) => [
    `pillar.${g.pillar.toLowerCase()}.access`,
    `role.${g.role_code}`,
  ]);
  return { user, pillars, permissions, generatedAt: new Date().toISOString() };
}

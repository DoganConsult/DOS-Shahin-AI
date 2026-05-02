import { safeQuery, tenantSchema } from '@dos/db';

export type ActorType = 'human' | 'agent' | 'service_account' | 'external';

export interface Actor {
  actorId: string;
  type: ActorType;
  userId?: string;
  displayName: string;
  displayNameAr?: string;
  email?: string;
  tenantId: string;
  isActive: boolean;
}

export async function getActor(tenantId: string, actorId: string): Promise<Actor | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".actor_registry WHERE actor_id = $1 AND tenant_id = $2 LIMIT 1`,
    [actorId, tenantId],
  );

  if (!result.rows[0]) {
    return null;
  }

  const row = result.rows[0];
  return {
    actorId: row.actor_id,
    type: row.actor_type,
    userId: row.user_id,
    displayName: row.display_name,
    displayNameAr: row.display_name_ar,
    email: row.email,
    tenantId: row.tenant_id,
    isActive: row.is_active,
  };
}

export async function registerActor(tenantId: string, actor: Omit<Actor, 'isActive'>): Promise<Actor> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `INSERT INTO "${schema}".actor_registry
      (actor_id, actor_type, user_id, display_name, display_name_ar, email, tenant_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
     ON CONFLICT (actor_id) DO UPDATE SET
       actor_type = EXCLUDED.actor_type,
       user_id = EXCLUDED.user_id,
       display_name = EXCLUDED.display_name,
       display_name_ar = EXCLUDED.display_name_ar,
       email = EXCLUDED.email,
       tenant_id = EXCLUDED.tenant_id,
       is_active = TRUE,
       updated_at = NOW()`,
    [
      actor.actorId,
      actor.type,
      actor.userId || null,
      actor.displayName,
      actor.displayNameAr || null,
      actor.email || null,
      tenantId,
    ],
  );

  return { ...actor, tenantId, isActive: true };
}
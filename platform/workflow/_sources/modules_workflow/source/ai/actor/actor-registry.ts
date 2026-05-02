/**
 * DAuth ActorRegistry — manages actor records (human, agent, service, external).
 * §3.1: Principal types: human user, agent, service account, external actor.
 */
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
  if (!result.rows[0]) return null;
  const r = result.rows[0];
  return { actorId: r.actor_id, type: r.actor_type, userId: r.user_id, displayName: r.display_name, tenantId: r.tenant_id, isActive: r.is_active };
}

export async function registerActor(tenantId: string, actor: Omit<Actor, 'isActive'>): Promise<Actor> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".actor_registry (actor_id, actor_type, user_id, display_name, tenant_id, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (actor_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       user_id = EXCLUDED.user_id,
       tenant_id = EXCLUDED.tenant_id,
       is_active = TRUE,
       updated_at = NOW()`,
    [actor.actorId, actor.type, actor.userId || null, actor.displayName, tenantId],
  );
  return { ...actor, isActive: true };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActor = getActor;
exports.registerActor = registerActor;
/**
 * DAuth ActorRegistry — manages actor records (human, agent, service, external).
 * §3.1: Principal types: human user, agent, service account, external actor.
 */
const db_1 = require("@dos/db");
async function getActor(tenantId, actorId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".actor_registry WHERE actor_id = $1 AND tenant_id = $2 LIMIT 1`, [actorId, tenantId]);
    if (!result.rows[0])
        return null;
    const r = result.rows[0];
    return { actorId: r.actor_id, type: r.actor_type, userId: r.user_id, displayName: r.display_name, tenantId: r.tenant_id, isActive: r.is_active };
}
async function registerActor(tenantId, actor) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".actor_registry (actor_id, actor_type, user_id, display_name, tenant_id, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (actor_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       user_id = EXCLUDED.user_id,
       tenant_id = EXCLUDED.tenant_id,
       is_active = TRUE,
       updated_at = NOW()`, [actor.actorId, actor.type, actor.userId || null, actor.displayName, tenantId]);
    return { ...actor, isActive: true };
}
//# sourceMappingURL=actor-registry.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActor = getActor;
exports.registerActor = registerActor;
const db_1 = require("@dos/db");
async function getActor(tenantId, actorId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".actor_registry WHERE actor_id = $1 AND tenant_id = $2 LIMIT 1`, [actorId, tenantId]);
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
async function registerActor(tenantId, actor) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".actor_registry
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
       updated_at = NOW()`, [
        actor.actorId,
        actor.type,
        actor.userId || null,
        actor.displayName,
        actor.displayNameAr || null,
        actor.email || null,
        tenantId,
    ]);
    return { ...actor, tenantId, isActive: true };
}
//# sourceMappingURL=actor-registry.js.map
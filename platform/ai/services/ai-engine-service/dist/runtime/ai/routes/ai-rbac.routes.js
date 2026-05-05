import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { validate } from "../ports/middleware.port";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));
router.get('/analysis/role-usage', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const result = await safeQuery(`SELECT fr.code AS role_code, fr.name AS role_name, fr.is_active,
            COUNT(DISTINCT ura.user_id) AS assigned_users,
            COUNT(DISTINCT rp.permission_id) AS permission_count
     FROM "${schema}".functional_roles fr
     LEFT JOIN "${schema}".user_role_assignments ura ON ura.functional_role_id = fr.id AND ura.is_active = TRUE
     LEFT JOIN "${schema}".role_permissions rp ON rp.functional_role_id = fr.id
     WHERE fr.is_active = TRUE
     GROUP BY fr.id, fr.code, fr.name, fr.is_active
     ORDER BY assigned_users DESC`);
    res.json({ success: true, data: result.rows });
}));
router.get('/analysis/permission-coverage', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const total = await safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".permissions WHERE is_active = TRUE`);
    const assigned = await safeQuery(`SELECT COUNT(DISTINCT p.id) AS cnt FROM "${schema}".permissions p
     JOIN "${schema}".role_permissions rp ON rp.permission_id = p.id
     WHERE p.is_active = TRUE`);
    const unassigned = await safeQuery(`SELECT p.code, p.description FROM "${schema}".permissions p
     LEFT JOIN "${schema}".role_permissions rp ON rp.permission_id = p.id
     WHERE p.is_active = TRUE AND rp.id IS NULL ORDER BY p.code`);
    const totalCount = parseInt(total.rows[0]?.cnt || '0', 10);
    const assignedCount = parseInt(assigned.rows[0]?.cnt || '0', 10);
    res.json({
        success: true,
        data: {
            totalPermissions: totalCount,
            assignedPermissions: assignedCount,
            unassignedPermissions: totalCount - assignedCount,
            coveragePercent: totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0,
            unassignedList: unassigned.rows,
        },
    });
}));
router.get('/analysis/sod-risk', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const conflicts = await safeQuery(`SELECT sr.role_code_a, sr.role_code_b, sr.conflict_level, sr.reason,
            COUNT(DISTINCT u.user_id) AS affected_users
     FROM "${schema}".sod_rules sr
     JOIN "${schema}".user_role_assignments ura1 ON ura1.functional_role_id = (SELECT id FROM "${schema}".functional_roles WHERE code = sr.role_code_a LIMIT 1) AND ura1.is_active = TRUE
     JOIN "${schema}".user_role_assignments ura2 ON ura2.functional_role_id = (SELECT id FROM "${schema}".functional_roles WHERE code = sr.role_code_b LIMIT 1) AND ura2.is_active = TRUE AND ura2.user_id = ura1.user_id
     CROSS JOIN LATERAL (SELECT ura1.user_id) u(user_id)
     WHERE sr.is_active = TRUE
     GROUP BY sr.role_code_a, sr.role_code_b, sr.conflict_level, sr.reason
     ORDER BY affected_users DESC`).catch(() => ({ rows: [] }));
    res.json({ success: true, data: { conflicts: conflicts.rows, totalConflicts: conflicts.rows.length } });
}));
router.get('/analysis/least-privilege', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const overProvisioned = await safeQuery(`SELECT ura.user_id, COUNT(DISTINCT rp.permission_id) AS total_permissions,
            COUNT(DISTINCT CASE WHEN adl.id IS NOT NULL THEN rp.permission_id END) AS used_permissions
     FROM "${schema}".user_role_assignments ura
     JOIN "${schema}".role_permissions rp ON rp.functional_role_id = ura.functional_role_id
     LEFT JOIN "${schema}".authz_decision_log adl ON adl.user_id = ura.user_id
       AND adl.permission_code = (SELECT code FROM "${schema}".permissions WHERE id = rp.permission_id)
       AND adl.decision = 'allow' AND adl.created_at > NOW() - INTERVAL '90 days'
     WHERE ura.is_active = TRUE
     GROUP BY ura.user_id
     HAVING COUNT(DISTINCT rp.permission_id) > 0`).catch(() => ({ rows: [] }));
    const recommendations = overProvisioned.rows
        .filter((r) => {
        const total = parseInt(r.total_permissions, 10);
        const used = parseInt(r.used_permissions, 10);
        return total > 0 && (used / total) < 0.5;
    })
        .map((r) => ({
        userId: r.user_id,
        totalPermissions: parseInt(r.total_permissions, 10),
        usedPermissions: parseInt(r.used_permissions, 10),
        utilizationPercent: Math.round((parseInt(r.used_permissions, 10) / parseInt(r.total_permissions, 10)) * 100),
        recommendation: 'Review and reduce permission scope',
    }));
    res.json({ success: true, data: { overProvisionedUsers: recommendations, analyzedUsers: overProvisioned.rows.length } });
}));
router.get('/analysis/access-heatmap', authenticate, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const schema = tenantSchema(req.tenantId);
    const days = parseInt(req.query.days, 10) || 30;
    const heatmap = await safeQuery(`SELECT module_code, permission_code, decision, COUNT(*) AS cnt
     FROM "${schema}".authz_decision_log
     WHERE created_at > NOW() - ($1 || ' days')::interval
     GROUP BY module_code, permission_code, decision
     ORDER BY cnt DESC LIMIT 200`, [days]).catch(() => ({ rows: [] }));
    res.json({ success: true, data: { period_days: days, entries: heatmap.rows } });
}));
export default router;
//# sourceMappingURL=ai-rbac.routes.js.map
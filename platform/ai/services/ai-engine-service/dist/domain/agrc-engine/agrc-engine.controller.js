import { Router } from 'express';
import { AgrcEngineService } from './agrc-engine.service';
import { safeQuery } from './ports/database.port';
import { auditMiddleware, setAuditData } from './ports/middleware.port';
const router = Router();
router.use(auditMiddleware('agrc-engine'));
const service = new AgrcEngineService();
router.post('/agrc-engine/run', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId ||
            req.body?.tenantId ||
            req.headers['x-tenant-id'];
        const userId = req.user?.userId ||
            req.headers['x-user-id'] ||
            'manual';
        if (!tenantId) {
            return res.status(400).json({ message: 'tenantId is required' });
        }
        const result = await service.runForTenant(String(tenantId), 'manual', String(userId));
        setAuditData(res, { action: 'run', entityType: 'agrc_engine_run', entityId: result?.runId ?? '' });
        return res.json(result);
    }
    catch (err) {
        return res.status(400).json({ message: err instanceof Error ? err.message : 'Engine run failed' });
    }
});
router.get('/agrc-engine/runs', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId ||
            req.query?.tenantId ||
            req.headers['x-tenant-id'];
        if (!tenantId) {
            return res.status(400).json({ message: 'tenantId is required' });
        }
        const schemaResult = await safeQuery(`SELECT schema_name FROM public.tenants WHERE tenant_id = $1::text LIMIT 1`, [tenantId]);
        const schema = schemaResult.rows[0]?.schema_name;
        if (!schema) {
            return res.status(404).json({ message: 'Tenant schema not found' });
        }
        const result = await safeQuery(`SELECT * FROM "${schema}".agrc_engine_runs ORDER BY started_at DESC LIMIT 50`);
        return res.json(result.rows);
    }
    catch (err) {
        return res.status(400).json({ message: err instanceof Error ? err.message : 'Failed to load runs' });
    }
});
export default router;
//# sourceMappingURL=agrc-engine.controller.js.map
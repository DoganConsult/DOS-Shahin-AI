import { Router } from 'express';
import { UiOsGovernanceManager } from '../managers/ui-os-governance.manager.js';
import { ChangeLogSchema, PublishRequestSchema, PublishRequestResolveSchema, PublishApprovalSchema, PublishedVersionSchema, DraftSchema, RollbackPointSchema, SchemaValidationSchema, ContractDriftSchema, AdminActivitySchema, } from '../schemas/governance.schemas.js';
import { requireFga } from '../middleware/openfga.js';
const UUID = /^[0-9a-fA-F-]{36}$/;
function ctx(req, res) {
    const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId);
    const userId = (req.header('x-dos-user-id') ?? req.query.userId);
    if (!tenantId || !userId) {
        res.status(400).json({ error: 'missing_identity' });
        return null;
    }
    return { tenantId, userId };
}
function fail(res, code, e) {
    const m = e.message;
    if (m.includes('duplicate key')) {
        res.status(409).json({ error: 'conflict' });
        return;
    }
    if (m.includes('violates foreign key')) {
        res.status(400).json({ error: 'fk_violation', message: m });
        return;
    }
    res.status(500).json({ error: code, message: m });
}
export function createGovernanceRouter(pool) {
    const router = Router();
    const m = new UiOsGovernanceManager(pool);
    const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    const fgaEditor = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'editor', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    const fgaAdmin = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'admin', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    // Change log
    router.post('/change-log', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ChangeLogSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.recordChange(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'change_log_record_failed', e);
        }
    });
    router.get('/change-log', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ entries: await m.listChangeLog(c.tenantId, {
                    targetKind: req.query.targetKind ?? null,
                    targetId: req.query.targetId ?? null,
                    actorId: req.query.actorId ?? null,
                    limit: parseInt(String(req.query.limit ?? 200), 10),
                }) });
        }
        catch (e) {
            fail(res, 'change_log_list_failed', e);
        }
    });
    // Publish requests
    router.get('/publish-requests', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ requests: await m.listPublishRequests(c.tenantId, {
                    status: req.query.status ?? null,
                    targetKind: req.query.targetKind ?? null,
                    targetId: req.query.targetId ?? null,
                }) });
        }
        catch (e) {
            fail(res, 'publish_requests_list_failed', e);
        }
    });
    router.post('/publish-requests', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = PublishRequestSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createPublishRequest(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'publish_request_create_failed', e);
        }
    });
    router.post('/publish-requests/:requestId/resolve', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.requestId)) {
            res.status(400).json({ error: 'invalid_request_id' });
            return;
        }
        const p = PublishRequestResolveSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            const r = await m.resolvePublishRequest(c.tenantId, req.params.requestId, p.data.status);
            if (!r) {
                res.status(404).json({ error: 'request_not_found' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            fail(res, 'publish_request_resolve_failed', e);
        }
    });
    // Publish approvals
    router.get('/publish-requests/:requestId/approvals', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.requestId)) {
            res.status(400).json({ error: 'invalid_request_id' });
            return;
        }
        try {
            res.json({ approvals: await m.listApprovals(c.tenantId, req.params.requestId) });
        }
        catch (e) {
            fail(res, 'approvals_list_failed', e);
        }
    });
    router.put('/publish-requests/:requestId/approvals', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.requestId)) {
            res.status(400).json({ error: 'invalid_request_id' });
            return;
        }
        const p = PublishApprovalSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertApproval(c.tenantId, req.params.requestId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'approval_upsert_failed', e);
        }
    });
    // Published versions
    router.get('/published-versions', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ versions: await m.listPublishedVersions(c.tenantId, {
                    targetKind: req.query.targetKind ?? null,
                    targetId: req.query.targetId ?? null,
                    currentOnly: String(req.query.currentOnly ?? '') === 'true',
                }) });
        }
        catch (e) {
            fail(res, 'published_versions_list_failed', e);
        }
    });
    router.get('/published-versions/:versionId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.versionId)) {
            res.status(400).json({ error: 'invalid_version_id' });
            return;
        }
        try {
            const v = await m.getPublishedVersion(c.tenantId, req.params.versionId);
            if (!v) {
                res.status(404).json({ error: 'version_not_found' });
                return;
            }
            res.json(v);
        }
        catch (e) {
            fail(res, 'published_version_get_failed', e);
        }
    });
    router.post('/published-versions', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = PublishedVersionSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.publishVersion(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'publish_version_failed', e);
        }
    });
    // Drafts
    router.get('/drafts', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ drafts: await m.listDrafts(c.tenantId, {
                    targetKind: req.query.targetKind ?? null,
                    targetId: req.query.targetId ?? null,
                    activeOnly: String(req.query.activeOnly ?? '') === 'true',
                }) });
        }
        catch (e) {
            fail(res, 'drafts_list_failed', e);
        }
    });
    router.get('/drafts/:draftId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.draftId)) {
            res.status(400).json({ error: 'invalid_draft_id' });
            return;
        }
        try {
            const d = await m.getDraft(c.tenantId, req.params.draftId);
            if (!d) {
                res.status(404).json({ error: 'draft_not_found' });
                return;
            }
            res.json(d);
        }
        catch (e) {
            fail(res, 'draft_get_failed', e);
        }
    });
    router.put('/drafts', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = DraftSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertDraft(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'draft_upsert_failed', e);
        }
    });
    router.delete('/drafts/:draftId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.draftId)) {
            res.status(400).json({ error: 'invalid_draft_id' });
            return;
        }
        try {
            const ok = await m.deleteDraft(c.tenantId, req.params.draftId);
            if (!ok) {
                res.status(404).json({ error: 'draft_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'draft_delete_failed', e);
        }
    });
    // Rollback points
    router.get('/rollback-points', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ points: await m.listRollbackPoints(c.tenantId, {
                    targetKind: req.query.targetKind ?? null,
                    targetId: req.query.targetId ?? null,
                }) });
        }
        catch (e) {
            fail(res, 'rollback_points_list_failed', e);
        }
    });
    router.get('/rollback-points/:pointId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.pointId)) {
            res.status(400).json({ error: 'invalid_point_id' });
            return;
        }
        try {
            const r = await m.getRollbackPoint(c.tenantId, req.params.pointId);
            if (!r) {
                res.status(404).json({ error: 'point_not_found' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            fail(res, 'rollback_point_get_failed', e);
        }
    });
    router.post('/rollback-points', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = RollbackPointSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createRollbackPoint(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'rollback_point_create_failed', e);
        }
    });
    // Schema validation
    router.post('/schema-validations', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = SchemaValidationSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.recordSchemaValidation(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'schema_validation_record_failed', e);
        }
    });
    router.get('/schema-validations', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ results: await m.listSchemaValidations(c.tenantId, {
                    subjectKind: req.query.subjectKind ?? null,
                    subjectId: req.query.subjectId ?? null,
                    limit: parseInt(String(req.query.limit ?? 100), 10),
                }) });
        }
        catch (e) {
            fail(res, 'schema_validations_list_failed', e);
        }
    });
    // Contract drift
    router.post('/contract-drift', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ContractDriftSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.recordDrift(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'drift_record_failed', e);
        }
    });
    router.get('/contract-drift', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ results: await m.listDrift(c.tenantId, {
                    openOnly: String(req.query.openOnly ?? '') === 'true',
                    limit: parseInt(String(req.query.limit ?? 100), 10),
                }) });
        }
        catch (e) {
            fail(res, 'drift_list_failed', e);
        }
    });
    router.post('/contract-drift/:driftId/resolve', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.driftId)) {
            res.status(400).json({ error: 'invalid_drift_id' });
            return;
        }
        try {
            const r = await m.resolveDrift(c.tenantId, req.params.driftId);
            if (!r) {
                res.status(404).json({ error: 'drift_not_found' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            fail(res, 'drift_resolve_failed', e);
        }
    });
    // Admin activity log
    router.post('/admin-activity', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = AdminActivitySchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.recordAdminActivity(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'admin_activity_record_failed', e);
        }
    });
    router.get('/admin-activity', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ entries: await m.listAdminActivity(c.tenantId, {
                    actorId: req.query.actorId ?? null,
                    actionCode: req.query.actionCode ?? null,
                    limit: parseInt(String(req.query.limit ?? 200), 10),
                }) });
        }
        catch (e) {
            fail(res, 'admin_activity_list_failed', e);
        }
    });
    return router;
}
//# sourceMappingURL=governance.routes.js.map
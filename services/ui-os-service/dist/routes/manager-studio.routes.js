import { Router } from 'express';
import { UiOsManagerStudioManager } from '../managers/ui-os-manager-studio.manager.js';
import { ManagerProjectSchema, ManagerDraftCreateSchema, ManagerDraftUpdateSchema, ManagerLockAcquireSchema, ManagerCommentSchema, ManagerValidationRunSchema, ManagerPreviewSessionSchema, ManagerImportJobCreateSchema, ManagerExportJobCreateSchema, ManagerJobUpdateSchema, } from '../schemas/manager-studio.schemas.js';
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
    if (m.includes('violates check constraint')) {
        res.status(400).json({ error: 'check_violation', message: m });
        return;
    }
    res.status(500).json({ error: code, message: m });
}
export function createManagerStudioRouter(pool) {
    const router = Router();
    const m = new UiOsManagerStudioManager(pool);
    const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    const fgaEditor = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'editor', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    const fgaAdmin = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'admin', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    // Projects
    router.get('/manager/projects', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ projects: await m.listProjects(c.tenantId, String(req.query.activeOnly ?? '') === 'true') });
        }
        catch (e) {
            fail(res, 'projects_list_failed', e);
        }
    });
    router.get('/manager/projects/:projectId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.projectId)) {
            res.status(400).json({ error: 'invalid_project_id' });
            return;
        }
        try {
            const p = await m.getProject(c.tenantId, req.params.projectId);
            if (!p) {
                res.status(404).json({ error: 'project_not_found' });
                return;
            }
            res.json(p);
        }
        catch (e) {
            fail(res, 'project_get_failed', e);
        }
    });
    router.put('/manager/projects', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ManagerProjectSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertProject(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'project_upsert_failed', e);
        }
    });
    router.delete('/manager/projects/:projectId', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.projectId)) {
            res.status(400).json({ error: 'invalid_project_id' });
            return;
        }
        try {
            const ok = await m.deleteProject(c.tenantId, req.params.projectId);
            if (!ok) {
                res.status(404).json({ error: 'project_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'project_delete_failed', e);
        }
    });
    // Drafts
    router.get('/manager/drafts', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ drafts: await m.listDrafts(c.tenantId, {
                    projectId: req.query.projectId ?? null,
                    targetKind: req.query.targetKind ?? null,
                    targetId: req.query.targetId ?? null,
                    state: req.query.state ?? null,
                }) });
        }
        catch (e) {
            fail(res, 'drafts_list_failed', e);
        }
    });
    router.get('/manager/drafts/:draftId', fgaViewer, async (req, res) => {
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
    router.post('/manager/drafts', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ManagerDraftCreateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createDraft(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'draft_create_failed', e);
        }
    });
    router.patch('/manager/drafts/:draftId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.draftId)) {
            res.status(400).json({ error: 'invalid_draft_id' });
            return;
        }
        const p = ManagerDraftUpdateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            const r = await m.updateDraft(c.tenantId, req.params.draftId, p.data);
            if (!r) {
                res.status(404).json({ error: 'draft_not_found' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            fail(res, 'draft_update_failed', e);
        }
    });
    router.delete('/manager/drafts/:draftId', fgaEditor, async (req, res) => {
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
    // Locks
    router.get('/manager/locks', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ locks: await m.listActiveLocks(c.tenantId, {
                    targetKind: req.query.targetKind ?? null,
                    targetId: req.query.targetId ?? null,
                }) });
        }
        catch (e) {
            fail(res, 'locks_list_failed', e);
        }
    });
    router.post('/manager/locks', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ManagerLockAcquireSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.acquireLock(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'lock_acquire_failed', e);
        }
    });
    router.post('/manager/locks/:lockId/release', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.lockId)) {
            res.status(400).json({ error: 'invalid_lock_id' });
            return;
        }
        try {
            const r = await m.releaseLock(c.tenantId, req.params.lockId, c.userId);
            if (!r) {
                res.status(404).json({ error: 'lock_not_found_or_not_owner' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            fail(res, 'lock_release_failed', e);
        }
    });
    // Comments
    router.get('/manager/drafts/:draftId/comments', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.draftId)) {
            res.status(400).json({ error: 'invalid_draft_id' });
            return;
        }
        try {
            res.json({ comments: await m.listComments(c.tenantId, req.params.draftId) });
        }
        catch (e) {
            fail(res, 'comments_list_failed', e);
        }
    });
    router.post('/manager/drafts/:draftId/comments', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.draftId)) {
            res.status(400).json({ error: 'invalid_draft_id' });
            return;
        }
        const p = ManagerCommentSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.addComment(c.tenantId, req.params.draftId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'comment_add_failed', e);
        }
    });
    router.post('/manager/comments/:commentId/resolve', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.commentId)) {
            res.status(400).json({ error: 'invalid_comment_id' });
            return;
        }
        try {
            const r = await m.resolveComment(c.tenantId, req.params.commentId, c.userId);
            if (!r) {
                res.status(404).json({ error: 'comment_not_found_or_already_resolved' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            fail(res, 'comment_resolve_failed', e);
        }
    });
    router.delete('/manager/comments/:commentId', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.commentId)) {
            res.status(400).json({ error: 'invalid_comment_id' });
            return;
        }
        try {
            const ok = await m.deleteComment(c.tenantId, req.params.commentId);
            if (!ok) {
                res.status(404).json({ error: 'comment_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'comment_delete_failed', e);
        }
    });
    // Validation runs
    router.post('/manager/validation-runs', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ManagerValidationRunSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.recordValidationRun(c.tenantId, p.data));
        }
        catch (e) {
            fail(res, 'validation_run_record_failed', e);
        }
    });
    router.get('/manager/projects/:projectId/validation-runs', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.projectId)) {
            res.status(400).json({ error: 'invalid_project_id' });
            return;
        }
        try {
            res.json({ runs: await m.listValidationRuns(c.tenantId, req.params.projectId, parseInt(String(req.query.limit ?? 100), 10)) });
        }
        catch (e) {
            fail(res, 'validation_runs_list_failed', e);
        }
    });
    // Preview sessions
    router.post('/manager/preview-sessions', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ManagerPreviewSessionSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createPreviewSession(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'preview_session_create_failed', e);
        }
    });
    router.get('/manager/projects/:projectId/preview-sessions', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.projectId)) {
            res.status(400).json({ error: 'invalid_project_id' });
            return;
        }
        try {
            res.json({ sessions: await m.listPreviewSessions(c.tenantId, req.params.projectId) });
        }
        catch (e) {
            fail(res, 'preview_sessions_list_failed', e);
        }
    });
    router.post('/manager/preview-sessions/:sessionId/revoke', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.sessionId)) {
            res.status(400).json({ error: 'invalid_session_id' });
            return;
        }
        try {
            const r = await m.revokePreviewSession(c.tenantId, req.params.sessionId);
            if (!r) {
                res.status(404).json({ error: 'session_not_found_or_already_revoked' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            fail(res, 'preview_session_revoke_failed', e);
        }
    });
    // Import jobs
    router.get('/manager/import-jobs', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ jobs: await m.listImportJobs(c.tenantId, {
                    projectId: req.query.projectId ?? null,
                    status: req.query.status ?? null,
                    limit: parseInt(String(req.query.limit ?? 100), 10),
                }) });
        }
        catch (e) {
            fail(res, 'import_jobs_list_failed', e);
        }
    });
    router.post('/manager/import-jobs', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ManagerImportJobCreateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createImportJob(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'import_job_create_failed', e);
        }
    });
    router.patch('/manager/import-jobs/:jobId', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.jobId)) {
            res.status(400).json({ error: 'invalid_job_id' });
            return;
        }
        const p = ManagerJobUpdateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            const r = await m.updateImportJob(c.tenantId, req.params.jobId, p.data);
            if (!r) {
                res.status(404).json({ error: 'job_not_found' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            fail(res, 'import_job_update_failed', e);
        }
    });
    // Export jobs
    router.get('/manager/export-jobs', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ jobs: await m.listExportJobs(c.tenantId, {
                    projectId: req.query.projectId ?? null,
                    status: req.query.status ?? null,
                    limit: parseInt(String(req.query.limit ?? 100), 10),
                }) });
        }
        catch (e) {
            fail(res, 'export_jobs_list_failed', e);
        }
    });
    router.post('/manager/export-jobs', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = ManagerExportJobCreateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createExportJob(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'export_job_create_failed', e);
        }
    });
    router.patch('/manager/export-jobs/:jobId', fgaAdmin, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.jobId)) {
            res.status(400).json({ error: 'invalid_job_id' });
            return;
        }
        const p = ManagerJobUpdateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            const r = await m.updateExportJob(c.tenantId, req.params.jobId, p.data);
            if (!r) {
                res.status(404).json({ error: 'job_not_found' });
                return;
            }
            res.json(r);
        }
        catch (e) {
            fail(res, 'export_job_update_failed', e);
        }
    });
    return router;
}
//# sourceMappingURL=manager-studio.routes.js.map
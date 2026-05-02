import { Router } from 'express';
import { UiOsFormManager } from '../managers/ui-os-form.manager.js';
import { FormDefinitionCreateSchema, FormDefinitionPatchSchema, FormSectionSchema, FormFieldSchema, FormFieldRuleSchema, FormValidationRuleSchema, FormDefaultValueSchema, FormSubmissionCreateSchema, FormSubmissionTransitionSchema, FormDraftSchema, FormAttachmentSchema, FormApprovalLinkSchema, FormApprovalDecisionSchema, } from '../schemas/form.schemas.js';
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
export function createFormRouter(pool) {
    const router = Router();
    const m = new UiOsFormManager(pool);
    const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    const fgaEditor = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
            ? { user: `user:${req.principal.sub}`, relation: 'editor', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
    // Definitions
    router.get('/forms/definitions', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ definitions: await m.listDefinitions(c.tenantId, {
                    moduleCode: req.query.moduleCode ?? null,
                    productCode: req.query.productCode ?? null,
                }) });
        }
        catch (e) {
            fail(res, 'definitions_list_failed', e);
        }
    });
    router.get('/forms/definitions/:formKey', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            const v = req.query.version ? parseInt(String(req.query.version), 10) : undefined;
            const def = await m.getDefinition(c.tenantId, req.params.formKey, v);
            if (!def) {
                res.status(404).json({ error: 'definition_not_found' });
                return;
            }
            res.json(def);
        }
        catch (e) {
            fail(res, 'definition_get_failed', e);
        }
    });
    router.post('/forms/definitions', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = FormDefinitionCreateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createDefinition(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'definition_create_failed', e);
        }
    });
    router.put('/forms/definitions/:formId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.formId)) {
            res.status(400).json({ error: 'invalid_form_id' });
            return;
        }
        const p = FormDefinitionPatchSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            const out = await m.updateDefinition(c.tenantId, req.params.formId, c.userId, p.data);
            if (!out) {
                res.status(404).json({ error: 'definition_not_found' });
                return;
            }
            res.json(out);
        }
        catch (e) {
            fail(res, 'definition_update_failed', e);
        }
    });
    router.delete('/forms/definitions/:formId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.formId)) {
            res.status(400).json({ error: 'invalid_form_id' });
            return;
        }
        try {
            const ok = await m.deleteDefinition(c.tenantId, req.params.formId);
            if (!ok) {
                res.status(404).json({ error: 'definition_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'definition_delete_failed', e);
        }
    });
    // Sections
    router.get('/forms/definitions/:formId/sections', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.formId)) {
            res.status(400).json({ error: 'invalid_form_id' });
            return;
        }
        try {
            res.json({ sections: await m.listSections(c.tenantId, req.params.formId) });
        }
        catch (e) {
            fail(res, 'sections_list_failed', e);
        }
    });
    router.put('/forms/definitions/:formId/sections', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.formId)) {
            res.status(400).json({ error: 'invalid_form_id' });
            return;
        }
        const p = FormSectionSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertSection(c.tenantId, req.params.formId, p.data));
        }
        catch (e) {
            fail(res, 'section_upsert_failed', e);
        }
    });
    router.delete('/forms/sections/:sectionId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.sectionId)) {
            res.status(400).json({ error: 'invalid_section_id' });
            return;
        }
        try {
            const ok = await m.deleteSection(c.tenantId, req.params.sectionId);
            if (!ok) {
                res.status(404).json({ error: 'section_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'section_delete_failed', e);
        }
    });
    // Fields
    router.get('/forms/sections/:sectionId/fields', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.sectionId)) {
            res.status(400).json({ error: 'invalid_section_id' });
            return;
        }
        try {
            res.json({ fields: await m.listFields(c.tenantId, req.params.sectionId) });
        }
        catch (e) {
            fail(res, 'fields_list_failed', e);
        }
    });
    router.put('/forms/sections/:sectionId/fields', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.sectionId)) {
            res.status(400).json({ error: 'invalid_section_id' });
            return;
        }
        const p = FormFieldSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertField(c.tenantId, req.params.sectionId, p.data));
        }
        catch (e) {
            fail(res, 'field_upsert_failed', e);
        }
    });
    router.delete('/forms/fields/:fieldId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.fieldId)) {
            res.status(400).json({ error: 'invalid_field_id' });
            return;
        }
        try {
            const ok = await m.deleteField(c.tenantId, req.params.fieldId);
            if (!ok) {
                res.status(404).json({ error: 'field_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'field_delete_failed', e);
        }
    });
    // Field rules
    router.get('/forms/fields/:fieldId/rules', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.fieldId)) {
            res.status(400).json({ error: 'invalid_field_id' });
            return;
        }
        try {
            res.json({ rules: await m.listFieldRules(c.tenantId, req.params.fieldId) });
        }
        catch (e) {
            fail(res, 'rules_list_failed', e);
        }
    });
    router.post('/forms/fields/:fieldId/rules', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.fieldId)) {
            res.status(400).json({ error: 'invalid_field_id' });
            return;
        }
        const p = FormFieldRuleSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createFieldRule(c.tenantId, c.userId, req.params.fieldId, p.data));
        }
        catch (e) {
            fail(res, 'rule_create_failed', e);
        }
    });
    router.delete('/forms/field-rules/:ruleId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.ruleId)) {
            res.status(400).json({ error: 'invalid_rule_id' });
            return;
        }
        try {
            const ok = await m.deleteFieldRule(c.tenantId, req.params.ruleId);
            if (!ok) {
                res.status(404).json({ error: 'rule_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'rule_delete_failed', e);
        }
    });
    // Validation rules
    router.get('/forms/fields/:fieldId/validators', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.fieldId)) {
            res.status(400).json({ error: 'invalid_field_id' });
            return;
        }
        try {
            res.json({ validators: await m.listValidationRules(c.tenantId, req.params.fieldId) });
        }
        catch (e) {
            fail(res, 'validators_list_failed', e);
        }
    });
    router.put('/forms/fields/:fieldId/validators', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.fieldId)) {
            res.status(400).json({ error: 'invalid_field_id' });
            return;
        }
        const p = FormValidationRuleSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertValidationRule(c.tenantId, req.params.fieldId, p.data));
        }
        catch (e) {
            fail(res, 'validator_upsert_failed', e);
        }
    });
    router.delete('/forms/validators/:ruleId', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.ruleId)) {
            res.status(400).json({ error: 'invalid_rule_id' });
            return;
        }
        try {
            const ok = await m.deleteValidationRule(c.tenantId, req.params.ruleId);
            if (!ok) {
                res.status(404).json({ error: 'rule_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'validator_delete_failed', e);
        }
    });
    // Default values
    router.get('/forms/fields/:fieldId/default', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.fieldId)) {
            res.status(400).json({ error: 'invalid_field_id' });
            return;
        }
        try {
            res.json(await m.getDefaultValue(c.tenantId, req.params.fieldId) ?? null);
        }
        catch (e) {
            fail(res, 'default_get_failed', e);
        }
    });
    router.put('/forms/fields/:fieldId/default', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.fieldId)) {
            res.status(400).json({ error: 'invalid_field_id' });
            return;
        }
        const p = FormDefaultValueSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertDefaultValue(c.tenantId, req.params.fieldId, p.data));
        }
        catch (e) {
            fail(res, 'default_upsert_failed', e);
        }
    });
    // Submissions
    router.get('/forms/submissions', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ submissions: await m.listSubmissions(c.tenantId, {
                    formId: req.query.formId ?? null,
                    submitterUserId: req.query.submitter ?? null,
                    status: req.query.status ?? null,
                    entityId: req.query.entityId ?? null,
                }) });
        }
        catch (e) {
            fail(res, 'submissions_list_failed', e);
        }
    });
    router.get('/forms/submissions/:submissionId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.submissionId)) {
            res.status(400).json({ error: 'invalid_submission_id' });
            return;
        }
        try {
            const s = await m.getSubmission(c.tenantId, req.params.submissionId);
            if (!s) {
                res.status(404).json({ error: 'submission_not_found' });
                return;
            }
            res.json(s);
        }
        catch (e) {
            fail(res, 'submission_get_failed', e);
        }
    });
    router.post('/forms/submissions', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = FormSubmissionCreateSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createSubmission(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'submission_create_failed', e);
        }
    });
    router.post('/forms/submissions/:submissionId/transition', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.submissionId)) {
            res.status(400).json({ error: 'invalid_submission_id' });
            return;
        }
        const p = FormSubmissionTransitionSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            const out = await m.transitionSubmission(c.tenantId, req.params.submissionId, p.data.status);
            if (!out) {
                res.status(404).json({ error: 'submission_not_found' });
                return;
            }
            res.json(out);
        }
        catch (e) {
            fail(res, 'submission_transition_failed', e);
        }
    });
    // Drafts
    router.get('/forms/drafts/:formId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.formId)) {
            res.status(400).json({ error: 'invalid_form_id' });
            return;
        }
        const entityId = req.query.entityId ?? null;
        try {
            res.json(await m.getDraft(c.tenantId, c.userId, req.params.formId, entityId) ?? null);
        }
        catch (e) {
            fail(res, 'draft_get_failed', e);
        }
    });
    router.put('/forms/drafts', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = FormDraftSchema.safeParse(req.body ?? {});
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
    router.delete('/forms/drafts/:draftId', fgaViewer, async (req, res) => {
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
    // Attachments
    router.get('/forms/attachments', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        try {
            res.json({ attachments: await m.listAttachments(c.tenantId, {
                    submissionId: req.query.submissionId ?? null,
                    draftId: req.query.draftId ?? null,
                }) });
        }
        catch (e) {
            fail(res, 'attachments_list_failed', e);
        }
    });
    router.post('/forms/attachments', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        const p = FormAttachmentSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.status(201).json(await m.createAttachment(c.tenantId, c.userId, p.data));
        }
        catch (e) {
            fail(res, 'attachment_create_failed', e);
        }
    });
    router.delete('/forms/attachments/:attachmentId', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.attachmentId)) {
            res.status(400).json({ error: 'invalid_attachment_id' });
            return;
        }
        try {
            const ok = await m.deleteAttachment(c.tenantId, req.params.attachmentId);
            if (!ok) {
                res.status(404).json({ error: 'attachment_not_found' });
                return;
            }
            res.status(204).send();
        }
        catch (e) {
            fail(res, 'attachment_delete_failed', e);
        }
    });
    // Approval links
    router.get('/forms/submissions/:submissionId/approvals', fgaViewer, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.submissionId)) {
            res.status(400).json({ error: 'invalid_submission_id' });
            return;
        }
        try {
            res.json({ approvals: await m.listApprovalLinks(c.tenantId, req.params.submissionId) });
        }
        catch (e) {
            fail(res, 'approvals_list_failed', e);
        }
    });
    router.put('/forms/submissions/:submissionId/approvals', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.submissionId)) {
            res.status(400).json({ error: 'invalid_submission_id' });
            return;
        }
        const p = FormApprovalLinkSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            res.json(await m.upsertApprovalLink(c.tenantId, req.params.submissionId, p.data));
        }
        catch (e) {
            fail(res, 'approval_upsert_failed', e);
        }
    });
    router.post('/forms/approvals/:linkId/decide', fgaEditor, async (req, res) => {
        const c = ctx(req, res);
        if (!c)
            return;
        if (!UUID.test(req.params.linkId)) {
            res.status(400).json({ error: 'invalid_link_id' });
            return;
        }
        const p = FormApprovalDecisionSchema.safeParse(req.body ?? {});
        if (!p.success) {
            res.status(400).json({ error: 'invalid_request', details: p.error.flatten() });
            return;
        }
        try {
            const out = await m.decideApproval(c.tenantId, req.params.linkId, c.userId, p.data.decision, p.data.comments ?? null);
            if (!out) {
                res.status(404).json({ error: 'link_not_found' });
                return;
            }
            res.json(out);
        }
        catch (e) {
            fail(res, 'approval_decide_failed', e);
        }
    });
    return router;
}
//# sourceMappingURL=form.routes.js.map
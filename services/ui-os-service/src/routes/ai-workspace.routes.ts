import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';
import { UiOsAiWorkspaceManager } from '../managers/ui-os-ai-workspace.manager.js';
import {
  AiContextPanelSchema, AiSuggestionSchema, AiSuggestionFeedbackSchema,
  AiActionDraftSchema, AiActionDraftStateSchema, AiMemorySchema,
  AiPromptTemplateSchema, AiPromptTemplateToolSchema, AiToolSurfaceBindingSchema,
} from '../schemas/ai-workspace.schemas.js';
import { requireFga } from '../middleware/openfga.js';

const UUID = /^[0-9a-fA-F-]{36}$/;
function ctx(req: Request, res: Response) {
  const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId) as string | undefined;
  const userId = (req.header('x-dos-user-id') ?? req.query.userId) as string | undefined;
  if (!tenantId || !userId) { res.status(400).json({ error: 'missing_identity' }); return null; }
  return { tenantId, userId };
}
function fail(res: Response, code: string, e: unknown) {
  const m = (e as Error).message;
  if (m.includes('duplicate key')) { res.status(409).json({ error: 'conflict' }); return; }
  if (m.includes('violates foreign key')) { res.status(400).json({ error: 'fk_violation', message: m }); return; }
  res.status(500).json({ error: code, message: m });
}

export function createAiWorkspaceRouter(pool: DbPool): Router {
  const router = Router();
  const m = new UiOsAiWorkspaceManager(pool);
  const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
    ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
  const fgaEditor = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
    ? { user: `user:${req.principal.sub}`, relation: 'editor', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
  const fgaAdmin = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
    ? { user: `user:${req.principal.sub}`, relation: 'admin', object: `ui_os_tenant:${req.principal.tenantId}` } : null });

  // Context panels
  router.get('/ai/panels', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ panels: await m.listPanels(c.tenantId) }); } catch (e) { fail(res, 'panels_list_failed', e); }
  });
  router.get('/ai/panels/by-route/:routeKey', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try {
      const p = await m.getPanelByRoute(c.tenantId, req.params.routeKey);
      if (!p) { res.status(404).json({ error: 'panel_not_found' }); return; }
      res.json(p);
    } catch (e) { fail(res, 'panel_get_failed', e); }
  });
  router.put('/ai/panels', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = AiContextPanelSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertPanel(c.tenantId, p.data)); } catch (e) { fail(res, 'panel_upsert_failed', e); }
  });
  router.delete('/ai/panels/:panelId', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.panelId)) { res.status(400).json({ error: 'invalid_panel_id' }); return; }
    try {
      const ok = await m.deletePanel(c.tenantId, req.params.panelId);
      if (!ok) { res.status(404).json({ error: 'panel_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'panel_delete_failed', e); }
  });

  // Suggestions
  router.post('/ai/suggestions', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = AiSuggestionSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(201).json(await m.recordSuggestion(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'suggestion_record_failed', e); }
  });
  router.get('/ai/suggestions', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ suggestions: await m.listSuggestions(c.tenantId, c.userId,
      parseInt(String(req.query.limit ?? 50), 10)) }); } catch (e) { fail(res, 'suggestions_list_failed', e); }
  });

  // Suggestion feedback
  router.put('/ai/suggestions/:suggestionId/feedback', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.suggestionId)) { res.status(400).json({ error: 'invalid_suggestion_id' }); return; }
    const p = AiSuggestionFeedbackSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.recordFeedback(c.tenantId, req.params.suggestionId, c.userId, p.data)); } catch (e) { fail(res, 'feedback_record_failed', e); }
  });
  router.get('/ai/suggestions/:suggestionId/feedback', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.suggestionId)) { res.status(400).json({ error: 'invalid_suggestion_id' }); return; }
    try { res.json({ feedback: await m.listFeedback(c.tenantId, req.params.suggestionId) }); } catch (e) { fail(res, 'feedback_list_failed', e); }
  });

  // Action drafts
  router.get('/ai/action-drafts', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ drafts: await m.listDrafts(c.tenantId, c.userId, {
      state: (req.query.state as string | undefined) ?? null,
      limit: parseInt(String(req.query.limit ?? 100), 10),
    }) }); } catch (e) { fail(res, 'action_drafts_list_failed', e); }
  });
  router.get('/ai/action-drafts/:draftId', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.draftId)) { res.status(400).json({ error: 'invalid_draft_id' }); return; }
    try {
      const d = await m.getDraft(c.tenantId, req.params.draftId);
      if (!d) { res.status(404).json({ error: 'draft_not_found' }); return; }
      res.json(d);
    } catch (e) { fail(res, 'action_draft_get_failed', e); }
  });
  router.post('/ai/action-drafts', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = AiActionDraftSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(201).json(await m.createDraft(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'action_draft_create_failed', e); }
  });
  router.post('/ai/action-drafts/:draftId/state', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.draftId)) { res.status(400).json({ error: 'invalid_draft_id' }); return; }
    const p = AiActionDraftStateSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try {
      const r = await m.updateDraftState(c.tenantId, req.params.draftId, p.data.state);
      if (!r) { res.status(404).json({ error: 'draft_not_found' }); return; }
      res.json(r);
    } catch (e) { fail(res, 'action_draft_state_failed', e); }
  });
  router.delete('/ai/action-drafts/:draftId', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.draftId)) { res.status(400).json({ error: 'invalid_draft_id' }); return; }
    try {
      const ok = await m.deleteDraft(c.tenantId, req.params.draftId);
      if (!ok) { res.status(404).json({ error: 'draft_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'action_draft_delete_failed', e); }
  });

  // Workspace memory
  router.get('/ai/memory', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ memory: await m.listMemory(c.tenantId, c.userId) }); } catch (e) { fail(res, 'memory_list_failed', e); }
  });
  router.get('/ai/memory/:memoryKey', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try {
      const r = await m.getMemory(c.tenantId, c.userId, req.params.memoryKey);
      if (!r) { res.status(404).json({ error: 'memory_not_found' }); return; }
      res.json(r);
    } catch (e) { fail(res, 'memory_get_failed', e); }
  });
  router.put('/ai/memory', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = AiMemorySchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertMemory(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'memory_upsert_failed', e); }
  });
  router.delete('/ai/memory/:memoryKey', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try {
      const ok = await m.deleteMemory(c.tenantId, c.userId, req.params.memoryKey);
      if (!ok) { res.status(404).json({ error: 'memory_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'memory_delete_failed', e); }
  });

  // Prompt templates
  router.get('/ai/prompt-templates', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ templates: await m.listPromptTemplates(c.tenantId,
      String(req.query.activeOnly ?? '') === 'true') }); } catch (e) { fail(res, 'templates_list_failed', e); }
  });
  router.get('/ai/prompt-templates/:templateId', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.templateId)) { res.status(400).json({ error: 'invalid_template_id' }); return; }
    try {
      const t = await m.getPromptTemplate(c.tenantId, req.params.templateId);
      if (!t) { res.status(404).json({ error: 'template_not_found' }); return; }
      res.json(t);
    } catch (e) { fail(res, 'template_get_failed', e); }
  });
  router.put('/ai/prompt-templates', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = AiPromptTemplateSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertPromptTemplate(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'template_upsert_failed', e); }
  });
  router.delete('/ai/prompt-templates/:templateId', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.templateId)) { res.status(400).json({ error: 'invalid_template_id' }); return; }
    try {
      const ok = await m.deletePromptTemplate(c.tenantId, req.params.templateId);
      if (!ok) { res.status(404).json({ error: 'template_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'template_delete_failed', e); }
  });

  // Prompt template tools (m2m)
  router.get('/ai/prompt-templates/:templateId/tools', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.templateId)) { res.status(400).json({ error: 'invalid_template_id' }); return; }
    try { res.json({ tools: await m.listTemplateTools(c.tenantId, req.params.templateId) }); } catch (e) { fail(res, 'template_tools_list_failed', e); }
  });
  router.put('/ai/prompt-templates/:templateId/tools', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.templateId)) { res.status(400).json({ error: 'invalid_template_id' }); return; }
    const p = AiPromptTemplateToolSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertTemplateTool(c.tenantId, req.params.templateId, p.data)); } catch (e) { fail(res, 'template_tool_upsert_failed', e); }
  });
  router.delete('/ai/prompt-template-tools/:toolBindingId', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.toolBindingId)) { res.status(400).json({ error: 'invalid_tool_binding_id' }); return; }
    try {
      const ok = await m.deleteTemplateTool(c.tenantId, req.params.toolBindingId);
      if (!ok) { res.status(404).json({ error: 'tool_binding_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'template_tool_delete_failed', e); }
  });

  // Tool surface bindings
  router.get('/ai/tool-surface-bindings', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ bindings: await m.listToolSurfaceBindings(c.tenantId,
      (req.query.surfaceKey as string | undefined) ?? null) }); } catch (e) { fail(res, 'tool_surface_bindings_list_failed', e); }
  });
  router.put('/ai/tool-surface-bindings', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = AiToolSurfaceBindingSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertToolSurfaceBinding(c.tenantId, p.data)); } catch (e) { fail(res, 'tool_surface_binding_upsert_failed', e); }
  });
  router.delete('/ai/tool-surface-bindings/:bindingId', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.bindingId)) { res.status(400).json({ error: 'invalid_binding_id' }); return; }
    try {
      const ok = await m.deleteToolSurfaceBinding(c.tenantId, req.params.bindingId);
      if (!ok) { res.status(404).json({ error: 'binding_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'tool_surface_binding_delete_failed', e); }
  });

  return router;
}

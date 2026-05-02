import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';

// Local (service-native) routers — retained. Do NOT delete; they host
// request/response contracts the service has hardened against.
import workflowRouter from './workflow.routes';
import taskRouter from './task.routes';
import approvalRouter from './approval.routes';
import scheduleRouter from './schedule.routes';
import templateRouter from './template.routes';
import slaRouter from './sla.routes';
import workItemRouter from './work-item.routes';
import autonomousWorkflowRouter from './autonomous-workflow.routes';

// ─────────────────────────────────────────────────────────────────────────
// V1 / Workflow vertical — mount every extracted module route file from
// modules/workflow/dist/workflow/routes/. Previously: zero module files
// mounted (296/325 routes orphaned per API-WIRE-AUDIT.md V0 2026-04-20).
// loadModuleRoute degrades to an empty Router if a file is missing, so
// real coverage is verified by __tests__/routes-mount.spec.ts rather
// than by startup crash.
// ─────────────────────────────────────────────────────────────────────────

const workflow_core_Router = loadModuleRoute('workflow/workflow-core', '../../../modules/workflow/dist/workflow/routes/workflow-core.routes');
const task_core_Router = loadModuleRoute('workflow/task-core', '../../../modules/workflow/dist/workflow/routes/task-core.routes');
const approval_core_Router = loadModuleRoute('workflow/approval-core', '../../../modules/workflow/dist/workflow/routes/approval-core.routes');
const schedule_core_Router = loadModuleRoute('workflow/schedule-core', '../../../modules/workflow/dist/workflow/routes/schedule-core.routes');
const template_core_Router = loadModuleRoute('workflow/template-core', '../../../modules/workflow/dist/workflow/routes/template-core.routes');
const sla_core_Router = loadModuleRoute('workflow/sla-core', '../../../modules/workflow/dist/workflow/routes/sla-core.routes');
const workflow_diagnostics_Router = loadModuleRoute('workflow/workflow-diagnostics', '../../../modules/workflow/dist/workflow/routes/workflow-diagnostics.routes');
const workflow_profile_Router = loadModuleRoute('workflow/workflow-profile', '../../../modules/workflow/dist/workflow/routes/workflow-profile.routes');
const workflow_admin_top_Router = loadModuleRoute('workflow/admin/workflow-admin', '../../../modules/workflow/dist/workflow/admin/workflow-admin.routes');

// workflow/* — 3-level approval and nested workflow extras.
// The 6 workflow-3level-{ai,controls,drafts,instance-ops,monitoring,supervisor}
// files export `registerXRoutes(router)` helpers, NOT default Routers. They
// are consumed by the workflow-3level.routes barrel below, which creates one
// Router, calls every registerXRoutes on it, and exports it as default. The
// barrel is the only loadable module; its children register full paths like
// `/workflows/ai-notes`, `/workflows/supervisor/*` directly on the barrel.
const workflow_3level_Router = loadModuleRoute('workflow/workflow/workflow-3level', '../../../modules/workflow/dist/workflow/routes/workflow/workflow-3level.routes');
const workflow_nested_admin_Router = loadModuleRoute('workflow/workflow/workflow-admin', '../../../modules/workflow/dist/workflow/routes/workflow/workflow-admin.routes');
const workflow_advanced_Router = loadModuleRoute('workflow/workflow/workflow-advanced', '../../../modules/workflow/dist/workflow/routes/workflow/workflow-advanced.routes');
const workflow_agent_Router = loadModuleRoute('workflow/workflow/workflow-agent', '../../../modules/workflow/dist/workflow/routes/workflow/workflow-agent.routes');
const workflow_attachments_Router = loadModuleRoute('workflow/workflow/workflow-attachments', '../../../modules/workflow/dist/workflow/routes/workflow/workflow-attachments.routes');
const workflow_chain_Router = loadModuleRoute('workflow/workflow/workflow-chain', '../../../modules/workflow/dist/workflow/routes/workflow/workflow-chain.routes');
const workflow_comments_Router = loadModuleRoute('workflow/workflow/workflow-comments', '../../../modules/workflow/dist/workflow/routes/workflow/workflow-comments.routes');
const workflow_enterprise_Router = loadModuleRoute('workflow/workflow/workflow-enterprise', '../../../modules/workflow/dist/workflow/routes/workflow/workflow-enterprise.routes');
const workflow_ext_Router = loadModuleRoute('workflow/workflow/workflow-ext', '../../../modules/workflow/dist/workflow/routes/workflow/workflow-ext.routes');
const workflow_import_export_Router = loadModuleRoute('workflow/workflow/workflow-import-export', '../../../modules/workflow/dist/workflow/routes/workflow/workflow-import-export.routes');
const workflow_lookups_Router = loadModuleRoute('workflow/workflow/workflow-lookups', '../../../modules/workflow/dist/workflow/routes/workflow/workflow-lookups.routes');
const workflow_templates_Router = loadModuleRoute('workflow/workflow/workflow-templates', '../../../modules/workflow/dist/workflow/routes/workflow/workflow-templates.routes');

// misc — approval variants, bulk, cooperative, journey, orchestrator, process, review, task-board, work-items, workflows, autonomous
const approval_requests_Router = loadModuleRoute('workflow/misc/approval-requests', '../../../modules/workflow/dist/workflow/routes/misc/approval-requests.routes');
const approval_routing_Router = loadModuleRoute('workflow/misc/approval-routing', '../../../modules/workflow/dist/workflow/routes/misc/approval-routing.routes');
const autonomous_workflow_misc_Router = loadModuleRoute('workflow/misc/autonomous-workflow', '../../../modules/workflow/dist/workflow/routes/misc/autonomous-workflow.routes');
const bulk_tasks_Router = loadModuleRoute('workflow/misc/bulk-tasks', '../../../modules/workflow/dist/workflow/routes/misc/bulk-tasks.routes');
const cooperative_workflows_Router = loadModuleRoute('workflow/misc/cooperative-workflows', '../../../modules/workflow/dist/workflow/routes/misc/cooperative-workflows.routes');
const journey_Router = loadModuleRoute('workflow/misc/journey', '../../../modules/workflow/dist/workflow/routes/misc/journey.routes');
const module_ai_orchestrator_Router = loadModuleRoute('workflow/misc/module-ai-orchestrator', '../../../modules/workflow/dist/workflow/routes/misc/module-ai-orchestrator.routes');
const module_workflow_Router = loadModuleRoute('workflow/misc/module-workflow', '../../../modules/workflow/dist/workflow/routes/misc/module-workflow.routes');
const process_tasks_Router = loadModuleRoute('workflow/misc/process-tasks', '../../../modules/workflow/dist/workflow/routes/misc/process-tasks.routes');
const review_cycle_Router = loadModuleRoute('workflow/misc/review-cycle', '../../../modules/workflow/dist/workflow/routes/misc/review-cycle.routes');
const task_board_Router = loadModuleRoute('workflow/misc/task-board', '../../../modules/workflow/dist/workflow/routes/misc/task-board.routes');
const work_items_misc_Router = loadModuleRoute('workflow/misc/work-items', '../../../modules/workflow/dist/workflow/routes/misc/work-items.routes');
const workflows_misc_Router = loadModuleRoute('workflow/misc/workflows', '../../../modules/workflow/dist/workflow/routes/misc/workflows.routes');

// ─────────────────────────────────────────────────────────────────────────
// Mount
// ─────────────────────────────────────────────────────────────────────────

export const routes = Router();
export const workItemRoutes = Router();
export const autonomousRoutes = Router();

// Local routers (unchanged mounts — preserve existing FE contracts)
routes.use('/instances', workflowRouter);
routes.use('/tasks', taskRouter);
routes.use('/approvals', approvalRouter);
routes.use('/schedules', scheduleRouter);
routes.use('/templates', templateRouter);
routes.use('/sla', slaRouter);

// Module-extracted routers — mounted under /api/workflow/<name>
routes.use('/workflow-core', workflow_core_Router);
routes.use('/task-core', task_core_Router);
routes.use('/approval-core', approval_core_Router);
routes.use('/schedule-core', schedule_core_Router);
routes.use('/template-core', template_core_Router);
routes.use('/sla-core', sla_core_Router);
routes.use('/diagnostics', workflow_diagnostics_Router);
routes.use('/profile', workflow_profile_Router);
routes.use('/admin', workflow_admin_top_Router);

// 3-level approval chain (/api/workflow/3level/*) — the barrel mounts every
// sub-route (ai, controls, drafts, instance-ops, monitoring, supervisor) at
// paths declared inside the registerXRoutes helpers. No separate sub-mounts.
routes.use('/3level', workflow_3level_Router);

// Nested workflow/* extras
routes.use('/workflow-admin', workflow_nested_admin_Router);
routes.use('/advanced', workflow_advanced_Router);
routes.use('/agent', workflow_agent_Router);
routes.use('/attachments', workflow_attachments_Router);
routes.use('/chain', workflow_chain_Router);
routes.use('/comments', workflow_comments_Router);
routes.use('/enterprise', workflow_enterprise_Router);
routes.use('/ext', workflow_ext_Router);
routes.use('/import-export', workflow_import_export_Router);
routes.use('/lookups', workflow_lookups_Router);
routes.use('/workflow-templates', workflow_templates_Router);

// misc — sub-paths under /api/workflow
routes.use('/approval-requests', approval_requests_Router);
routes.use('/approval-routing', approval_routing_Router);
routes.use('/autonomous-workflow', autonomous_workflow_misc_Router);
routes.use('/bulk-tasks', bulk_tasks_Router);
routes.use('/cooperative-workflows', cooperative_workflows_Router);
routes.use('/journey', journey_Router);
routes.use('/module-ai-orchestrator', module_ai_orchestrator_Router);
routes.use('/module-workflow', module_workflow_Router);
routes.use('/process-tasks', process_tasks_Router);
routes.use('/review-cycle', review_cycle_Router);
routes.use('/task-board', task_board_Router);
routes.use('/work-items-misc', work_items_misc_Router);
routes.use('/workflows', workflows_misc_Router);

// Diagnostics for module loader visibility (GET /api/workflow/modules)
routes.use('/modules', modulesDiagnosticRouter());

// FE alias: GET /api/workflow/dashboard → reuse the existing
// /api/approval-requests/dashboard handler so the FE doesn't have to know
// about the sub-mount. Rewrite req.url before delegating so the loaded
// approval-requests router matches its own GET /dashboard handler.
const workflowDashboardAlias = Router();
workflowDashboardAlias.use((req, _res, next) => { req.url = '/dashboard'; next(); });
workflowDashboardAlias.use(approval_requests_Router);
routes.use('/dashboard', workflowDashboardAlias);

// Top-level roots (unchanged — mounted in server.ts).
// Local router first so existing contracts (GET /, GET /my-tasks, POST /,
// POST /:id/complete) keep their handlers; misc fills the gaps —
// GET /stats, GET /team-queue, POST /:id/claim — for FE callers that hit
// /api/work-items/* directly.
workItemRoutes.use('/', workItemRouter);
workItemRoutes.use('/', work_items_misc_Router);
autonomousRoutes.use('/', autonomousWorkflowRouter);

// ─────────────────────────────────────────────────────────────────────────
// Top-level exports for FE prefixes Shahin calls directly. server.ts
// mounts each under its own /api/<prefix> gateway slot so calls like
// GET /api/workflows, /api/bulk-tasks, /api/review-cycle resolve without
// FE rewrite. Each reuses the same loadModuleRoute result — no duplicate
// require() cost and no behaviour split.
// ─────────────────────────────────────────────────────────────────────────

export { approvalRouter as approvalsRootRouter };
export const workflowsRootRoutes = workflows_misc_Router;
export const bulkTasksRoutes = bulk_tasks_Router;
export const taskBoardRoutes = task_board_Router;
export const reviewCycleRoutes = review_cycle_Router;
export const processTasksRoutes = process_tasks_Router;
export const journeyRoutes = journey_Router;
export const approvalRequestsRoutes = approval_requests_Router;
export const approvalRoutingRoutes = approval_routing_Router;
export const moduleWorkflowRoutes = module_workflow_Router;
export const moduleAiOrchestratorRoutes = module_ai_orchestrator_Router;
export const cooperativeWorkflowsRoutes = cooperative_workflows_Router;
export const workflowChainRoutes = workflow_chain_Router;

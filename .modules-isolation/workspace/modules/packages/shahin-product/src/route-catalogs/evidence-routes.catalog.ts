// @ts-nocheck — module-layer imports not yet extracted
import type { RouteDefinition } from '../../../platform/routing/route-definition';

export const EVIDENCE_ROUTES: RouteDefinition[] = [
  {
    id: "routes_evidence_routes",
    productKey: "shahin-ai",
    ownerKind: "product",
    sourceKind: "defaultExport",
    sourceFile: "modules/evidence/routes/core/evidence.routes",
    exportName: "default",
    mountPath: "/api/evidence",
    guards: { module: "evidence" },
    order: 85,
  },
  {
    id: "routes_evidence_catalog_routes",
    productKey: "shahin-ai",
    ownerKind: "product",
    sourceKind: "defaultExport",
    sourceFile: "modules/evidence/routes/core/evidence-catalog.routes",
    exportName: "default",
    mountPath: "/api/evidence-catalog",
    guards: { module: "evidence" },
    order: 86,
  },
  {
    id: "routes_evidence_tasks_routes",
    productKey: "shahin-ai",
    ownerKind: "product",
    sourceKind: "defaultExport",
    sourceFile: "modules/evidence/routes/workflow/evidence-tasks.routes",
    exportName: "default",
    mountPath: "/api/evidence-tasks",
    guards: { module: "evidence" },
    order: 87,
  },
  {
    id: "routes_evidence_pipeline_webhooks",
    productKey: "shahin-ai",
    ownerKind: "product",
    sourceKind: "defaultExport",
    sourceFile: "modules/evidence/routes/collection/pipeline-webhook.routes",
    exportName: "default",
    mountPath: "/api",
    guards: { module: "evidence" },
    order: 88,
  },
];

// @ts-nocheck — module-layer imports not yet extracted
/**
 * Local Knowledge Routes Catalog
 * Product route catalog for Local Knowledge module in shahin-ai
 */

import type { RouteDefinition } from '../../../platform/routing/route-definition';

export const LOCAL_KNOWLEDGE_ROUTES: RouteDefinition[] = [
  {
    id: "shahin_local_knowledge_routes",
    productKey: "shahin-ai",
    ownerKind: "product",
    sourceKind: "defaultExport",
    sourceFile: "modules/local-knowledge/routes/local-knowledge.routes",
    exportName: "default",
    mountPath: "/api/local-knowledge",
    guards: {
      permissions: ["local_knowledge.*"]
    },
    order: 2800
  }
];

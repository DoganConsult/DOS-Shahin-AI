// @ts-nocheck — module-layer imports not yet extracted
/**
 * Inbox Routes Catalog
 * Product route catalog for Inbox module in shahin-ai
 */

import type { RouteDefinition } from '../../../platform/routing/route-definition';

export const INBOX_ROUTES: RouteDefinition[] = [
  {
    id: "shahin_inbox_routes",
    productKey: "shahin-ai",
    ownerKind: "product",
    sourceKind: "defaultExport",
    sourceFile: "modules/inbox/routes/inbox.routes",
    exportName: "default",
    mountPath: "/api/inbox",
    guards: {
      permissions: ["inbox.*"]
    },
    order: 2600
  }
];

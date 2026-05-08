// @fc/foundation-module — Foundation domain components.
// Doctrine: this package ships ONLY components registered into the DUI COMPONENT_MAP.
// Pages, routes, surfaces, labels, icons, actions all live in fc_dynamic_ui.* DB rows.
export const FC_FOUNDATION_MODULE_VERSION = '0.0.1';

// Component registry keys (what the DB rows reference). Implementations land in F7.
export const FC_FOUNDATION_COMPONENT_KEYS = Object.freeze([
  'foundation.access-review.list',
  'foundation.access-review.detail',
  'foundation.users.list',
  'foundation.users.form',
  'foundation.tenants.list',
  'foundation.delegations.list',
  'foundation.audit.timeline',
] as const);
export type FcFoundationComponentKey = (typeof FC_FOUNDATION_COMPONENT_KEYS)[number];

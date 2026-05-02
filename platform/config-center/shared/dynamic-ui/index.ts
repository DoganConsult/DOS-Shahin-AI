// ──────────────────────────────────────────────────────────────────────────
// Canonical Dynamic UI module — ONE folder, ONE source of truth.
// All Dynamic UI consumers (services, registries, host components, models)
// MUST import from `@app/shared/dynamic-ui` (or the relative path to this
// barrel). Legacy paths remain only as thin re-exports during migration.
// ──────────────────────────────────────────────────────────────────────────

export * from './services';
export * from './registry';
export * from './components';
export * from './models';

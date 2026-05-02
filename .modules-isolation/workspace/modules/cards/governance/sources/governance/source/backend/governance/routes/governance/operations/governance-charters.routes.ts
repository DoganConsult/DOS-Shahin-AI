// Re-export the canonical governance-charters router. `export * from` does
// not propagate the default export — loadModuleRoute then sees an object
// instead of a Router function and fails. Explicitly re-exporting `default`
// (and named members) makes both `default` and `* as` consumers work.
export * from '../governance-charters.routes';
export { default } from '../governance-charters.routes';

// Re-export the parent governance.routes barrel. `export *` does NOT
// propagate the default export, so loadModuleRoute receives an object
// instead of a Router function. Adding the explicit default re-export
// makes both named members and the default Router available.
export * from '../governance.routes';
export { default } from '../governance.routes';

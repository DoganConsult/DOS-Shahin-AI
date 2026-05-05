// ShellResolverService DELETED — was dead code calling phantom
// /api/shell/config, /api/config-center/gateway/shell-override endpoints
// that 404. Shell config is 100% DB-driven via WorkspaceShellBindingService.
export { ShellHostComponent } from './shell-host.component';
export { BreadcrumbService, type Breadcrumb } from './breadcrumb.service';

// ── Universal module page templates (import from here) ──
export * from './templates';
export {
  DosPageLayoutComponent,
  DosPageTabDirective,
  DosPageKpiDirective,
  DosPageRailDirective,
} from './dos-page-layout.component';
export {
  ModuleContentProvider,
  ContentProviderRegistry,
  MODULE_CONTENT_PROVIDERS,
  CONTENT_PROVIDER_REGISTRY,
} from './module-content-provider';

// ── Phase F-F3 — DB-driven template binding (FE consumer) ──
export {
  TemplateBindingService,
  type TemplateBinding,
  type TemplateBindingProps,
} from './template-binding.service';
export {
  ARCHETYPE_TEMPLATE_EXPORTS,
  loadArchetypeTemplate,
} from './template-binding.registry';
export { DynamicTemplatePageComponent } from './dynamic-template-page.component';

export { ShellResolverService } from './shell-resolver.service';
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

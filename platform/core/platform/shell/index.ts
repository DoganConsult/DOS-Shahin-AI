// ═══════════════════════════════════════════════════════════════════════
// HARD RE-EXPORT SHIM — modules/core/platform/shell
//
// Canonical source: platform/core/platform/shell
// Path alias @platform/shell resolves to platform/core/platform/shell
//
// This directory is a legacy mirror. All implementation lives in the
// canonical location. This index re-exports so any stale import path
// that resolves here still compiles.
//
// DO NOT add implementation here. Edit platform/core/platform/shell only.
// ═══════════════════════════════════════════════════════════════════════
export { ShellHostComponent } from '../../../../platform/core/platform/shell/shell-host.component';
export { BreadcrumbService, type Breadcrumb } from '../../../../platform/core/platform/shell/breadcrumb.service';
export * from '../../../../platform/core/platform/shell/templates';
export {
  DosPageLayoutComponent,
  DosPageTabDirective,
  DosPageKpiDirective,
  DosPageRailDirective,
} from '../../../../platform/core/platform/shell/dos-page-layout.component';
export {
  ModuleContentProvider,
  ContentProviderRegistry,
  MODULE_CONTENT_PROVIDERS,
  CONTENT_PROVIDER_REGISTRY,
} from '../../../../platform/core/platform/shell/module-content-provider';
export {
  TemplateBindingService,
  type TemplateBinding,
  type TemplateBindingProps,
} from '../../../../platform/core/platform/shell/template-binding.service';
export {
  ARCHETYPE_TEMPLATE_EXPORTS,
  loadArchetypeTemplate,
} from '../../../../platform/core/platform/shell/template-binding.registry';
export { DynamicTemplatePageComponent } from '../../../../platform/core/platform/shell/dynamic-template-page.component';

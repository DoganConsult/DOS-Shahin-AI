export type {
  WorkspacePattern,
  ModuleShellDefinition,
  ModuleKpiDefinition,
  ModuleTabDefinition,
  LifecycleStepDefinition,
  ModuleFilterDefinition,
  ModuleTableViewDefinition,
} from './module-shell-definition';

export {
  MODULE_SHELL_REGISTRY,
  getModuleShellDefinition,
  getAllModuleShellDefinitions,
} from './module-shell-registry';

export type {
  ShellLayoutType,
  ShellSlotId,
  ShellSlotConfig,
  ShellTabConfig,
  ShellPanelConfig,
  ShellWidgetZone,
  ShellActionBarConfig,
  ShellDetailDrawerConfig,
  ResolvedShellConfig,
  ShellConfigSource,
  ShellOverride,
  ShellResolverInput,
  ModuleContentProviderContract,
  ModuleWidgetRegistration,
  ModuleFormRegistration,
  ModuleViewRegistration,
  ModuleActionRegistration,
  ModuleDetailRegistration,
} from './shell-engine.contracts';

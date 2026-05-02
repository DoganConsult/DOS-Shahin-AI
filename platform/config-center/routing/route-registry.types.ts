export type LazyComponent = () => Promise<any>;

export interface ComponentRegistryEntry {
  loadComponent?: LazyComponent;
  loadChildren?: LazyComponent;
  redirectTo?: string;
  pathMatch?: 'full' | 'prefix';
  data?: Record<string, unknown>;
  requiredPermission?: string;
  moduleCode?: string;
  adminOnly?: boolean;
  agentId?: string;
  agentName?: string;
}

export interface ModuleRouteGroup {
  shell?: LazyComponent;
  defaultRedirect?: string;
  children: Record<string, ComponentRegistryEntry>;
}

export interface StandaloneRouteEntry extends ComponentRegistryEntry {
  requiredPermission?: string;
  moduleCode?: string;
  agentId?: string;
  agentName?: string;
  adminOnly?: boolean;
}


import type { ModuleRouteGroup, StandaloneRouteEntry } from '../route-registry.types';

export const GENERATED_MODULE_ROUTE_GROUPS: Record<string, ModuleRouteGroup> = {};
export const GENERATED_STANDALONE_ROUTES: Record<string, StandaloneRouteEntry> = {};

export const allModuleRouteGroups = GENERATED_MODULE_ROUTE_GROUPS;
export const allStandaloneRoutes = GENERATED_STANDALONE_ROUTES;

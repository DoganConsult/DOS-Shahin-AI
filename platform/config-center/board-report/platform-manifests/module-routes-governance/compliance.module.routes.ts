import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';
import { complianceRouteChildren, complianceStandaloneRoutes as complianceStandaloneRoutesFromModule } from '@compliance-module/ui/routes/compliance.module.routes';

export const complianceModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'overview',
  children: {
    '': { redirectTo: 'overview', pathMatch: 'full' },
    create: {
      loadComponent: () =>
        import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent),
      data: { moduleCode: 'compliance' },
    },
    ...complianceRouteChildren,
    lifecycle: {
      loadComponent: () =>
        import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent),
      data: { moduleCode: 'compliance' },
    },
  },
};

export const complianceStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  ...(complianceStandaloneRoutesFromModule as any),
};

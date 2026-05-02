import os

DIR = "frontend/products/shahin/src/app/blueprint/platform-manifests"

TEMPLATE = """import { Routes } from '@angular/router';
import { GenericModuleOverviewComponent } from '../../shared/components/generic-module-overview.component';
import { GenericModuleDetailComponent } from '../../shared/components/generic-module-detail.component';
import { ModuleRouteGroup } from '../../core/platform/navigation/navigation.types';
import { environment } from '../../../../../environments/environment';

export const ROUTES: Routes = [
  {
    path: '',
    data: {
      breadcrumb: '{ModuleTitle}'
    },
    children: [
      {
        path: '',
        component: GenericModuleOverviewComponent,
        data: {
          permission: '{moduleCode}.read',
          description: '{ModuleTitle} overview dashboard and records list.'
        }
      },
      {
        path: 'create',
        component: GenericModuleDetailComponent,
        data: {
          permission: '{moduleCode}.write',
          breadcrumb: 'New Record'
        }
      },
      {
        path: 'reports',
        component: GenericModuleOverviewComponent,
        data: {
          permission: '{moduleCode}.read',
          breadcrumb: 'Reports'
        }
      },
      {
        path: 'admin',
        component: GenericModuleOverviewComponent,
        data: {
          permission: '{moduleCode}.admin',
          breadcrumb: 'Administration'
        }
      },
      {
        path: ':id',
        component: GenericModuleDetailComponent,
        data: {
          permission: '{moduleCode}.read',
          breadcrumb: 'Record Details'
        }
      },
      {
        path: ':id/lifecycle',
        component: GenericModuleDetailComponent,
        data: {
          permission: '{moduleCode}.write',
          breadcrumb: 'Lifecycle Actions'
        }
      }
    ]
  }
];

export const {routeVarName} = new ModuleRouteGroup('{moduleCode}', ROUTES, {
  icon: 'pi pi-box',
  standaloneRoutes: [],
});
"""

def process_files():
    for root, _, files in os.walk(DIR):
        for file in files:
            if file.endswith('.routes.ts'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = content.split('\n')
                
                # Check if it's a stub
                if len(lines) < 25:
                    module_name = file.split('.')[0]
                    module_title = module_name.replace('-', ' ').title()
                    # camelCase routeVarName
                    parts = module_name.split('-')
                    route_var_name = parts[0] + ''.join(p.capitalize() for p in parts[1:]) + 'ModuleRoutes'
                    
                    new_content = TEMPLATE.replace('{moduleCode}', module_name)\
                                          .replace('{ModuleTitle}', module_title)\
                                          .replace('{routeVarName}', route_var_name)
                    
                    with open(path, 'w', encoding='utf-8') as fw:
                        fw.write(new_content)
                    print(f"Replaced {path}")

if __name__ == '__main__':
    process_files()

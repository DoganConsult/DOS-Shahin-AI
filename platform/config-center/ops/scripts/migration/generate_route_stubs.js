const fs = require('fs');
const path = require('path');

const DIR = "frontend/products/shahin/src/app/blueprint/platform-manifests";

const TEMPLATE = `import { Routes } from '@angular/router';
import { GenericModuleOverviewComponent } from '../../shared/components/generic-module-overview.component';
import { GenericModuleDetailComponent } from '../../shared/components/generic-module-detail.component';
import { ModuleRouteGroup } from '../../core/platform/navigation/navigation.types';

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
`;

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir(DIR, function(filePath) {
    if (filePath.endsWith('.routes.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        if (lines.length < 25) {
            const fileName = path.basename(filePath);
            const moduleName = fileName.split('.')[0];
            const moduleTitle = moduleName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            const parts = moduleName.split('-');
            const routeVarName = parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'ModuleRoutes';
            
            const newContent = TEMPLATE.replace(/\{moduleCode\}/g, moduleName)
                                       .replace(/\{ModuleTitle\}/g, moduleTitle)
                                       .replace(/\{routeVarName\}/g, routeVarName);
            
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log("Replaced", filePath);
        }
    }
});

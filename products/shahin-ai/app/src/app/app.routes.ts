import { Routes } from '@angular/router';
import { workspaceShellGuard } from './shell/workspace-shell.guard';
import { provideRouteIcons } from './shell/icon-registration';
import { MARKETING_PUBLIC_ROUTES } from './pages/marketing-public/marketing-public.routes';

const dynamicPageRoute = () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent);

const authBridgeRoute = () => import('./pages/auth-pages/auth-bridge.component').then(m => m.AuthBridgeComponent);
const authPageHostRoute = () => import('./pages/auth-pages/auth-page.host').then(m => m.AuthPageHostComponent);

export const routes: Routes = [
  {
    path: '',
    loadComponent: dynamicPageRoute,
    pathMatch: 'full',
    providers: [provideRouteIcons()],
    data: { contractRoute: '/', componentKey: 'marketing.home.page' },
  },
  ...MARKETING_PUBLIC_ROUTES.map(r => ({ ...r, providers: [provideRouteIcons()] })),
  {
    path: 'platform-admin',
    loadChildren: () =>
      import('./pages/platform-admin/platform-admin.routes').then(m => m.PLATFORM_ADMIN_ROUTES),
  },
  {
    path: 'login',
    loadComponent: authBridgeRoute,
    data: { authMode: 'login', contractRoute: '/login', componentKey: 'auth.login.bridge' },
  },
  {
    path: 'register',
    loadComponent: authBridgeRoute,
    data: { authMode: 'register', contractRoute: '/register', componentKey: 'auth.register.bridge' },
  },
  {
    path: 'forgot-password',
    loadComponent: authPageHostRoute,
    data: { authPage: 'forgot-password', contractRoute: '/forgot-password', componentKey: 'auth.forgot-password.page' },
  },
  {
    path: 'mfa',
    loadComponent: authPageHostRoute,
    data: { authPage: 'mfa', contractRoute: '/mfa', componentKey: 'auth.mfa.page' },
  },
  {
    path: 'reset-password',
    loadComponent: authPageHostRoute,
    data: { authPage: 'reset-password', contractRoute: '/reset-password', componentKey: 'auth.reset-password.page' },
  },
  {
    path: '',
    loadComponent: () =>
      import('@app/core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
    providers: [provideRouteIcons()],
    canActivate: [workspaceShellGuard],
    children: [
      {
        path: '**',
        loadComponent: dynamicPageRoute,
      },
    ],
  },
];

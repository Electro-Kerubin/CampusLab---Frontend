import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { MsalGuard } from '@azure/msal-angular';
import { AuthService } from './services/auth.service';

/**
 * Landing dinámica: AUDITOR aterriza en /audit, el resto en /dashboard.
 *
 * OJO: una ruta SIEMPRE necesita uno de component/loadComponent/redirectTo/
 * children/loadChildren — un canActivate solo, aunque siempre redirija, no
 * pasa la validación estática del Router (NG04014: "Invalid configuration
 * of route ''"). Por eso esto usa la forma funcional de `redirectTo`
 * (soportada desde Angular 15.1), no un guard.
 */
function landingRedirect(): string {
  const auth = inject(AuthService);
  const roles = auth.currentUser()?.roles ?? [];
  const isAuditorOnly = roles.length > 0 && roles.every((r) => r === 'AUDITOR');
  return isAuditorOnly ? '/audit' : '/dashboard';
}

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./components/layout.component').then((m) => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: landingRedirect,
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard-page.component').then(
            (m) => m.DashboardPageComponent
          ),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./pages/bookings-page.component').then(
            (m) => m.BookingsPageComponent
          ),
      },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./pages/catalog-page.component').then(
            (m) => m.CatalogPageComponent
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/reports-page.component').then(
            (m) => m.ReportsPageComponent
          ),
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./pages/audit-page.component').then(
            (m) => m.AuditPageComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

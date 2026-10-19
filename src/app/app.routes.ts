import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard, landingRedirect } from './guards/landing';

/**
 * Qué pasa al abrir la aplicación:
 *
 *   /            sin sesión -> /login          con sesión -> /dashboard (un AUDITOR -> /audit)
 *   /login       sin sesión -> muestra el login   con sesión -> su pantalla de inicio (guestGuard)
 *   /cualquier   sin sesión -> /login          con sesión -> se queda ahí (rutas internas) o va a "/"
 *
 * La lógica de aterrizaje vive en guards/landing.ts.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
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

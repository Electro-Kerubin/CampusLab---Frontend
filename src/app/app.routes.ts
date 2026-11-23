import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard, landingRedirect } from './guards/landing';

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

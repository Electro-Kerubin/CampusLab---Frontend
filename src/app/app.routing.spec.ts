//PARA TESTING
import { ApplicationInitStatus, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, RouterOutlet } from '@angular/router';
import { MSAL_INSTANCE } from '@azure/msal-angular';
import { AccountInfo, AuthenticationResult, PublicClientApplication } from '@azure/msal-browser';

import { AppComponent } from './app.component';
import { appConfig } from './app.config';
import { LayoutComponent } from './components/layout.component';
import { AuditPageComponent } from './pages/audit-page.component';
import { BookingsPageComponent } from './pages/bookings-page.component';
import { CatalogPageComponent } from './pages/catalog-page.component';
import { DashboardPageComponent } from './pages/dashboard-page.component';
import { LoginPageComponent } from './pages/login-page.component';
import { ReportsPageComponent } from './pages/reports-page.component';

class SimulatedMsal extends PublicClientApplication {
  private ready = false;

  constructor(private readonly account: AccountInfo | null, private readonly redirectResult: AuthenticationResult | null) {
    super({
      auth: { clientId: '00000000-0000-0000-0000-000000000000', authority: 'https://login.microsoftonline.com/common' },
      cache: { cacheLocation: 'memory' },
    });
  }

  private requireInitialized(): void {
    if (!this.ready) {
      throw new Error('BrowserAuthError: uninitialized_public_client_application');
    }
  }

  override async initialize(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 60));
    this.ready = true;
  }
  override getAllAccounts(): AccountInfo[] {
    this.requireInitialized();
    return this.account ? [this.account] : [];
  }
  override getActiveAccount(): AccountInfo | null {
    this.requireInitialized();
    return this.account;
  }
  override setActiveAccount(): void {
  }
  override async handleRedirectPromise(): Promise<AuthenticationResult | null> {
    this.requireInitialized();
    return this.redirectResult;
  }
  override async logoutRedirect(): Promise<void> {
  }
}

function accountWithRoles(roles: string[]): AccountInfo {
  return {
    homeAccountId: 'home',
    environment: 'login.microsoftonline.com',
    tenantId: 'tenant',
    username: 'rod.baeza@duocuc.cl',
    localAccountId: 'local',
    name: 'Rodrigo Baeza',
    idTokenClaims: { roles },
  } as AccountInfo;
}

const SCREENS: Type<unknown>[] = [
  LayoutComponent,
  LoginPageComponent,
  DashboardPageComponent,
  BookingsPageComponent,
  CatalogPageComponent,
  ReportsPageComponent,
  AuditPageComponent,
];

async function open(
  path: string,
  account: AccountInfo | null,
  redirectResult: AuthenticationResult | null = null
): Promise<string> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      ...appConfig.providers,
      provideHttpClientTesting(),
      { provide: MSAL_INSTANCE, useFactory: () => new SimulatedMsal(account, redirectResult) },
    ],
  });
  for (const screen of SCREENS) {
    TestBed.overrideComponent(screen, { set: { template: '<router-outlet />', imports: [RouterOutlet] } });
  }

  await TestBed.inject(ApplicationInitStatus).donePromise;
  const root = TestBed.createComponent(AppComponent);
  root.detectChanges();

  const router = TestBed.inject(Router);
  await router.navigateByUrl(path);
  await new Promise((resolve) => setTimeout(resolve, 400));
  return router.url;
}

describe('Al abrir la aplicación', () => {
  describe('sin sesión', () => {
    it('"/" lleva al login', async () => {
      expect(await open('/', null)).toBe('/login');
    });

    it('una página interna lleva al login', async () => {
      expect(await open('/audit', null)).toBe('/login');
      expect(await open('/dashboard', null)).toBe('/login');
    });

    it('una ruta que no existe lleva al login', async () => {
      expect(await open('/ruta-que-no-existe', null)).toBe('/login');
    });

    it('"/login" muestra el login', async () => {
      expect(await open('/login', null)).toBe('/login');
    });
  });

  describe('con sesión de ADMIN', () => {
    const admin = () => accountWithRoles(['ADMIN']);

    it('"/" lleva al dashboard', async () => {
      expect(await open('/', admin())).toBe('/dashboard');
    });

    it('"/login" ya no se muestra: lleva al dashboard', async () => {
      expect(await open('/login', admin())).toBe('/dashboard');
    });

    it('recargar una página interna NO cambia de página (antes volvía siempre al dashboard)', async () => {
      expect(await open('/audit', admin())).toBe('/audit');
      expect(await open('/bookings', admin())).toBe('/bookings');
    });

    it('una ruta que no existe lleva al dashboard', async () => {
      expect(await open('/ruta-que-no-existe', admin())).toBe('/dashboard');
    });
  });

  describe('con sesión de AUDITOR', () => {
    it('"/" y "/login" llevan a Auditoría, su pantalla de inicio', async () => {
      expect(await open('/', accountWithRoles(['AUDITOR']))).toBe('/audit');
      expect(await open('/login', accountWithRoles(['AUDITOR']))).toBe('/audit');
    });

    it('con otro rol además de AUDITOR el inicio es el dashboard', async () => {
      expect(await open('/', accountWithRoles(['AUDITOR', 'ADMIN']))).toBe('/dashboard');
    });
  });

  describe('con sesión pero sin un rol válido', () => {
    it('no entra a la aplicación y el login no rebota en bucle', async () => {
      expect(await open('/', accountWithRoles(['INVITADO']))).toBe('/login');
      expect(await open('/login', accountWithRoles(['INVITADO']))).toBe('/login');
    });
  });

  describe('al volver del login de Microsoft', () => {
    const result = (account: AccountInfo) => ({ account } as AuthenticationResult);

    it('un técnico termina en el dashboard', async () => {
      const account = accountWithRoles(['TECNICO']);
      expect(await open('/login', account, result(account))).toBe('/dashboard');
    });

    it('un auditor termina en Auditoría', async () => {
      const account = accountWithRoles(['AUDITOR']);
      expect(await open('/login', account, result(account))).toBe('/audit');
    });
  });
});

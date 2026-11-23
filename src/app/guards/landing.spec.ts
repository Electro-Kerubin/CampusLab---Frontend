//PARA TESTING
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { AccountInfo } from '@azure/msal-browser';
import { Observable, firstValueFrom } from 'rxjs';
import { AppUser, Role } from '../models';
import { AuthService } from '../services/auth.service';
import { guestGuard, landingPath, landingRedirect } from './landing';
import { accountWithRoles, createMsalMock, provideMsalMock } from '../../testing/msal-testing';

const authWithRoles = (roles: Role[], isAuthenticated = true) =>
  ({
    isAuthenticated: () => isAuthenticated,
    currentUser: () => ({ roles }) as Partial<AppUser>,
  }) as unknown as AuthService;

describe('landingPath (pantalla de inicio según el rol)', () => {
  it('un AUDITOR (solo ese rol) aterriza en /audit', () => {
    expect(landingPath(authWithRoles(['AUDITOR']))).toBe('/audit');
  });

  it('AUDITOR con otro rol aterriza en /dashboard', () => {
    expect(landingPath(authWithRoles(['AUDITOR', 'TECNICO']))).toBe('/dashboard');
  });

  it('cualquier otro rol, o sin roles, aterriza en /dashboard', () => {
    expect(landingPath(authWithRoles(['ESTUDIANTE']))).toBe('/dashboard');
    expect(landingPath(authWithRoles([]))).toBe('/dashboard');
  });

  it('landingRedirect usa el AuthService inyectado', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authWithRoles(['AUDITOR']) }],
    });
    expect(TestBed.runInInjectionContext(() => landingRedirect())).toBe('/audit');
  });
});

describe('guestGuard (ruta /login)', () => {
  function run(auth: AuthService, accounts: AccountInfo[]): Promise<boolean | UrlTree> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        ...provideMsalMock(createMsalMock(accounts)),
      ],
    });
    return firstValueFrom(
      TestBed.runInInjectionContext(
        () =>
          guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Observable<boolean | UrlTree>
      )
    );
  }

  const asUrl = (r: boolean | UrlTree) => TestBed.inject(Router).serializeUrl(r as UrlTree);

  it('sin sesión muestra el login', async () => {
    expect(await run(authWithRoles([], false), [])).toBeTrue();
  });

  it('con sesión válida de ADMIN no muestra el login: va al dashboard', async () => {
    expect(asUrl(await run(authWithRoles(['ADMIN']), [accountWithRoles(['ADMIN'])]))).toBe('/dashboard');
  });

  it('con sesión válida de AUDITOR va a Auditoría', async () => {
    expect(asUrl(await run(authWithRoles(['AUDITOR']), [accountWithRoles(['AUDITOR'])]))).toBe('/audit');
  });

  it('con sesión pero sin un rol válido muestra el login (evita el bucle /login ↔ /dashboard)', async () => {
    expect(await run(authWithRoles([]), [accountWithRoles(['INVITADO'])])).toBeTrue();
  });
});

//PARA TESTING
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { AccountInfo, InteractionStatus } from '@azure/msal-browser';
import { Observable, firstValueFrom } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import {
  MsalMock,
  accountWithRoles,
  createMsalMock,
  fakeAccount,
  provideMsalMock,
} from '../../testing/msal-testing';

describe('authGuard', () => {
  let msal: MsalMock;

  function setup(isAuthenticated: boolean, accounts: AccountInfo[], active?: AccountInfo | null) {
    msal = createMsalMock(accounts, active === undefined ? accounts[0] ?? null : active);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => isAuthenticated } },
        ...provideMsalMock(msal),
      ],
    });
  }

  function runGuard(): Observable<boolean | UrlTree> {
    return TestBed.runInInjectionContext(
      () =>
        authGuard({} as ActivatedRouteSnapshot, { url: '/bookings' } as RouterStateSnapshot) as Observable<
          boolean | UrlTree
        >
    );
  }

  const asUrl = (r: boolean | UrlTree) => TestBed.inject(Router).serializeUrl(r as UrlTree);

  it('permite el acceso con sesión y un rol válido', async () => {
    setup(true, [accountWithRoles(['ADMIN'])]);
    expect(await firstValueFrom(runGuard())).toBeTrue();
  });

  it('acepta roles que vienen en appRoles', async () => {
    setup(true, [fakeAccount({ appRoles: ['ESTUDIANTE'] })]);
    expect(await firstValueFrom(runGuard())).toBeTrue();
  });

  it('redirige a /login si no hay sesión', async () => {
    setup(false, []);
    expect(asUrl(await firstValueFrom(runGuard()))).toBe('/login');
  });

  it('redirige a /login si AuthService dice que hay sesión pero MSAL no tiene cuentas', async () => {
    setup(true, []);
    expect(asUrl(await firstValueFrom(runGuard()))).toBe('/login');
  });

  it('redirige a /login si hay cuentas pero ninguna activa', async () => {
    setup(true, [accountWithRoles(['ADMIN'])], null);
    expect(asUrl(await firstValueFrom(runGuard()))).toBe('/login');
  });

  it('con un rol que la plataforma no reconoce: limpia el almacenamiento, cierra sesión y va a /login', async () => {
    localStorage.setItem('otra-clave', 'x');
    sessionStorage.setItem('otra-clave', 'x');
    setup(true, [accountWithRoles(['INVITADO'])]);

    const result = await firstValueFrom(runGuard());

    expect(asUrl(result)).toBe('/login');
    expect(msal.spies.logoutRedirect).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('espera a que MSAL termine de interactuar antes de decidir', () => {
    setup(true, [accountWithRoles(['ADMIN'])]);
    msal.inProgress$.next(InteractionStatus.HandleRedirect);

    const results: (boolean | UrlTree)[] = [];
    runGuard().subscribe((r) => results.push(r));
    expect(results).toEqual([]);

    msal.inProgress$.next(InteractionStatus.None);
    expect(results).toEqual([true]);
  });
});

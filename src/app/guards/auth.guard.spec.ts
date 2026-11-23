import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { firstValueFrom, of } from 'rxjs';

describe('authGuard', () => {
  const run = async (isAuth: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => isAuth } },
        { provide: MsalBroadcastService, useValue: { inProgress$: of(InteractionStatus.None) } },
        {
          provide: MsalService,
          useValue: {
            instance: {
              getAllAccounts: () => isAuth
                ? [{ username: 'carmen@campus.cl', idTokenClaims: { roles: ['ADMIN'] } }]
                : [],
              getActiveAccount: () => isAuth
                ? { username: 'carmen@campus.cl', idTokenClaims: { roles: ['ADMIN'] } }
                : null,
              logoutRedirect: () => of(null),
            },
          },
        },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/bookings' } as any)
    );
    return await firstValueFrom(result as any);
  };

  it('permite el acceso si hay sesión', async () => {
    expect(await run(true)).toBeTrue();
  });

  it('redirige a /login si no hay sesión', async () => {
    const res = await run(false);
    const router = TestBed.inject(Router);
    expect(res).not.toBeTrue();
    expect(router.serializeUrl(res as UrlTree)).toContain('/login');
  });
});

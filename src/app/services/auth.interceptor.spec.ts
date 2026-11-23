import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { AuthInterceptor } from './auth.interceptor';
import {
  MsalMock,
  accountWithRoles,
  createMsalMock,
  fakeJwt,
  provideMsalMock,
} from '../../testing/msal-testing';

/**
 * AuthInterceptor: el README exige "Authorization: Bearer <token>" en cada request al API Gateway.
 * Se registra igual que en app.config.ts (HTTP_INTERCEPTORS + withInterceptorsFromDi) y se usa
 * HttpTestingController: ninguna petición sale a la red ni a Azure.
 */
describe('AuthInterceptor', () => {
  const URL = 'http://localhost:8080/api/bookings';
  const nowSec = () => Math.floor(Date.now() / 1000);
  const validToken = () => fakeJwt({ exp: nowSec() + 3600 }); // vence en 1 h
  const expiringToken = () => fakeJwt({ exp: nowSec() + 60 }); // vence en 1 min (< margen de 2 min)

  let msal: MsalMock;
  let http: HttpClient;
  let backend: HttpTestingController;
  let router: Router;

  function setup(accounts: AccountInfo[], active: AccountInfo | null = accounts[0] ?? null) {
    msal = createMsalMock(accounts, active);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        ...provideMsalMock(msal),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  }

  afterEach(() => backend.verify());

  it('sin sesión deja pasar la petición sin Authorization', () => {
    setup([]);
    http.get(URL).subscribe();
    const req = backend.expectOne(URL);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('con cuentas pero sin cuenta activa tampoco agrega el token', () => {
    setup([accountWithRoles(['ADMIN'])], null);
    http.get(URL).subscribe();
    const req = backend.expectOne(URL);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('agrega "Bearer <id_token>" con el token en caché si aún le queda vida', fakeAsync(() => {
    const token = validToken();
    setup([accountWithRoles(['ADMIN'], { idToken: token })]);

    http.get(URL).subscribe();
    flushMicrotasks();

    const req = backend.expectOne(URL);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(msal.spies.acquireTokenSilent).not.toHaveBeenCalled();
    req.flush([]);
  }));

  it('si el token está por vencer lo refresca en silencio y envía el nuevo', fakeAsync(() => {
    const account = accountWithRoles(['ADMIN'], { idToken: expiringToken() });
    setup([account]);
    const fresh = validToken();
    msal.spies.acquireTokenSilent.and.resolveTo({ idToken: fresh } as AuthenticationResult);

    http.get(URL).subscribe();
    flushMicrotasks();

    const req = backend.expectOne(URL);
    expect(msal.spies.acquireTokenSilent).toHaveBeenCalledOnceWith({ scopes: ['openid', 'profile'], account });
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${fresh}`);
    expect(account.idToken).toBe(fresh); // queda cacheado para la siguiente petición
    req.flush([]);
  }));

  it('si el refresco silencioso falla, envía el token que tenía', fakeAsync(() => {
    const old = expiringToken();
    setup([accountWithRoles(['ADMIN'], { idToken: old })]);
    msal.spies.acquireTokenSilent.and.rejectWith(new Error('interaction_required'));

    http.get(URL).subscribe();
    flushMicrotasks();

    const req = backend.expectOne(URL);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${old}`);
    req.flush([]);
  }));

  it('un token ilegible se trata como vencido y se intenta refrescar', fakeAsync(() => {
    setup([accountWithRoles(['ADMIN'], { idToken: 'no-es-un-jwt' })]);
    msal.spies.acquireTokenSilent.and.resolveTo({ idToken: 'nuevo' } as AuthenticationResult);

    http.get(URL).subscribe();
    flushMicrotasks();

    const req = backend.expectOne(URL);
    expect(req.request.headers.get('Authorization')).toBe('Bearer nuevo');
    req.flush([]);
  }));

  it('sin token en caché ni refresco posible, no agrega Authorization', fakeAsync(() => {
    setup([accountWithRoles(['ADMIN'])]); // cuenta sin idToken
    msal.spies.acquireTokenSilent.and.resolveTo(null as unknown as AuthenticationResult);

    http.get(URL).subscribe();
    flushMicrotasks();

    const req = backend.expectOne(URL);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  }));

  describe('errores del backend', () => {
    function request(status: number): unknown {
      setup([accountWithRoles(['ADMIN'], { idToken: validToken() })]);
      let error: unknown;
      http.get(URL).subscribe({ error: (e) => (error = e) });
      flushMicrotasks();
      backend.expectOne(URL).flush({}, { status, statusText: 'x' });
      return error;
    }

    it('401: cierra la sesión en Microsoft, va a /login y propaga el error', fakeAsync(() => {
      const error = request(401) as { status: number };
      expect(msal.spies.logoutRedirect).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      expect(error.status).toBe(401);
    }));

    it('403: no cierra sesión, vuelve al dashboard y propaga el error', fakeAsync(() => {
      const error = request(403) as { status: number };
      expect(msal.spies.logoutRedirect).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
      expect(error.status).toBe(403);
    }));

    it('500: solo propaga el error, sin navegar ni cerrar sesión', fakeAsync(() => {
      const error = request(500) as { status: number };
      expect(router.navigate).not.toHaveBeenCalled();
      expect(msal.spies.logoutRedirect).not.toHaveBeenCalled();
      expect(error.status).toBe(500);
    }));
  });
});

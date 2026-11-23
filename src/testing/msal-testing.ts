import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { AccountInfo, AuthenticationResult, InteractionStatus } from '@azure/msal-browser';
import { BehaviorSubject, of } from 'rxjs';

/**
 * Dobles de prueba de MSAL. Ninguna prueba habla con Azure AD: se simula solo
 * QUÉ cuentas tiene MSAL en caché y se espía lo que la app le pide (login, logout, token).
 */

/** Cuenta de Azure AD con los claims indicados (por defecto, el claim "roles"). */
export function fakeAccount(
  claims: Record<string, unknown> = {},
  overrides: Partial<AccountInfo> = {}
): AccountInfo {
  return {
    homeAccountId: 'home-id',
    environment: 'login.microsoftonline.com',
    tenantId: 'tenant-id',
    username: 'carmen.vidal@duocuc.cl',
    localAccountId: 'local-id',
    name: 'Carmen Vidal',
    idTokenClaims: claims,
    ...overrides,
  } as AccountInfo;
}

export const accountWithRoles = (roles: string[], overrides: Partial<AccountInfo> = {}) =>
  fakeAccount({ roles }, overrides);

/** JWT sin firma, solo para pruebas: header.payload.firma con el payload en base64url. */
export function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(payload)}.firma`;
}

export interface MsalMock {
  service: MsalService;
  broadcast: MsalBroadcastService;
  /** Emite estados de interacción de MSAL (Startup, Login, None...). */
  inProgress$: BehaviorSubject<InteractionStatus>;
  /** Cambia las cuentas que MSAL "tiene en caché". */
  setAccounts(accounts: AccountInfo[], active?: AccountInfo | null): void;
  spies: {
    loginRedirect: jasmine.Spy;
    logoutRedirect: jasmine.Spy;
    setActiveAccount: jasmine.Spy;
    acquireTokenSilent: jasmine.Spy;
  };
}

/**
 * MsalService + MsalBroadcastService simulados.
 * `active` por defecto es la primera cuenta; pasar `null` simula "hay cuentas pero ninguna activa".
 */
export function createMsalMock(
  accounts: AccountInfo[] = [],
  active: AccountInfo | null = accounts[0] ?? null,
  initialStatus: InteractionStatus = InteractionStatus.None
): MsalMock {
  let all = accounts;
  let current = active;

  const spies = {
    loginRedirect: jasmine.createSpy('loginRedirect').and.returnValue(of(undefined)),
    logoutRedirect: jasmine.createSpy('logoutRedirect').and.returnValue(of(undefined)),
    setActiveAccount: jasmine
      .createSpy('setActiveAccount')
      .and.callFake((acc: AccountInfo | null) => (current = acc)),
    acquireTokenSilent: jasmine
      .createSpy('acquireTokenSilent')
      .and.returnValue(Promise.resolve({ idToken: '' } as AuthenticationResult)),
  };

  const service = {
    instance: {
      getAllAccounts: () => all,
      getActiveAccount: () => current,
      setActiveAccount: spies.setActiveAccount,
      acquireTokenSilent: spies.acquireTokenSilent,
    },
    loginRedirect: spies.loginRedirect,
    logoutRedirect: spies.logoutRedirect,
  } as unknown as MsalService;

  const inProgress$ = new BehaviorSubject<InteractionStatus>(initialStatus);
  const broadcast = { inProgress$: inProgress$.asObservable() } as unknown as MsalBroadcastService;

  return {
    service,
    broadcast,
    inProgress$,
    setAccounts(next, nextActive = next[0] ?? null) {
      all = next;
      current = nextActive;
    },
    spies,
  };
}

/** Providers listos para TestBed con el mock de MSAL. */
export function provideMsalMock(mock: MsalMock) {
  return [
    { provide: MsalService, useValue: mock.service },
    { provide: MsalBroadcastService, useValue: mock.broadcast },
  ];
}

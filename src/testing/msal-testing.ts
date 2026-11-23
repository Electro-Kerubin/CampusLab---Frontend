//PARA TESTING
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { AccountInfo, AuthenticationResult, InteractionStatus } from '@azure/msal-browser';
import { BehaviorSubject, of } from 'rxjs';

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

export function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(payload)}.firma`;
}

export interface MsalMock {
  service: MsalService;
  broadcast: MsalBroadcastService;
  inProgress$: BehaviorSubject<InteractionStatus>;
  setAccounts(accounts: AccountInfo[], active?: AccountInfo | null): void;
  spies: {
    loginRedirect: jasmine.Spy;
    logoutRedirect: jasmine.Spy;
    setActiveAccount: jasmine.Spy;
    acquireTokenSilent: jasmine.Spy;
  };
}

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

export function provideMsalMock(mock: MsalMock) {
  return [
    { provide: MsalService, useValue: mock.service },
    { provide: MsalBroadcastService, useValue: mock.broadcast },
  ];
}

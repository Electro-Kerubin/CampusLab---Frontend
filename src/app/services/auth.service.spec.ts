//PARA TESTING
import { TestBed } from '@angular/core/testing';
import { InteractionStatus } from '@azure/msal-browser';
import { AuthService } from './auth.service';
import {
  MsalMock,
  accountWithRoles,
  createMsalMock,
  fakeAccount,
  provideMsalMock,
} from '../../testing/msal-testing';

describe('AuthService', () => {
  let msal: MsalMock;

  function create(mock: MsalMock): AuthService {
    msal = mock;
    TestBed.configureTestingModule({ providers: provideMsalMock(mock) });
    return TestBed.inject(AuthService);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  describe('sin sesión', () => {
    it('no hay usuario ni sesión y no se fuerza logout', () => {
      const auth = create(createMsalMock([]));

      expect(auth.currentUser()).toBeNull();
      expect(auth.isAuthenticated()).toBeFalse();
      expect(msal.spies.logoutRedirect).not.toHaveBeenCalled();
    });

    it('si MSAL aún no está inicializado no rompe la app y lee la sesión cuando MSAL termina', () => {
      spyOn(console, 'warn');
      const mock = createMsalMock([], null, InteractionStatus.Startup);
      const instance = mock.service.instance as unknown as { getAllAccounts: () => unknown[] };
      const realGetAll = instance.getAllAccounts;
      instance.getAllAccounts = () => {
        throw new Error('uninitialized_public_client_application');
      };

      let auth!: AuthService;
      expect(() => (auth = create(mock))).not.toThrow();
      expect(auth.currentUser()).toBeNull();

      instance.getAllAccounts = realGetAll;
      mock.setAccounts([accountWithRoles(['ADMIN'])]);
      mock.inProgress$.next(InteractionStatus.None);
      expect(auth.currentUser()?.roles).toEqual(['ADMIN']);
    });
  });

  describe('con una cuenta de Azure AD', () => {
    it('arma el usuario desde la cuenta: nombre, correo, iniciales y rol legible', () => {
      const auth = create(createMsalMock([accountWithRoles(['ADMIN'])]));

      expect(auth.currentUser()).toEqual({
        name: 'Carmen Vidal',
        email: 'carmen.vidal@duocuc.cl',
        avatar: 'CV',
        role: 'Administrador',
        roles: ['ADMIN'],
      });
      expect(auth.isAuthenticated()).toBeTrue();
    });

    it('normaliza los roles a mayúsculas y combina las etiquetas de varios roles', () => {
      const auth = create(createMsalMock([accountWithRoles(['tecnico', 'Auditor'])]));

      expect(auth.currentUser()?.roles).toEqual(['TECNICO', 'AUDITOR']);
      expect(auth.currentUser()?.role).toBe('Técnico / Auditor');
    });

    it('lee los roles desde appRoles si no viene el claim roles', () => {
      const auth = create(createMsalMock([fakeAccount({ appRoles: ['ESTUDIANTE'] })]));
      expect(auth.currentUser()?.roles).toEqual(['ESTUDIANTE']);
    });

    it('lee los roles desde wids si no vienen roles ni appRoles', () => {
      const auth = create(createMsalMock([fakeAccount({ wids: ['AUDITOR'] })]));
      expect(auth.currentUser()?.roles).toEqual(['AUDITOR']);
    });

    it('como último recurso lee los roles del id_token guardado por MSAL en localStorage', () => {
      const payload = btoa(JSON.stringify({ roles: ['TECNICO'] }));
      localStorage.setItem('MSAL.cuenta.id_token', `cabecera.${payload}.firma`);

      const auth = create(createMsalMock([fakeAccount({})]));

      expect(auth.currentUser()?.roles).toEqual(['TECNICO']);
      expect(msal.spies.logoutRedirect).not.toHaveBeenCalled();
    });

    it('usa el correo como nombre si la cuenta no trae nombre', () => {
      const auth = create(
        createMsalMock([accountWithRoles(['ADMIN'], { name: undefined, username: 'ana@duocuc.cl' })])
      );
      expect(auth.currentUser()?.name).toBe('ana@duocuc.cl');
      expect(auth.currentUser()?.avatar).toBe('A');
    });

    it('si hay cuentas pero ninguna activa, activa la primera', () => {
      const account = accountWithRoles(['ADMIN']);
      const auth = create(createMsalMock([account], null));

      expect(msal.spies.setActiveAccount).toHaveBeenCalledWith(account);
      expect(auth.currentUser()?.email).toBe(account.username);
    });

    it('una cuenta SIN roles en ninguna parte cierra la sesión (logout forzado)', () => {
      const auth = create(createMsalMock([fakeAccount({})]));

      expect(auth.currentUser()).toBeNull();
      expect(auth.isAuthenticated()).toBeFalse();
      expect(msal.spies.logoutRedirect).toHaveBeenCalled();
    });
  });

  it('se actualiza cuando MSAL termina un login (inProgress$ vuelve a None)', () => {
    const auth = create(createMsalMock([], null, InteractionStatus.Startup));
    expect(auth.currentUser()).toBeNull();

    msal.setAccounts([accountWithRoles(['TECNICO'])]);
    msal.inProgress$.next(InteractionStatus.HandleRedirect);
    expect(auth.currentUser()).toBeNull();

    msal.inProgress$.next(InteractionStatus.None);
    expect(auth.currentUser()?.roles).toEqual(['TECNICO']);
  });

  describe('hasAnyRole / hasRole', () => {
    it('reflejan los roles del usuario', () => {
      const auth = create(createMsalMock([accountWithRoles(['TECNICO'])]));

      expect(auth.hasRole('TECNICO')).toBeTrue();
      expect(auth.hasRole('ADMIN')).toBeFalse();
      expect(auth.hasAnyRole('ADMIN', 'TECNICO')).toBeTrue();
      expect(auth.hasAnyRole('ADMIN', 'AUDITOR')).toBeFalse();
    });

    it('sin usuario siempre es false', () => {
      const auth = create(createMsalMock([]));
      expect(auth.hasAnyRole('ADMIN', 'TECNICO', 'ESTUDIANTE', 'AUDITOR')).toBeFalse();
    });
  });

  it('loginWithMicrosoft() inicia el login por redirect pidiendo User.Read', async () => {
    const auth = create(createMsalMock([]));
    await auth.loginWithMicrosoft();
    expect(msal.spies.loginRedirect).toHaveBeenCalledOnceWith({ scopes: ['User.Read'] });
  });

  it('logout() cierra la sesión en Microsoft', async () => {
    const auth = create(createMsalMock([accountWithRoles(['ADMIN'])]));
    await auth.logout();
    expect(msal.spies.logoutRedirect).toHaveBeenCalledTimes(1);
  });
});

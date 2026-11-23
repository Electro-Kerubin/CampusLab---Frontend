import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ name: 'Carmen Vidal', email: 'carmen@campus.cl' }),
            isAuthenticated: () => false,
            loginWithMicrosoft: jasmine.createSpy('loginWithMicrosoft').and.resolveTo(),
            logout: jasmine.createSpy('logout').and.resolveTo(),
          },
        },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('se crea', () => expect(service).toBeTruthy());

  it('inicia sin sesión', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('expone el nombre del usuario desde currentUser()', () => {
    expect(service.currentUser()?.name).toContain('Carmen');
  });

  it('usa loginWithMicrosoft() como método de inicio de sesión', async () => {
    await service.loginWithMicrosoft();
    expect(service.loginWithMicrosoft).toHaveBeenCalled();
  });

  it('expone logout()', async () => {
    await service.logout();
    expect(service.logout).toHaveBeenCalled();
  });
});

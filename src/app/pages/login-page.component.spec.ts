//PARA TESTING
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginPageComponent } from './login-page.component';
import { AuthService } from '../services/auth.service';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let loginWithMicrosoft: jasmine.Spy;
  const root = () => fixture.nativeElement as HTMLElement;
  const loginButton = () => root().querySelector('button')!;

  beforeEach(() => {
    loginWithMicrosoft = jasmine.createSpy('loginWithMicrosoft').and.resolveTo();
    TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { loginWithMicrosoft } }],
    });
    fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
  });

  it('muestra solo el botón de Microsoft (sin botones de rol)', () => {
    const text = root().textContent ?? '';
    expect(text).toContain('Iniciar sesión con Microsoft');
    ['Técnico', 'Estudiante', 'Auditor'].forEach((r) =>
      expect(text).withContext(r).not.toMatch(new RegExp(`Entrar como ${r}`, 'i'))
    );
    expect(root().querySelectorAll('button').length).toBe(1);
  });

  it('al hacer clic llama a AuthService.loginWithMicrosoft()', () => {
    loginButton().click();
    expect(loginWithMicrosoft).toHaveBeenCalledTimes(1);
  });

  it('mientras conecta deshabilita el botón y muestra "Conectando…"', async () => {
    let finish!: () => void;
    loginWithMicrosoft.and.returnValue(new Promise<void>((r) => (finish = r)));

    loginButton().click();
    fixture.detectChanges();
    expect(loginButton().disabled).toBeTrue();
    expect(root().textContent).toContain('Conectando con Microsoft…');

    finish();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(loginButton().disabled).toBeFalse();
  });

  it('si el login falla muestra un error y reactiva el botón', async () => {
    loginWithMicrosoft.and.rejectWith(new Error('popup_window_error'));

    await fixture.componentInstance.login();
    fixture.detectChanges();

    expect(root().textContent).toContain('No se pudo iniciar sesión con Microsoft');
    expect(loginButton().disabled).toBeFalse();
  });
});

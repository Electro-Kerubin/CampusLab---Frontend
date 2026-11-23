import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginPageComponent } from './login-page.component';
import { AuthService } from '../services/auth.service';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  const authMock = { loginWithMicrosoft: jasmine.createSpy('loginWithMicrosoft').and.resolveTo(undefined), isAuthenticated: () => false };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authMock }],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
  });

  it('muestra solo el botón de Microsoft (sin botones de rol)', () => {
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Microsoft');
    ['Técnico', 'Estudiante', 'Auditor'].forEach((r) =>
      expect(text).withContext(r).not.toMatch(new RegExp(`Entrar como ${r}`, 'i'))
    );
    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(1);
  });

  it('al hacer clic llama a AuthService.loginWithMicrosoft()', () => {
    fixture.nativeElement.querySelector('button').click();
    expect(authMock.loginWithMicrosoft).toHaveBeenCalled();
  });
});

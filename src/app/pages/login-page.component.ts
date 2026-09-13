import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import {
  LucideAngularModule,
  FlaskConical,
  ShieldCheck,
  Zap,
  Users,
} from 'lucide-angular';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-[#1a1d2e] flex">
      <!-- Left panel — branding -->
      <div class="hidden lg:flex flex-col flex-1 p-12 justify-between relative overflow-hidden">
        <!-- Background pattern -->
        <div class="absolute inset-0 opacity-5 pointer-events-none">
          @for (i of patternCircles; track i) {
            <div
              class="absolute rounded-full border border-white"
              [style.width.px]="i * 80"
              [style.height.px]="i * 80"
              style="top: 50%; left: 50%; transform: translate(-50%, -50%);"
            ></div>
          }
        </div>

        <!-- Logo -->
        <div class="relative flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#5cb85c] flex items-center justify-center shadow-lg">
            <lucide-icon [img]="FlaskConical" size="22" class="text-white" />
          </div>
          <span class="text-white text-2xl font-bold tracking-tight">CampusLab</span>
        </div>

        <!-- Hero text -->
        <div class="relative">
          <h1 class="text-4xl font-bold text-white leading-tight mb-4">
            Gestión de laboratorios<br />
            <span class="text-[#5cb85c]">académicos unificada</span>
          </h1>
          <p class="text-gray-400 text-lg leading-relaxed max-w-md">
            Reserva equipos, administra stock de insumos y coordina el uso de 20 laboratorios desde una sola plataforma.
          </p>

          <!-- Feature pills -->
          <div class="flex flex-wrap gap-3 mt-8">
            <div class="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm text-gray-300 border border-white/10">
              <lucide-icon [img]="ShieldCheck" size="14" class="text-[#5cb85c]" />
              Azure AD SSO
            </div>
            <div class="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm text-gray-300 border border-white/10">
              <lucide-icon [img]="Zap" size="14" class="text-[#5cb85c]" />
              Tiempo real
            </div>
            <div class="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm text-gray-300 border border-white/10">
              <lucide-icon [img]="Users" size="14" class="text-[#5cb85c]" />
              Multirol
            </div>
          </div>
        </div>

        <!-- Stats row -->
        <div class="relative grid grid-cols-3 gap-6">
          <div>
            <div class="text-2xl font-bold text-white">20</div>
            <div class="text-sm text-gray-500 mt-0.5">Laboratorios</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-white">450+</div>
            <div class="text-sm text-gray-500 mt-0.5">Equipos</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-white">5</div>
            <div class="text-sm text-gray-500 mt-0.5">Microservicios</div>
          </div>
        </div>
      </div>

      <!-- Right panel — login card -->
      <div class="flex-1 lg:max-w-md xl:max-w-lg flex items-center justify-center p-8 bg-white">
        <div class="w-full max-w-sm">
          <!-- Mobile logo -->
          <div class="flex lg:hidden items-center gap-3 mb-8">
            <div class="w-9 h-9 rounded-lg bg-[#5cb85c] flex items-center justify-center">
              <lucide-icon [img]="FlaskConical" size="18" class="text-white" />
            </div>
            <span class="text-[#1a1d2e] text-xl font-bold">CampusLab</span>
          </div>

          <h2 class="text-2xl font-bold text-[#1a1d2e] mb-1">Bienvenido</h2>
          <p class="text-gray-500 text-sm mb-8">
            Inicia sesión con tu cuenta institucional para acceder a la plataforma.
          </p>

          <!-- Microsoft SSO button (ÚNICA forma de acceder) -->
          <button
            (click)="login()"
            [disabled]="loading()"
            class="w-full flex items-center gap-3 border-2 border-gray-200 hover:border-[#0078d4] hover:bg-blue-50 rounded-xl px-4 py-3.5 transition-all group mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            <div class="flex-1 text-left">
              <div class="text-sm font-semibold text-[#1a1d2e] group-hover:text-[#0078d4]">
                @if (loading()) {
                  Conectando con Microsoft…
                } @else {
                  Iniciar sesión con Microsoft
                }
              </div>
              <div class="text-xs text-gray-400">Azure Active Directory</div>
            </div>
          </button>

          @if (errorMsg()) {
            <div class="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {{ errorMsg() }}
            </div>
          }

          <!-- Info -->
          <div class="flex items-start gap-2 bg-[#f4f9f4] border border-[#c3e6c3] rounded-lg p-3">
            <lucide-icon [img]="ShieldCheck" size="14" class="text-[#5cb85c] mt-0.5 shrink-0" />
            <p class="text-xs text-gray-600 leading-relaxed">
              El acceso está protegido por Azure AD SSO. El token JWT se valida en el API Gateway antes de llegar a los microservicios. No se requiere seleccionar rol: los permisos se derivan del token.
            </p>
          </div>

          <p class="text-center text-xs text-gray-400 mt-6">
            CampusLab v2.0 · Duoc UC · 2026
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  private auth = inject(AuthService);

  readonly FlaskConical = FlaskConical;
  readonly ShieldCheck = ShieldCheck;
  readonly Zap = Zap;
  readonly Users = Users;

  readonly patternCircles = Array.from({ length: 20 }, (_, i) => i + 1);

  loading = signal(false);
  errorMsg = signal<string | null>(null);

  async login(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      // loginRedirect saca al usuario de la app hacia Microsoft;
      // el retorno lo procesa AppComponent con handleRedirectObservable().
      await this.auth.loginWithMicrosoft();
    } catch (err) {
      this.errorMsg.set(
        'No se pudo iniciar sesión con Microsoft. Verifica tu conexión e inténtalo de nuevo.'
      );
    } finally {
      this.loading.set(false);
    }
  }
}

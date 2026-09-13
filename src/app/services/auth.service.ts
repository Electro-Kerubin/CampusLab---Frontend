import { Injectable, signal, computed, inject } from '@angular/core';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { AccountInfo, InteractionStatus } from '@azure/msal-browser';
import { filter } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { AppUser } from '../models';

const SCOPES = ['User.Read'];

/**
 * Servicio de autenticación exclusivo con Microsoft (Azure AD / Entra ID SSO).
 *
 * No hay login por rol. El usuario se autentica con su cuenta institucional
 * de Microsoft (login por redirect) y la plataforma obtiene nombre y correo
 * desde la cuenta activa de MSAL. Los permisos reales se derivan del JWT
 * validado por el API Gateway; el frontend no selecciona rol.
 *
 * La instancia de MSAL (clientId/authority/redirectUri) se configura una
 * sola vez en `msal-config.ts` y se provee vía MSAL_INSTANCE en
 * `app.config.ts`; este servicio solo consume `MsalService`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly msalService = inject(MsalService);
  private readonly msalBroadcastService = inject(MsalBroadcastService);

  /** Usuario actual — null si no hay sesión iniciada */
  readonly currentUser = signal<AppUser | null>(null);

  /** True cuando hay sesión activa */
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  constructor() {
    // Estado inicial, por si ya había una cuenta en caché (localStorage).
    this.updateUserFromActiveAccount();

    // Se refresca cada vez que MSAL termina de procesar login/redirect.
    this.msalBroadcastService.inProgress$
      .pipe(filter((status: InteractionStatus) => status === InteractionStatus.None))
      .subscribe(() => this.updateUserFromActiveAccount());
  }

  /**
   * Inicia sesión con Microsoft Entra ID vía redirect. El navegador sale
   * hacia login.microsoftonline.com y vuelve a `redirectUri`; el retorno
   * lo procesa `AppComponent` con `handleRedirectObservable()`.
   */
  async loginWithMicrosoft(): Promise<void> {
    await firstValueFrom(this.msalService.loginRedirect({ scopes: SCOPES }));
  }

  /**
   * Cierra sesión en Microsoft (redirect) y limpia el estado local.
   */
  async logout(): Promise<void> {
    await firstValueFrom(this.msalService.logoutRedirect());
  }

  private updateUserFromActiveAccount(): void {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) {
      this.currentUser.set(null);
      return;
    }

    let account = this.msalService.instance.getActiveAccount();
    if (!account) {
      account = accounts[0];
      this.msalService.instance.setActiveAccount(account);
    }

    this.currentUser.set(this.mapAccountToUser(account));
  }

  private mapAccountToUser(account: AccountInfo): AppUser {
    const name = account.name ?? account.username ?? 'Usuario';
    const initials = name
      .split(' ')
      .map((s) => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return {
      name,
      email: account.username,
      avatar: initials,
      role: 'Azure AD',
    };
  }
}

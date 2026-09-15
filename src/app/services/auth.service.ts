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

  /** True solo cuando hay sesión activa Y tiene roles válidos */
  readonly isAuthenticated = computed(() => {
    const user = this.currentUser();
    if (!user) return false;

    // Validar que tiene roles en el token
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) return false;

    const account = this.msalService.instance.getActiveAccount();
    if (!account) return false;

    // Buscar roles en múltiples ubicaciones
    const roles =
      account.idTokenClaims?.['roles'] ||
      account.idTokenClaims?.['appRoles'] ||
      account.idTokenClaims?.['wids'];

    const hasValidRoles = roles && Array.isArray(roles) && roles.length > 0;

    if (!hasValidRoles) {
      console.warn('⚠️ [AuthService] isAuthenticated=false: Usuario sin roles válidos');
    }

    return hasValidRoles;
  });

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
    console.log('🔍 [AuthService] updateUserFromActiveAccount() - Verificando sesión...');

    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) {
      console.warn('❌ [AuthService] Sin cuentas activas');
      this.currentUser.set(null);
      return;
    }

    let account = this.msalService.instance.getActiveAccount();
    if (!account) {
      account = accounts[0];
      this.msalService.instance.setActiveAccount(account);
    }

    console.log('📋 [AuthService] Account completo:', account);
    console.log('📋 [AuthService] idTokenClaims:', account.idTokenClaims);

    // VALIDACIÓN CRÍTICA: Leer roles de MÚLTIPLES fuentes
    let roles: string[] = [];

    // Opción 1: Desde idTokenClaims
    if (account.idTokenClaims?.['roles']) {
      roles = account.idTokenClaims['roles'] as string[];
      console.log('✓ Roles desde idTokenClaims.roles:', roles);
    }
    // Opción 2: Desde appRoles
    else if (account.idTokenClaims?.['appRoles']) {
      roles = account.idTokenClaims['appRoles'] as string[];
      console.log('✓ Roles desde idTokenClaims.appRoles:', roles);
    }
    // Opción 3: Desde wids
    else if (account.idTokenClaims?.['wids']) {
      roles = account.idTokenClaims['wids'] as string[];
      console.log('✓ Roles desde idTokenClaims.wids:', roles);
    }
    // Opción 4: Parsear manualmente del JWT
    else {
      console.warn('⚠️ No encontré roles en idTokenClaims, intentando parsear JWT manualmente...');
      try {
        // Obtener el token del localStorage
        const tokenKey = Object.keys(localStorage).find(
          (key) => key.includes('id_token') && key.includes('MSAL')
        );
        if (tokenKey) {
          const token = localStorage.getItem(tokenKey);
          console.log('📋 Token desde localStorage:', token?.substring(0, 100) + '...');

          if (token) {
            // Decodificar JWT manualmente
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              console.log('📋 JWT Payload decodificado:', payload);

              if (payload.roles && Array.isArray(payload.roles)) {
                roles = payload.roles;
                console.log('✓ Roles extraídos del JWT:', roles);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error al parsear JWT:', error);
      }
    }

    const hasValidRoles = roles && Array.isArray(roles) && roles.length > 0;

    console.log('📋 Roles finales encontrados:', roles);
    console.log('📋 hasValidRoles:', hasValidRoles);

    if (!hasValidRoles) {
      console.error(
        '❌ [AuthService] USUARIO SIN ROLES - Logout forzado',
        '\n   Usuario:', account.username,
        '\n   OID:', account.localAccountId
      );
      this.currentUser.set(null);
      this.msalService.logoutRedirect().subscribe();
      return;
    }

    console.log('✅ [AuthService] Usuario con roles válidos:', roles);
    this.currentUser.set(this.mapAccountToUser(account, roles));
  }

  private mapAccountToUser(account: AccountInfo, roles: string[]): AppUser {
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
      // Rol(es) reales tomados del claim "roles" del id_token de Azure AD
      // (ver updateUserFromActiveAccount), no un valor fijo.
      role: roles.map(roleLabel).join(' / '),
    };
  }
}

/** Etiqueta legible para cada rol de App Role de Azure AD. */
function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'Administrador',
    TECNICO: 'Técnico',
    ESTUDIANTE: 'Estudiante',
    AUDITOR: 'Auditor',
  };
  return labels[role.toUpperCase()] ?? role;
}

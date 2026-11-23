import { Injectable, signal, computed, inject } from '@angular/core';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { AccountInfo, InteractionStatus } from '@azure/msal-browser';
import { filter } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { AppUser, Role } from '../models';

const SCOPES = ['User.Read'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly msalService = inject(MsalService);
  private readonly msalBroadcastService = inject(MsalBroadcastService);

  readonly currentUser = signal<AppUser | null>(null);

  readonly isAuthenticated = computed(() => {
    const user = this.currentUser();
    if (!user) return false;

    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) return false;

    const account = this.msalService.instance.getActiveAccount();
    if (!account) return false;

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

  hasAnyRole(...roles: Role[]): boolean {
    const userRoles = this.currentUser()?.roles ?? [];
    return roles.some((r) => userRoles.includes(r));
  }

  hasRole(role: Role): boolean {
    return this.hasAnyRole(role);
  }

  constructor() {
    try {
      this.updateUserFromActiveAccount();
    } catch (error) {
      console.warn('⚠️ [AuthService] MSAL todavía no está listo; la sesión se leerá al terminar de iniciar:', error);
    }

    this.msalBroadcastService.inProgress$
      .pipe(filter((status: InteractionStatus) => status === InteractionStatus.None))
      .subscribe(() => this.updateUserFromActiveAccount());
  }

  async loginWithMicrosoft(): Promise<void> {
    await firstValueFrom(this.msalService.loginRedirect({ scopes: SCOPES }));
  }

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

    let roles: string[] = [];

    if (account.idTokenClaims?.['roles']) {
      roles = account.idTokenClaims['roles'] as string[];
      console.log('✓ Roles desde idTokenClaims.roles:', roles);
    }
    else if (account.idTokenClaims?.['appRoles']) {
      roles = account.idTokenClaims['appRoles'] as string[];
      console.log('✓ Roles desde idTokenClaims.appRoles:', roles);
    }
    else if (account.idTokenClaims?.['wids']) {
      roles = account.idTokenClaims['wids'] as string[];
      console.log('✓ Roles desde idTokenClaims.wids:', roles);
    }
    else {
      console.warn('⚠️ No encontré roles en idTokenClaims, intentando parsear JWT manualmente...');
      try {
        const tokenKey = Object.keys(localStorage).find(
          (key) => key.includes('id_token') && key.includes('MSAL')
        );
        if (tokenKey) {
          const token = localStorage.getItem(tokenKey);
          console.log('📋 Token desde localStorage:', token?.substring(0, 100) + '...');

          if (token) {
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

    const normalizedRoles = roles
      .map((r) => r.toUpperCase())
      .filter((r): r is Role => ['ADMIN', 'TECNICO', 'ESTUDIANTE', 'AUDITOR'].includes(r));

    return {
      name,
      email: account.username,
      avatar: initials,
      role: normalizedRoles.map(roleLabel).join(' / '),
      roles: normalizedRoles,
    };
  }
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'Administrador',
    TECNICO: 'Técnico',
    ESTUDIANTE: 'Estudiante',
    AUDITOR: 'Auditor',
  };
  return labels[role.toUpperCase()] ?? role;
}

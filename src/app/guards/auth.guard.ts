import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Guard que protege rutas internas. Valida:
 * 1. Hay sesión iniciada
 * 2. El token tiene roles válidos
 * 3. El token no ha expirado
 *
 * Si el usuario no tiene roles válidos, lo redirige al login.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const msalService = inject(MsalService);
  const msalBroadcastService = inject(MsalBroadcastService);

  return msalBroadcastService.inProgress$.pipe(
    filter((status: InteractionStatus) => status === InteractionStatus.None),
    take(1),
    map(() => {
      console.log('🔍 [AUTH GUARD] ========== VERIFICACIÓN DE ACCESO ==========');

      // 1. Verificar sesión
      const isAuth = auth.isAuthenticated();
      console.log('📌 auth.isAuthenticated():', isAuth);

      if (!isAuth) {
        console.log('❌ [AUTH GUARD] RECHAZADO: No hay sesión');
        return router.parseUrl('/login');
      }

      // 2. Obtener account
      const accounts = msalService.instance.getAllAccounts();
      console.log('📌 Número de cuentas:', accounts.length);

      if (accounts.length === 0) {
        console.log('❌ [AUTH GUARD] RECHAZADO: Sin cuentas');
        return router.parseUrl('/login');
      }

      const account = msalService.instance.getActiveAccount();
      if (!account) {
        console.log('❌ [AUTH GUARD] RECHAZADO: Sin cuenta activa');
        return router.parseUrl('/login');
      }

      console.log('📌 Usuario:', account.username);
      console.log('📌 ID Token Claims:', account.idTokenClaims);

      // 3. BÚSQUEDA DE ROLES - TODAS LAS UBICACIONES
      let roles: string[] = [];

      if (account.idTokenClaims?.['roles']) {
        roles = account.idTokenClaims['roles'] as string[];
      } else if (account.idTokenClaims?.['appRoles']) {
        roles = account.idTokenClaims['appRoles'] as string[];
      } else if (account.idTokenClaims?.['wids']) {
        roles = account.idTokenClaims['wids'] as string[];
      }

      console.log('📌 Roles encontrados:', roles);
      console.log('📌 Tiene roles válidos:', roles.length > 0);

      // VALIDACIÓN FINAL: Uno de los roles válidos
      const VALID_ROLES = ['ADMIN', 'ESTUDIANTE', 'AUDITOR', 'TECNICO'];
      const hasValidRole = roles.some((role: string) => VALID_ROLES.includes(role));

      console.log('📌 Roles válidos:', VALID_ROLES);
      console.log('📌 ¿Tiene algún rol válido?:', hasValidRole);

      if (!hasValidRole) {
        console.error('❌ [AUTH GUARD] ========== ACCESO DENEGADO ==========');
        console.error('   Usuario:', account.username);
        console.error('   Roles disponibles:', roles);
        console.error('   ❌ NO TIENE NINGUNO DE LOS ROLES VÁLIDOS');
        console.error('   Roles válidos:', VALID_ROLES);
        console.error('🔴 Ejecutando logout...');

        // LOGOUT COMPLETO
        localStorage.clear();
        sessionStorage.clear();
        msalService.logout();

        return router.parseUrl('/login');
      }

      console.log('✅ [AUTH GUARD] ========== ACCESO CONCEDIDO ==========');
      console.log('   Usuario:', account.username);
      console.log('   Roles:', roles);
      return true;
    })
  );
};

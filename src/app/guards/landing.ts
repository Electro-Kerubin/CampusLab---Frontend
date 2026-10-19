import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/** Roles de App Role de Azure AD que reconoce la plataforma (los mismos que exige authGuard). */
export const VALID_ROLES = ['ADMIN', 'ESTUDIANTE', 'AUDITOR', 'TECNICO'];

/**
 * Pantalla de inicio de un usuario con sesión: un AUDITOR (solo ese rol) aterriza en /audit,
 * el resto en /dashboard.
 */
export function landingPath(auth: AuthService): string {
  const roles = auth.currentUser()?.roles ?? [];
  const isAuditorOnly = roles.length > 0 && roles.every((r) => r === 'AUDITOR');
  return isAuditorOnly ? '/audit' : '/dashboard';
}

/**
 * Destino de la ruta raíz "/" cuando ya hay sesión (authGuard ya envió a /login a quien no la tiene).
 *
 * OJO: una ruta SIEMPRE necesita uno de component/loadComponent/redirectTo/children/loadChildren: un
 * canActivate solo, aunque siempre redirija, no pasa la validación estática del Router (NG04014).
 * Por eso se usa la forma funcional de `redirectTo` (Angular 15.1+).
 */
export function landingRedirect(): string {
  return landingPath(inject(AuthService));
}

/**
 * Guard de /login: quien ya tiene una sesión que authGuard aceptaría no necesita ver el login,
 * se le manda a su pantalla de inicio.
 *
 * Usa el MISMO criterio que authGuard para decidir si la sesión es válida. Si fuera más permisivo,
 * un usuario con sesión pero sin un rol válido rebotaría entre /login y /dashboard sin parar.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const msalService = inject(MsalService);
  const msalBroadcastService = inject(MsalBroadcastService);

  // Hay que esperar a que MSAL termine de arrancar: antes de eso la cuenta en caché todavía no se lee
  return msalBroadcastService.inProgress$.pipe(
    filter((status: InteractionStatus) => status === InteractionStatus.None),
    take(1),
    map(() => {
      const account = msalService.instance.getActiveAccount();
      const claims = account?.idTokenClaims;
      const roles = (claims?.['roles'] ?? claims?.['appRoles'] ?? claims?.['wids'] ?? []) as string[];

      const hasValidSession =
        auth.isAuthenticated() &&
        msalService.instance.getAllAccounts().length > 0 &&
        !!account &&
        Array.isArray(roles) &&
        roles.some((role) => VALID_ROLES.includes(role));

      return hasValidSession ? router.parseUrl(landingPath(auth)) : true;
    })
  );
};

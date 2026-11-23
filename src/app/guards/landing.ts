import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const VALID_ROLES = ['ADMIN', 'ESTUDIANTE', 'AUDITOR', 'TECNICO'];

export function landingPath(auth: AuthService): string {
  const roles = auth.currentUser()?.roles ?? [];
  const isAuditorOnly = roles.length > 0 && roles.every((r) => r === 'AUDITOR');
  return isAuditorOnly ? '/audit' : '/dashboard';
}

export function landingRedirect(): string {
  return landingPath(inject(AuthService));
}

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const msalService = inject(MsalService);
  const msalBroadcastService = inject(MsalBroadcastService);

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

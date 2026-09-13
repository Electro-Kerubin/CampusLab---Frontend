import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Guard que protege rutas internas. Si no hay sesión iniciada,
 * redirige al login.
 *
 * Espera a que MSAL termine de procesar el retorno del redirect
 * (InteractionStatus.None) antes de evaluar la sesión: si se evalúa
 * de inmediato, `AuthService.isAuthenticated()` todavía puede estar
 * en `false` porque `handleRedirectObservable()` (en AppComponent)
 * aún no terminó de leer el hash y activar la cuenta.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const msalBroadcastService = inject(MsalBroadcastService);

  return msalBroadcastService.inProgress$.pipe(
    filter((status: InteractionStatus) => status === InteractionStatus.None),
    take(1),
    map(() => (auth.isAuthenticated() ? true : router.parseUrl('/login')))
  );
};

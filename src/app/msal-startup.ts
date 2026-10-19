import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { firstValueFrom } from 'rxjs';

/**
 * Inicializa MSAL ANTES de que la aplicación arranque (router, guards y componentes incluidos).
 *
 * Con cacheLocation 'localStorage', MSAL no puede leer la caché (cuentas, tokens) hasta que termina
 * initialize(); antes de eso lanza BrowserAuthError "uninitialized_public_client_application".
 * Sin esto, AuthService (que lee la cuenta en su constructor) y los guards se creaban antes de tiempo:
 * con una sesión guardada la página quedaba en blanco al recargar. Con una caché vacía (sin sesión)
 * no se notaba, porque no hay nada que leer.
 *
 * initialize() es idempotente: handleRedirectObservable() lo vuelve a llamar sin efecto.
 */
export function provideMsalStartup(): EnvironmentProviders {
  return provideAppInitializer(() => firstValueFrom(inject(MsalService).initialize()));
}

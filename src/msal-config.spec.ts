//PARA TESTING
import { InteractionType } from '@azure/msal-browser';
import { msalInstanceFactory } from './msal-config';
import { msalGuardConfigFactory } from './msal-guard-config';
import { environment } from './environments/environment';

describe('Configuración de MSAL', () => {
  it('la instancia usa el clientId, authority y redirectUri del environment', () => {
    const auth = msalInstanceFactory().getConfiguration().auth;
    expect(auth.clientId).toBe(environment.azure.clientId);
    expect(auth.authority).toBe(environment.azure.authority);
    expect(auth.redirectUri).toBe(environment.azure.redirectUri);
  });

  it('guarda la sesión en localStorage (sobrevive a recargar la página)', () => {
    expect(msalInstanceFactory().getConfiguration().cache.cacheLocation).toBe('localStorage');
  });

  it('el login es por redirect, no por popup', () => {
    expect(msalGuardConfigFactory().interactionType).toBe(InteractionType.Redirect);
  });
});

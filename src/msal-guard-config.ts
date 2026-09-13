import { MsalGuardConfiguration } from '@azure/msal-angular'
import { InteractionType } from '@azure/msal-browser';

export function msalGuardConfigFactory(): MsalGuardConfiguration {
    return {
        interactionType: InteractionType.Redirect
    };
}
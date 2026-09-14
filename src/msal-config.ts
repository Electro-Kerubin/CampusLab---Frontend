import { IPublicClientApplication, PublicClientApplication } from "@azure/msal-browser";
import { environment } from "./environments/environment";


export function msalInstanceFactory(): IPublicClientApplication {
    return new PublicClientApplication({
        auth: {
            clientId: environment.azure.clientId,
            authority: environment.azure.authority,
            redirectUri: environment.azure.redirectUri
        },
        cache: {
            cacheLocation: 'localStorage'
        }
    });
}
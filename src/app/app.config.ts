import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { MSAL_GUARD_CONFIG, MSAL_INSTANCE, MsalGuard, MsalService, MsalBroadcastService } from '@azure/msal-angular';

import { routes } from './app.routes';
import { msalGuardConfigFactory } from '../msal-guard-config';
import { msalInstanceFactory } from '../msal-config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ),
    provideHttpClient(withFetch()),
    provideCharts(withDefaultRegisterables()),
    { provide: MSAL_INSTANCE, useFactory: msalInstanceFactory},
    { provide: MSAL_GUARD_CONFIG, useFactory: msalGuardConfigFactory },

    MsalGuard,
    MsalService,
    MsalBroadcastService
  ],
};

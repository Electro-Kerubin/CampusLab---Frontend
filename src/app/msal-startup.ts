import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { firstValueFrom } from 'rxjs';

export function provideMsalStartup(): EnvironmentProviders {
  return provideAppInitializer(() => firstValueFrom(inject(MsalService).initialize()));
}

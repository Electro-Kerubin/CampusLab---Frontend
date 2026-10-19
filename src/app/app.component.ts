import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly msalService = inject(MsalService);
  private readonly router = inject(Router);
  private readonly destroying$ = new Subject<void>();

  ngOnInit(): void {
    // Procesa el retorno de Microsoft tras el login/logout por redirect
    // (parsea el hash de la URL y activa la cuenta autenticada en MSAL).
    this.msalService
      .handleRedirectObservable()
      .pipe(takeUntil(this.destroying$))
      .subscribe({
        next: (result) => {
          // En una carga normal (recargar una página, escribir una URL) no hay resultado: la URL no se toca.
          // Antes aquí se forzaba /dashboard en TODA carga con sesión, así que recargar /audit o /bookings
          // sacaba al usuario de la página y un AUDITOR terminaba en el dashboard en vez de /audit.
          if (!result) return;

          // Solo al volver de un login por redirect: ir a "/", que decide según sesión y rol
          // (authGuard -> /login si falla; landingRedirect -> /dashboard, o /audit para un AUDITOR)
          console.log('✅ Redirect procesado correctamente:', result.account?.username);
          this.router.navigateByUrl('/').catch((err) => {
            console.error('Error navegando tras el login:', err);
          });
        },
        error: (error) => {
          console.error('❌ Error procesando el retorno de MSAL:', error);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroying$.next();
    this.destroying$.complete();
  }
}

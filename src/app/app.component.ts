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
          // Si el redirect fue exitoso y hay cuenta activa, redirige al dashboard
          console.log('✅ Redirect procesado correctamente:', result);
          const accounts = this.msalService.instance.getAllAccounts();
          if (accounts.length > 0) {
            // Pequeña demora para asegurar que el guard pueda verificar la sesión
            setTimeout(() => {
              this.router.navigate(['/dashboard']).catch((err) => {
                console.error('Error navegando al dashboard:', err);
              });
            }, 100);
          }
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

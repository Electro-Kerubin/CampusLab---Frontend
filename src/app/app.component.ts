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
    this.msalService
      .handleRedirectObservable()
      .pipe(takeUntil(this.destroying$))
      .subscribe({
        next: (result) => {
          if (!result) return;

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

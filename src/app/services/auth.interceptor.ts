import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { MsalService } from '@azure/msal-angular';
import { Router } from '@angular/router';
import { AccountInfo } from '@azure/msal-browser';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly msalService = inject(MsalService);
  private readonly router = inject(Router);

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) {
      return next.handle(req);
    }

    const account = this.msalService.instance.getActiveAccount();
    if (!account) {
      return next.handle(req);
    }

    return from(this.getFreshIdToken(account)).pipe(
      switchMap((token) => {
        if (token) {
          req = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          });
          console.log('🔐 Token agregado a solicitud:', req.url);
        }
        return next.handle(req);
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.error('❌ Token rechazado por el servidor (401)');
          this.msalService.logoutRedirect().subscribe();
          this.router.navigate(['/login']);
        } else if (error.status === 403) {
          console.error('❌ Sin permisos para acceder a este recurso (403)');
          this.router.navigate(['/dashboard']);
        }
        return throwError(() => error);
      })
    );
  }

  private async getFreshIdToken(account: AccountInfo): Promise<string | null> {
    const cached = account.idToken;
    try {
      if (!cached || this.expiresWithin(cached, 120)) {
        const result = await this.msalService.instance
          .acquireTokenSilent({ scopes: ['openid', 'profile'], account })
          .catch(() => null);
        if (result?.idToken) {
          account.idToken = result.idToken;
          return result.idToken;
        }
      }
      return cached ?? null;
    } catch {
      return cached ?? null;
    }
  }

  private expiresWithin(jwt: string, seconds: number): boolean {
    try {
      const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return Date.now() > payload.exp * 1000 - seconds * 1000;
    } catch {
      return true;
    }
  }
}

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

/**
 * Interceptor HTTP que:
 * 1. Agrega el token a TODAS las solicitudes al backend
 * 2. Refresca el id_token en silencio cuando está por expirar (dura 1 h):
 *    antes se enviaba el id_token cacheado de MSAL sin refrescar, así que
 *    pasada una hora todas las llamadas daban 401 y se cerraba la sesión.
 * 3. Maneja errores 401/403
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly msalService = inject(MsalService);
  private readonly router = inject(Router);

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) {
      // Sin sesión, pasar la solicitud tal cual
      return next.handle(req);
    }

    const account = this.msalService.instance.getActiveAccount();
    if (!account) {
      return next.handle(req);
    }

    // Token fresco (refresca en silencio si el cacheado está por expirar)
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
          // La sesión murió de verdad (el refresco falló): cerrar sesión
          console.error('❌ Token rechazado por el servidor (401)');
          this.msalService.logoutRedirect().subscribe();
          this.router.navigate(['/login']);
        } else if (error.status === 403) {
          // No tiene permisos
          console.error('❌ Sin permisos para acceder a este recurso (403)');
          this.router.navigate(['/dashboard']);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Devuelve un id_token válido: usa el cacheado si aún le queda vida
   * (margen de 2 min) y, si no, lo refresca en silencio con el refresh
   * token que MSAL guardó al iniciar sesión.
   */
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

  /** true si el JWT expira en menos de `seconds` segundos (o no se puede leer). */
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

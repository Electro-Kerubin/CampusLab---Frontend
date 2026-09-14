import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MsalService } from '@azure/msal-angular';
import { Router } from '@angular/router';

/**
 * Interceptor HTTP que:
 * 1. Agrega el token de acceso a TODAS las solicitudes al backend
 * 2. Maneja errores 401 (No autorizado)
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly msalService = inject(MsalService);
  private readonly router = inject(Router);

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Obtener token de MSAL
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) {
      // Sin token, pasar la solicitud tal cual
      return next.handle(req);
    }

    // Obtener token de acceso
    const account = this.msalService.instance.getActiveAccount();
    if (!account) {
      return next.handle(req);
    }

    // Agregar token Bearer a la solicitud
    const token = account.idTokenClaims?.['id_token'] || 
                  localStorage.getItem('msal.idtoken');
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('🔐 Token agregado a solicitud:', req.url);
    }

    // Manejo de errores
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Token inválido o expirado
          console.error('❌ Token rechazado por el servidor (401)');
          this.msalService.logout();
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
}

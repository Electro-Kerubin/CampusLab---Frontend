import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Decide a qué página aterriza cada usuario al entrar a "/" (raíz de la app,
 * después del login). Por defecto todos van a /dashboard, salvo el rol
 * AUDITOR: su función es "consultar el timeline, solo lectura" (ver
 * README), así que lo mandamos directo a /audit en vez de un dashboard
 * pensado para operar reservas/catálogo.
 *
 * Solo decide la landing inicial — no restringe la navegación posterior:
 * un AUDITOR igual puede visitar cualquier otra pestaña si quiere, esto
 * únicamente evita que su primera pantalla sea una que no va a usar.
 */
export const landingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const roles = auth.currentUser()?.roles ?? [];
  const isAuditorOnly = roles.length > 0 && roles.every((r) => r === 'AUDITOR');

  return router.parseUrl(isAuditorOnly ? '/audit' : '/dashboard');
};

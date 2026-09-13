import { Injectable, signal, computed, inject } from '@angular/core';
import {
  PublicClientApplication,
  AccountInfo,
  AuthenticationResult,
} from '@azure/msal-browser';
import { AppUser } from '../models';

/**
 * Configuración MSAL para Azure AD SSO.
 *
 * Reemplaza clientId y tenantId con los valores reales del App Registration
 * en Azure Portal → App registrations.
 */
const MSAL_CONFIG = {
  auth: {
    clientId: 'TU_CLIENT_ID_AZURE_AD',
    authority: 'https://login.microsoftonline.com/TU_TENANT_ID',
    redirectUri: window.location.origin + '/',
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

const SCOPES = ['user.read'];

/**
 * Servicio de autenticación exclusivo con Microsoft (Azure AD SSO).
 *
 * No hay login por rol. El usuario se autentica con su cuenta institucional
 * de Microsoft y la plataforma obtiene nombre, correo y cualquier rol
 * informativo desde el token JWT. El frontend no selecciona rol.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private msalInstance: PublicClientApplication | null = null;
  private initialized = false;

  /** Usuario actual — null si no hay sesión iniciada */
  readonly currentUser = signal<AppUser | null>(this.readStoredUser());

  /** True cuando hay sesión activa */
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  constructor() {
    // Solo inicializamos MSAL si hay configuración real.
    // Si clientId es el placeholder, el servicio funciona en modo demo
    // para permitir desarrollo local sin Azure.
    if (MSAL_CONFIG.auth.clientId !== 'TU_CLIENT_ID_AZURE_AD') {
      this.msalInstance = new PublicClientApplication(MSAL_CONFIG);
    }
  }

  /**
   * Inicia sesión con Microsoft. Redirige a la página de login de Microsoft
   * o usa popup según el modo configurado.
   *
   * En modo demo (sin clientId configurado), simula un login con un
   * usuario de ejemplo de Microsoft Entra ID.
   */
  async loginWithMicrosoft(): Promise<void> {
    // Modo demo — sin Azure configurado
    if (!this.msalInstance) {
      this.simulateMicrosoftLogin();
      return;
    }

    // Inicializar MSAL (una sola vez)
    if (!this.initialized) {
      await this.msalInstance.initialize();
      this.initialized = true;
    }

    try {
      const response: AuthenticationResult = await this.msalInstance.loginPopup({
        scopes: SCOPES,
        prompt: 'select_account',
      });

      this.msalInstance.setActiveAccount(response.account);
      this.setUserFromAccount(response.account, response.accessToken);
    } catch (err) {
      console.error('Error en login de Microsoft:', err);
      throw err;
    }
  }

  /**
   * Cierra sesión en Microsoft y limpia el estado local.
   */
  async logout(): Promise<void> {
    if (this.msalInstance && this.initialized) {
      const account = this.msalInstance.getActiveAccount();
      if (account) {
        await this.msalInstance.logoutPopup({ account });
      }
    }
    this.currentUser.set(null);
    localStorage.removeItem('campuslab_user');
  }

  private setUserFromAccount(account: AccountInfo, accessToken: string): void {
    const name = account.name ?? account.username ?? 'Usuario';
    const initials = name
      .split(' ')
      .map((s) => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    // Los roles reales se derivan del JWT del backend en producción.
    // Aquí simplemente dejamos "Azure AD" como referencia informativa.
    const user: AppUser = {
      name,
      email: account.username,
      avatar: initials,
      role: 'Azure AD',
    };

    this.currentUser.set(user);
    localStorage.setItem('campuslab_user', JSON.stringify(user));
  }

  private simulateMicrosoftLogin(): void {
    // Simulación para desarrollo local sin Azure configurado.
    const user: AppUser = {
      name: 'Carmen Vidal',
      email: 'carmen.vidal@duocuc.cl',
      avatar: 'CV',
      role: 'Azure AD',
    };
    this.currentUser.set(user);
    localStorage.setItem('campuslab_user', JSON.stringify(user));
  }

  private readStoredUser(): AppUser | null {
    try {
      const raw = localStorage.getItem('campuslab_user');
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  }
}

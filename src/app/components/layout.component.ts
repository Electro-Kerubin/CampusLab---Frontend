import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PageId } from '../models';
import {
  LucideAngularModule,
  Bell,
  Settings,
  ChevronDown,
  Wifi,
  Search,
  FlaskConical,
} from 'lucide-angular';

interface NavItem {
  id: PageId;
  label: string;
  path: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
  ],
  template: `
    <div class="h-screen flex flex-col bg-[#f4f5f7]">
      <!-- Top Header -->
      <header class="bg-[#1a1d2e] flex items-center px-4 h-14 gap-4 shrink-0 z-20 shadow-lg">
        <!-- Logo -->
        <a routerLink="/dashboard" class="flex items-center gap-2 text-white font-bold text-lg select-none cursor-pointer">
          <div class="w-8 h-8 rounded-md bg-[#5cb85c] flex items-center justify-center">
            <lucide-icon [img]="FlaskConical" size="18" class="text-white" />
          </div>
          <span class="font-semibold tracking-tight">CampusLab</span>
        </a>

        <!-- Search -->
        <div class="flex-1 max-w-md mx-4">
          <div class="relative">
            <lucide-icon [img]="Search" size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar reservas, laboratorios, equipos..."
              class="w-full bg-[#2d3045] border border-[#3d4060] rounded-md pl-9 pr-4 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#5cb85c] transition-colors"
            />
          </div>
        </div>

        <div class="flex-1"></div>

        <!-- Right side -->
        <div class="flex items-center gap-3">
          <!-- Azure AD badge -->
          <div class="flex items-center gap-1.5 bg-[#2d3045] border border-[#3d4060] rounded-md px-3 py-1.5">
            <lucide-icon [img]="Wifi" size="12" class="text-[#5cb85c]" />
            <span class="text-xs text-gray-300 font-mono">Azure AD SSO</span>
            <span class="text-[10px] text-[#5cb85c] font-semibold ml-1">conectado</span>
          </div>

          <!-- Notifications -->
          <button class="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#2d3045] text-gray-400 hover:text-white transition-colors">
            <lucide-icon [img]="Bell" size="16" />
            <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <!-- Settings -->
          <button class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#2d3045] text-gray-400 hover:text-white transition-colors">
            <lucide-icon [img]="Settings" size="16" />
          </button>

          <!-- User dropdown -->
          <div class="relative" [class]="menuOpen ? 'z-30' : ''">
            <button
              (click)="toggleMenu()"
              class="flex items-center gap-2 hover:bg-[#2d3045] rounded-md px-2 py-1 transition-colors"
            >
              <div class="w-7 h-7 rounded-full bg-[#5cb85c] flex items-center justify-center text-white text-xs font-bold">
                {{ user()?.avatar }}
              </div>
              <div class="text-left hidden sm:block">
                <div class="text-white text-xs font-medium leading-tight">{{ user()?.name }}</div>
                <div class="text-[10px] text-[#5cb85c] font-semibold uppercase tracking-wide">{{ user()?.role }}</div>
              </div>
              <lucide-icon [img]="ChevronDown" size="12" class="text-gray-400" />
            </button>

            @if (menuOpen) {
              <div class="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-40">
                <div class="px-4 py-2 border-b border-gray-100">
                  <div class="text-sm font-semibold text-gray-800">{{ user()?.name }}</div>
                  <div class="text-xs text-gray-500">{{ user()?.email }}</div>
                </div>
                <button
                  (click)="logout()"
                  class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cerrar sesión
                </button>
              </div>
            }
          </div>
        </div>
      </header>

      <!-- Horizontal Nav Bar -->
      <nav class="bg-[#212330] border-b border-[#2d3045] shrink-0 z-10">
        <div class="flex items-stretch px-4 h-11 gap-1">
          @for (item of navItems; track item.id) {
            <a
              [routerLink]="item.path"
              routerLinkActive="nav-item-active"
              class="nav-item px-4 py-2 text-sm font-medium rounded-none border-b-2 border-transparent text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all"
            >
              {{ item.label }}
            </a>
          }
        </div>
      </nav>

      <!-- Page Content -->
      <main class="flex-1 overflow-auto">
        <router-outlet />
      </main>
    </div>
  `,
})
export class LayoutComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly FlaskConical = FlaskConical;
  readonly Search = Search;
  readonly Wifi = Wifi;
  readonly Bell = Bell;
  readonly Settings = Settings;
  readonly ChevronDown = ChevronDown;

  user = this.auth.currentUser;
  menuOpen = false;

  navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'bookings', label: 'Reservas', path: '/bookings' },
    { id: 'catalog', label: 'Catálogo de Recursos', path: '/catalog' },
    { id: 'reports', label: 'Reportería', path: '/reports' },
    { id: 'audit', label: 'Auditoría', path: '/audit' },
  ];

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  async logout(): Promise<void> {
    this.menuOpen = false;
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}

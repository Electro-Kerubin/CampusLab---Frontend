import { Component, inject, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import {
  Booking,
  BookingStatus,
  CreateBookingRequest,
  STATUS_LABELS,
  STATUS_CLASSES,
  ALL_STATUSES,
} from '../models';
import {
  LucideAngularModule,
  Plus,
  Search,
  Filter,
  ChevronRight,
  X,
} from 'lucide-angular';

@Component({
  selector: 'app-new-reservation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div class="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 class="font-bold text-gray-900">Nueva Reserva</h2>
          <button (click)="close.emit()" class="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg">
            <lucide-icon [img]="X" size="18" />
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">Laboratorio</label>
            <select [(ngModel)]="lab" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50">
              <option value="" disabled>Selecciona un laboratorio…</option>
              @for (l of labOptions(); track l) {
                <option [value]="l">{{ l }}</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">Equipamiento requerido</label>
            <input type="text" [(ngModel)]="equipment" placeholder="Ej: Impresora 3D Ultimaker, Microscopio..." class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Fecha</label>
              <input type="date" [(ngModel)]="date" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Horario</label>
              <select [(ngModel)]="time" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50">
                <option>08:00 – 10:00</option>
                <option>10:00 – 12:00</option>
                <option>14:00 – 16:00</option>
                <option>16:00 – 18:00</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">Propósito / Descripción</label>
            <textarea rows="3" [(ngModel)]="purpose" placeholder="Describe brevemente el uso requerido..." class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50 resize-none"></textarea>
          </div>
        </div>
        <div class="flex gap-3 p-6 border-t border-gray-100 pt-4">
          <button (click)="close.emit()" class="flex-1 border border-gray-200 text-gray-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            (click)="submit()"
            [disabled]="!lab || !date"
            class="flex-1 bg-[#5cb85c] hover:bg-[#449d44] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            Enviar Solicitud
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NewReservationModalComponent {
  private dataService = inject(DataService);
  private auth = inject(AuthService);

  readonly X = X;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<CreateBookingRequest>();

  lab = '';
  equipment = '';
  date = new Date().toISOString().slice(0, 10);
  time = '08:00 – 10:00';
  purpose = '';

  labOptions = computed(() =>
    this.dataService.labs().map((l) => `${l.name} — ${l.type}`)
  );

  submit(): void {
    this.saved.emit({
      lab: this.lab,
      equipment: this.equipment,
      date: this.date,
      time: this.time,
      purpose: this.purpose,
      requester: this.auth.currentUser()?.name,
    });
  }
}

@Component({
  selector: 'app-bookings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, NewReservationModalComponent],
  template: `
    <div class="p-6">
      @if (showModal()) {
        <app-new-reservation-modal (close)="showModal.set(false)" (saved)="onSaved($event)" />
      }

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Gestión de Reservas</h1>
          <p class="text-sm text-gray-500 mt-0.5">ms-campuslab-bookings · /api/bookings/*</p>
        </div>
        <button
          (click)="showModal.set(true)"
          class="flex items-center gap-2 bg-[#5cb85c] hover:bg-[#449d44] text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors shadow-sm"
        >
          <lucide-icon [img]="Plus" size="16" /> Nueva Reserva
        </button>
      </div>

      <!-- Status filter chips -->
      <div class="flex flex-wrap gap-2 mb-4">
        <button
          (click)="filterStatus.set('ALL')"
          class="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
          [class]="filterStatus() === 'ALL'
            ? 'bg-[#1a1d2e] text-white border-[#1a1d2e]'
            : 'text-gray-600 border-gray-200 hover:border-gray-400'"
        >
          Todas ({{ data.bookings().length }})
        </button>
        @for (s of allStatuses; track s) {
          <button
            (click)="toggleStatusFilter(s)"
            class="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
            [class]="filterStatus() === s ? statusClass(s) : 'text-gray-500 border-gray-200 hover:border-gray-300'"
          >
            {{ statusLabel(s) }} ({{ counts()[s] ?? 0 }})
          </button>
        }
      </div>

      <!-- Search bar -->
      <div class="flex gap-3 mb-4">
        <div class="relative flex-1 max-w-sm">
          <lucide-icon [img]="Search" size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
            placeholder="Buscar por ID, lab, solicitante..."
            class="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-white"
          />
        </div>
        <button class="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:border-gray-400 transition-colors bg-white">
          <lucide-icon [img]="Filter" size="14" /> Filtros
        </button>
      </div>

      <!-- Table -->
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID Reserva</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Laboratorio</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Equipamiento</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Solicitante</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Fecha / Hora</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (b of filtered(); track b.id) {
                <tr
                  (click)="toggleSelected(b)"
                  class="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td class="px-4 py-3">
                    <span class="font-mono text-xs text-gray-500">{{ b.id }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="font-medium text-gray-900">{{ b.lab }}</span>
                  </td>
                  <td class="px-4 py-3 hidden md:table-cell text-gray-600 text-xs">{{ b.equipment }}</td>
                  <td class="px-4 py-3 hidden lg:table-cell">
                    <div class="text-gray-900 text-xs font-medium">{{ b.requester }}</div>
                    <div class="text-gray-400 text-[10px]">{{ b.role }}</div>
                  </td>
                  <td class="px-4 py-3 hidden lg:table-cell">
                    <div class="text-gray-900 text-xs">{{ b.date }}</div>
                    <div class="text-gray-400 text-[10px] font-mono">{{ b.time }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold" [class]="statusClass(b.status)">
                      {{ statusLabel(b.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <lucide-icon [img]="ChevronRight" size="14" class="text-gray-300" />
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (filtered().length === 0) {
            <div class="py-12 text-center text-gray-400 text-sm">No hay reservas que coincidan con los filtros</div>
          }
        </div>

        <!-- Detail panel -->
        @if (selected(); as sel) {
          <div class="border-t border-gray-200 bg-blue-50/40 p-5">
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-semibold text-gray-800 text-sm">{{ sel.id }} — Detalle</h4>
              <button (click)="selected.set(null)" class="text-gray-400 hover:text-gray-600">
                <lucide-icon [img]="X" size="14" />
              </button>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div><p class="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Laboratorio</p><p class="text-sm font-medium text-gray-800">{{ sel.lab }}</p></div>
              <div><p class="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Equipamiento</p><p class="text-sm font-medium text-gray-800">{{ sel.equipment }}</p></div>
              <div><p class="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Solicitante</p><p class="text-sm font-medium text-gray-800">{{ sel.requester }}</p></div>
              <div><p class="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Horario</p><p class="text-sm font-medium text-gray-800">{{ sel.date }} · {{ sel.time }}</p></div>
            </div>
            <div class="flex gap-2 flex-wrap">
              @for (s of transitionStatuses; track s) {
                <button
                  (click)="changeStatus(sel.id, s)"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:opacity-80"
                  [class]="statusClass(s)"
                >
                  → {{ s }}
                </button>
              }
            </div>
          </div>
        }
      </div>

      <p class="text-xs text-gray-400 mt-3 font-mono">PUT /api/bookings/&#123;id&#125;/status · POST /api/bookings · GET /api/bookings?status=...</p>
    </div>
  `,
})
export class BookingsPageComponent {
  private dataService = inject(DataService);
  readonly Plus = Plus;
  readonly Search = Search;
  readonly Filter = Filter;
  readonly ChevronRight = ChevronRight;
  readonly X = X;

  data = this.dataService;

  search = signal('');
  filterStatus = signal<BookingStatus | 'ALL'>('ALL');
  showModal = signal(false);
  selected = signal<Booking | null>(null);

  allStatuses: BookingStatus[] = ALL_STATUSES;
  transitionStatuses: BookingStatus[] = [
    'APROBADA',
    'EN_PREPARACIÓN',
    'EN_USO',
    'DEVUELTA',
    'CANCELADA',
  ];

  statusLabel(s: BookingStatus): string {
    return STATUS_LABELS[s];
  }
  statusClass(s: BookingStatus): string {
    return STATUS_CLASSES[s];
  }

  counts = computed<Record<string, number>>(() => {
    const acc: Record<string, number> = {};
    for (const s of ALL_STATUSES) {
      acc[s] = this.dataService.bookings().filter((b) => b.status === s).length;
    }
    return acc;
  });

  filtered = computed<Booking[]>(() => {
    const term = this.search().toLowerCase();
    const status = this.filterStatus();
    return this.dataService.bookings().filter((b) => {
      const matchSearch =
        b.lab.toLowerCase().includes(term) ||
        b.requester.toLowerCase().includes(term) ||
        b.id.toLowerCase().includes(term);
      const matchStatus = status === 'ALL' || b.status === status;
      return matchSearch && matchStatus;
    });
  });

  toggleStatusFilter(s: BookingStatus): void {
    this.filterStatus.update((cur) => (cur === s ? 'ALL' : s));
  }

  toggleSelected(b: Booking): void {
    this.selected.update((cur) => (cur?.id === b.id ? null : b));
  }

  onSaved(payload: CreateBookingRequest): void {
    this.dataService.createBooking(payload).subscribe({
      next: () => {
        this.showModal.set(false);
        this.dataService.refreshBookings();
      },
      error: (err) => console.error('Error al crear reserva:', err),
    });
  }

  changeStatus(id: string, status: BookingStatus): void {
    this.dataService.updateBookingStatus(id, status).subscribe({
      next: () => this.dataService.refreshBookings(),
      error: (err) => console.error('Error al actualizar estado:', err),
    });
  }
}

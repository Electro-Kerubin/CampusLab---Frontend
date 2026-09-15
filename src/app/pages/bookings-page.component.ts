import { Component, inject, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import {
  Booking,
  BookingStatus,
  CreateBookingRequest,
  STATUS_LABELS,
  STATUS_CLASSES,
  ALL_STATUSES,
  VALID_TRANSITIONS,
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
          @if (error()) {
            <div class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {{ error() }}
            </div>
          }
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">ID del recurso (laboratorio/equipo)</label>
            <input
              type="number"
              min="1"
              [(ngModel)]="resourceId"
              placeholder="Ej: 101"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50"
            />
            <p class="text-[11px] text-gray-400 mt-1">ID del recurso en ms-campuslab-catalog.</p>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Fecha</label>
              <input type="date" [(ngModel)]="date" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Desde</label>
              <input type="time" [(ngModel)]="startHour" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Hasta</label>
              <input type="time" [(ngModel)]="endHour" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
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
            [disabled]="!canSubmit() || submitting()"
            class="flex-1 bg-[#5cb85c] hover:bg-[#449d44] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            {{ submitting() ? 'Enviando…' : 'Enviar Solicitud' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NewReservationModalComponent {
  readonly X = X;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<CreateBookingRequest>();

  resourceId: number | null = null;
  date = new Date().toISOString().slice(0, 10);
  startHour = '09:00';
  endHour = '11:00';
  purpose = '';

  submitting = signal(false);
  error = signal<string | null>(null);

  canSubmit = computed(
    () => !!this.resourceId && !!this.date && !!this.startHour && !!this.endHour && !!this.purpose.trim()
  );

  submit(): void {
    this.error.set(null);

    if (this.endHour <= this.startHour) {
      this.error.set('La hora de término debe ser posterior a la hora de inicio.');
      return;
    }

    this.saved.emit({
      resourceId: this.resourceId as number,
      purpose: this.purpose.trim(),
      startTime: `${this.date}T${this.startHour}:00`,
      endTime: `${this.date}T${this.endHour}:00`,
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

      @if (data.usingFallback()) {
        <div class="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          ⚠️ No se pudo contactar al backend — mostrando datos de demostración.
        </div>
      }

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
            placeholder="Buscar por ID, recurso, solicitante..."
            class="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-white"
          />
        </div>
        <button (click)="data.refreshBookings()" class="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:border-gray-400 transition-colors bg-white">
          <lucide-icon [img]="Filter" size="14" /> Refrescar
        </button>
      </div>

      <!-- Table -->
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recurso</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Solicitante</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Propósito</th>
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
                    <span class="font-mono text-xs text-gray-500">#{{ b.id }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="font-medium text-gray-900">{{ b.resourceNombre || ('Recurso #' + b.resourceId) }}</span>
                  </td>
                  <td class="px-4 py-3 hidden lg:table-cell">
                    <div class="text-gray-900 text-xs font-medium">{{ b.studentEmail }}</div>
                  </td>
                  <td class="px-4 py-3 hidden md:table-cell text-gray-600 text-xs">{{ b.purpose }}</td>
                  <td class="px-4 py-3 hidden lg:table-cell">
                    <div class="text-gray-900 text-xs">{{ b.startTime | date: 'dd-MM-yyyy' }}</div>
                    <div class="text-gray-400 text-[10px] font-mono">{{ b.startTime | date: 'HH:mm' }}–{{ b.endTime | date: 'HH:mm' }}</div>
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
              <h4 class="font-semibold text-gray-800 text-sm">Reserva #{{ sel.id }} — Detalle</h4>
              <button (click)="selected.set(null)" class="text-gray-400 hover:text-gray-600">
                <lucide-icon [img]="X" size="14" />
              </button>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div><p class="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Recurso</p><p class="text-sm font-medium text-gray-800">{{ sel.resourceNombre || ('Recurso #' + sel.resourceId) }}</p></div>
              <div><p class="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Solicitante</p><p class="text-sm font-medium text-gray-800">{{ sel.studentEmail }}</p></div>
              <div><p class="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Propósito</p><p class="text-sm font-medium text-gray-800">{{ sel.purpose }}</p></div>
              <div><p class="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Horario</p><p class="text-sm font-medium text-gray-800">{{ sel.startTime | date: 'dd-MM-yyyy HH:mm' }} – {{ sel.endTime | date: 'HH:mm' }}</p></div>
            </div>

            @if (statusError(); as err) {
              <div class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{{ err }}</div>
            }

            <div class="flex gap-2 flex-wrap">
              @for (s of transitionsFor(sel.status); track s) {
                <button
                  (click)="changeStatus(sel.id, s)"
                  [disabled]="changingStatus()"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:opacity-80 disabled:opacity-50"
                  [class]="statusClass(s)"
                >
                  → {{ statusLabel(s) }}
                </button>
              }
              @if (transitionsFor(sel.status).length === 0) {
                <p class="text-xs text-gray-400">{{ statusLabel(sel.status) }} es un estado final: no admite más transiciones.</p>
              }
            </div>
          </div>
        }
      </div>

      <p class="text-xs text-gray-400 mt-3 font-mono">POST /api/bookings · GET /api/bookings?status=&amp;from=&amp;to= · PUT /api/bookings/&#123;id&#125;/status</p>
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
  changingStatus = signal(false);
  statusError = signal<string | null>(null);

  allStatuses: BookingStatus[] = ALL_STATUSES;

  statusLabel(s: BookingStatus): string {
    return STATUS_LABELS[s];
  }
  statusClass(s: BookingStatus): string {
    return STATUS_CLASSES[s];
  }
  /** Transiciones válidas desde el estado actual, según la máquina de estados real del backend. */
  transitionsFor(s: BookingStatus): BookingStatus[] {
    return VALID_TRANSITIONS[s];
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
        (b.resourceNombre ?? '').toLowerCase().includes(term) ||
        b.studentEmail.toLowerCase().includes(term) ||
        String(b.id).includes(term) ||
        String(b.resourceId).includes(term);
      const matchStatus = status === 'ALL' || b.status === status;
      return matchSearch && matchStatus;
    });
  });

  toggleStatusFilter(s: BookingStatus): void {
    this.filterStatus.update((cur) => (cur === s ? 'ALL' : s));
  }

  toggleSelected(b: Booking): void {
    this.statusError.set(null);
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

  changeStatus(id: number, status: BookingStatus): void {
    this.statusError.set(null);
    this.changingStatus.set(true);
    this.dataService.updateBookingStatus(id, status).subscribe({
      next: (updated) => {
        this.changingStatus.set(false);
        this.selected.set(updated);
      },
      error: (err) => {
        this.changingStatus.set(false);
        console.error('Error al actualizar estado:', err);
        this.statusError.set(
          err?.error?.message || 'No se pudo cambiar el estado de la reserva.'
        );
      },
    });
  }
}

import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { EventType } from '../models';
import {
  LucideAngularModule,
  Search,
  Filter,
  CheckCircle,
  Clock,
  UserCheck,
  Package,
  RotateCcw,
  XCircle,
} from 'lucide-angular';

interface EventCfg {
  icon: typeof Clock;
  color: string;
  bg: string;
  text: string;
}

const EVENT_CONFIG: Record<EventType, EventCfg> = {
  CREADA: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  APROBADA: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', text: 'text-green-700' },
  EN_PREPARACION: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-100', text: 'text-blue-700' },
  EN_USO: { icon: UserCheck, color: 'text-cyan-600', bg: 'bg-cyan-100', text: 'text-cyan-700' },
  DEVUELTA: { icon: RotateCcw, color: 'text-gray-600', bg: 'bg-gray-100', text: 'text-gray-600' },
  CANCELADA: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', text: 'text-red-700' },
  MODIFICADA: { icon: CheckCircle, color: 'text-orange-600', bg: 'bg-orange-100', text: 'text-orange-700' },
};

const EVENT_TYPES: EventType[] = [
  'CREADA',
  'APROBADA',
  'EN_PREPARACION',
  'EN_USO',
  'DEVUELTA',
  'CANCELADA',
];

@Component({
  selector: 'app-audit-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
  ],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Auditoría y Trazabilidad</h1>
          <p class="text-sm text-gray-500 mt-0.5">ms-campuslab-audit · Kafka topic: audit.timeline · /api/audit/* (read-only)</p>
        </div>
        <div class="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
          <div class="w-2 h-2 rounded-full bg-[#5cb85c] animate-pulse"></div>
          Escuchando eventos Kafka
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3 mb-5">
        <div class="relative flex-1 min-w-48 max-w-sm">
          <lucide-icon [img]="Search" size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
            placeholder="Buscar por reserva, usuario, laboratorio..."
            class="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-white"
          />
        </div>
        <select
          [ngModel]="filterType()"
          (ngModelChange)="onTypeChange($event)"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-white text-gray-600"
        >
          <option value="ALL">Todos los eventos</option>
          @for (t of eventTypes; track t) {
            <option [value]="t">{{ t }}</option>
          }
        </select>
        <input type="date" value="2026-09-10" class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-white text-gray-600" />
        <input type="date" value="2026-09-12" class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-white text-gray-600" />
        <button class="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors bg-white">
          <lucide-icon [img]="Filter" size="14" /> Filtrar
        </button>
      </div>

      <!-- Stats summary -->
      <div class="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
        @for (tipo of eventTypes; track tipo) {
          <button
            (click)="toggleTypeFilter(tipo)"
            class="flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-all"
            [class]="filterType() === tipo
              ? eventBg(tipo) + ' border-current ' + eventText(tipo)
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'"
          >
            <lucide-icon [img]="eventIcon(tipo)" size="16"
                          [class]="filterType() === tipo ? eventColor(tipo) : 'text-gray-400'" />
            <span class="font-bold text-lg leading-none">{{ countByType(tipo) }}</span>
            <span class="text-[9px] uppercase text-center leading-tight">{{ tipo.replace('_', ' ') }}</span>
          </button>
        }
      </div>

      <!-- Timeline -->
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div class="border-b border-gray-100 px-4 py-2.5 bg-gray-50 flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Timeline de Eventos</span>
          <span class="text-xs text-gray-400">{{ filtered().length }} eventos</span>
        </div>

        <div class="divide-y divide-gray-100">
          @for (ev of filtered(); track ev.id) {
            <div class="hover:bg-gray-50 transition-colors">
              <button
                class="w-full text-left px-4 py-3 flex items-center gap-4"
                (click)="toggleExpanded(ev.id)"
              >
                <!-- Icon -->
                <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" [class]="eventBg(ev.tipo)">
                  <lucide-icon [img]="eventIcon(ev.tipo)" size="14" [class]="eventColor(ev.tipo)" />
                </div>

                <!-- Main info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-xs text-gray-400">{{ ev.reservaId }}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="eventBg(ev.tipo) + ' ' + eventText(ev.tipo)">{{ ev.tipo }}</span>
                    <span class="text-xs text-gray-600 font-medium">{{ ev.lab }}</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-0.5 truncate">{{ ev.detalle }}</p>
                </div>

                <!-- User + time -->
                <div class="text-right shrink-0 hidden md:block">
                  <div class="text-xs font-medium text-gray-700">{{ ev.usuario }}</div>
                  <div class="text-[10px] text-gray-400">{{ ev.rol }}</div>
                </div>
                <div class="text-right shrink-0">
                  <div class="text-[10px] font-mono text-gray-400">{{ ev.timestamp.split(' ')[1] }}</div>
                  <div class="text-[10px] text-gray-300">{{ ev.timestamp.split(' ')[0] }}</div>
                </div>
              </button>

              <!-- Expanded detail -->
              @if (expanded() === ev.id) {
                <div class="px-4 pb-4 pt-0 bg-gray-50/60 border-t border-gray-100">
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-xs">
                    <div>
                      <p class="text-gray-400 uppercase font-semibold text-[10px] mb-0.5">Evento ID</p>
                      <p class="font-mono text-gray-600">{{ ev.id }}</p>
                    </div>
                    <div>
                      <p class="text-gray-400 uppercase font-semibold text-[10px] mb-0.5">Trace ID</p>
                      <p class="font-mono text-gray-600">{{ ev.traceId }}</p>
                    </div>
                    <div>
                      <p class="text-gray-400 uppercase font-semibold text-[10px] mb-0.5">IP origen</p>
                      <p class="font-mono text-gray-600">{{ ev.ip }}</p>
                    </div>
                    <div>
                      <p class="text-gray-400 uppercase font-semibold text-[10px] mb-0.5">Timestamp</p>
                      <p class="font-mono text-gray-600">{{ ev.timestamp }}</p>
                    </div>
                    <div class="col-span-2 md:col-span-4">
                      <p class="text-gray-400 uppercase font-semibold text-[10px] mb-0.5">Detalle del evento</p>
                      <p class="text-gray-700">{{ ev.detalle }}</p>
                    </div>
                  </div>
                  <div class="mt-3 flex items-center gap-2">
                    <div class="flex items-center gap-1.5 text-[10px] text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded font-mono">
                      Kafka · audit.timeline · partition 0
                    </div>
                  </div>
                </div>
              }
            </div>
          }
          @if (filtered().length === 0) {
            <div class="py-12 text-center text-gray-400 text-sm">No hay eventos que coincidan con los filtros</div>
          }
        </div>
      </div>

      <p class="text-xs text-gray-400 mt-3 font-mono">GET /api/audit?userId=...&from=...&to=...&tipo=... · Kafka topic: audit.timeline (compact,delete · 14–30 días)</p>
    </div>
  `,
})
export class AuditPageComponent {
  private dataService = inject(DataService);

  readonly Search = Search;
  readonly Filter = Filter;
  readonly CheckCircle = CheckCircle;
  readonly Clock = Clock;
  readonly UserCheck = UserCheck;
  readonly Package = Package;
  readonly RotateCcw = RotateCcw;
  readonly XCircle = XCircle;

  data = this.dataService;

  search = signal('');
  filterType = signal<EventType | 'ALL'>('ALL');
  expanded = signal<string | null>(null);

  eventTypes: EventType[] = EVENT_TYPES;

  eventIcon = (t: EventType) => EVENT_CONFIG[t].icon;
  eventColor = (t: EventType) => EVENT_CONFIG[t].color;
  eventBg = (t: EventType) => EVENT_CONFIG[t].bg;
  eventText = (t: EventType) => EVENT_CONFIG[t].text;

  countByType(t: EventType): number {
    return this.dataService.auditEvents().filter((e) => e.tipo === t).length;
  }

  filtered = computed(() => {
    const term = this.search().toLowerCase();
    const type = this.filterType();
    return this.dataService.auditEvents().filter((e) => {
      const matchSearch =
        e.reservaId.toLowerCase().includes(term) ||
        e.usuario.toLowerCase().includes(term) ||
        e.lab.toLowerCase().includes(term);
      const matchType = type === 'ALL' || e.tipo === type;
      return matchSearch && matchType;
    });
  });

  toggleExpanded(id: string): void {
    this.expanded.update((cur) => (cur === id ? null : id));
  }

  toggleTypeFilter(t: EventType): void {
    this.filterType.update((cur) => (cur === t ? 'ALL' : t));
  }

  onTypeChange(value: string): void {
    if (value === 'ALL') {
      this.filterType.set('ALL');
    } else {
      this.filterType.set(value as EventType);
    }
  }
}

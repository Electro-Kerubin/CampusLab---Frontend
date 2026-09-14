import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { CatalogTab } from '../models';
import {
  LucideAngularModule,
  Plus,
  Search,
  Edit2,
  FlaskConical,
  Cpu,
  Package,
} from 'lucide-angular';

const STATUS_COLOR: Record<string, string> = {
  Disponible: 'bg-green-100 text-green-700',
  Ocupado: 'bg-blue-100 text-blue-700',
  Parcial: 'bg-yellow-100 text-yellow-700',
  'En Mantenimiento': 'bg-orange-100 text-orange-700',
  Mantenimiento: 'bg-orange-100 text-orange-700',
  'En Uso': 'bg-blue-100 text-blue-700',
};

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Catálogo de Recursos</h1>
          <p class="text-sm text-gray-500 mt-0.5">ms-campuslab-catalog · /api/catalog/*</p>
        </div>
        <button class="flex items-center gap-2 bg-[#5cb85c] hover:bg-[#449d44] text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors shadow-sm">
          <lucide-icon [img]="Plus" size="16" /> Agregar Recurso
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5 w-fit">
        @for (t of tabs(); track t.id) {
          <button
            (click)="tab.set(t.id)"
            class="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
            [class]="tab() === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          >
            <lucide-icon [img]="t.icon" size="14" />
            {{ t.label }}
            <span class="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                  [class]="tab() === t.id ? 'bg-[#5cb85c] text-white' : 'bg-gray-200 text-gray-500'">
              {{ t.count }}
            </span>
          </button>
        }
      </div>

      <!-- Search -->
      <div class="relative mb-4 max-w-sm">
        <lucide-icon [img]="Search" size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
          [placeholder]="searchPlaceholder()"
          class="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-white"
        />
      </div>

      <!-- Labs grid -->
      @if (tab() === 'labs') {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          @for (lab of filteredLabs(); track lab.id) {
            <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <span class="text-xs font-mono text-gray-400">{{ lab.id }}</span>
                  <h3 class="font-semibold text-gray-900 text-sm mt-0.5">{{ lab.name }}</h3>
                </div>
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full" [class]="statusColor(lab.status)">
                  {{ lab.status }}
                </span>
              </div>
              <div class="flex items-center gap-2 mb-3">
                <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{{ lab.type }}</span>
                <span class="text-xs text-gray-400">{{ lab.location }}</span>
              </div>

              <!-- Equipment stock bar -->
              <div class="mb-2">
                <div class="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Equipos disponibles</span>
                  <span class="font-semibold text-gray-700">{{ lab.available }}/{{ lab.total }}</span>
                </div>
                <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full bg-[#5cb85c] rounded-full" [style.width.%]="(lab.available / lab.total) * 100"></div>
                </div>
              </div>
              <p class="text-xs text-gray-400">Capacidad: {{ lab.capacity }} personas</p>

              <div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button class="flex-1 text-xs font-medium text-[#5cb85c] hover:text-[#449d44] transition-colors">
                  Ver reservas
                </button>
                <button class="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                  <lucide-icon [img]="Edit2" size="12" /> Editar
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Equipment table -->
      @if (tab() === 'equipment') {
        <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Equipo</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Laboratorio</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (eq of filteredEquipment(); track eq.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 font-mono text-xs text-gray-400">{{ eq.id }}</td>
                    <td class="px-4 py-3 font-medium text-gray-900">{{ eq.name }}</td>
                    <td class="px-4 py-3 hidden md:table-cell text-xs text-gray-500">{{ eq.lab }}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <div class="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div class="h-full bg-[#5cb85c] rounded-full" [style.width.%]="(eq.stock / eq.total) * 100"></div>
                        </div>
                        <span class="text-xs text-gray-600 font-semibold">{{ eq.stock }}/{{ eq.total }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <span class="text-[10px] font-bold px-2.5 py-1 rounded-full" [class]="statusColor(eq.status)">
                        {{ eq.status }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <button class="text-xs text-[#5cb85c] hover:text-[#449d44] font-medium">Editar cupo</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Supplies table -->
      @if (tab() === 'supplies') {
        <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Insumo</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Lab</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stock actual</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stock mínimo</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Alerta</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (sup of filteredSupplies(); track sup.id) {
                  <tr class="hover:bg-gray-50 transition-colors" [class]="sup.stock <= sup.minStock ? 'bg-red-50/40' : ''">
                    <td class="px-4 py-3 font-mono text-xs text-gray-400">{{ sup.id }}</td>
                    <td class="px-4 py-3 font-medium text-gray-900">{{ sup.name }}</td>
                    <td class="px-4 py-3 hidden md:table-cell text-xs text-gray-500">{{ sup.lab }}</td>
                    <td class="px-4 py-3">
                      <span class="font-bold text-sm" [class]="sup.stock <= sup.minStock ? 'text-red-600' : 'text-gray-900'">{{ sup.stock }}</span>
                      <span class="text-xs text-gray-400 ml-1">{{ sup.unit }}</span>
                    </td>
                    <td class="px-4 py-3 text-xs text-gray-500">{{ sup.minStock }} {{ sup.unit }}</td>
                    <td class="px-4 py-3">
                      @if (sup.stock <= sup.minStock) {
                        <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Stock bajo</span>
                      } @else {
                        <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">OK</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <p class="text-xs text-gray-400 mt-3 font-mono">GET /api/catalog/resources · POST /api/catalog/resources · PUT /api/catalog/resources/&#123;id&#125;</p>
    </div>
  `,
})
export class CatalogPageComponent {
  private dataService = inject(DataService);

  readonly Plus = Plus;
  readonly Search = Search;
  readonly Edit2 = Edit2;
  readonly FlaskConical = FlaskConical;
  readonly Cpu = Cpu;
  readonly Package = Package;

  data = this.dataService;

  tab = signal<CatalogTab>('labs');
  search = signal('');

  tabs = computed(() => [
    { id: 'labs' as CatalogTab, label: 'Laboratorios', icon: FlaskConical, count: this.dataService.labs().length },
    { id: 'equipment' as CatalogTab, label: 'Equipos', icon: Cpu, count: this.dataService.equipment().length },
    { id: 'supplies' as CatalogTab, label: 'Insumos', icon: Package, count: this.dataService.supplies().length },
  ]);

  searchPlaceholder = computed(() => {
    const t = this.tab();
    if (t === 'labs') return 'Buscar laboratorios...';
    if (t === 'equipment') return 'Buscar equipos...';
    return 'Buscar insumos...';
  });

  filteredLabs = computed(() => {
    const term = this.search().toLowerCase();
    return this.dataService.labs().filter(
      (l) => l.name.toLowerCase().includes(term) || l.type.toLowerCase().includes(term)
    );
  });

  filteredEquipment = computed(() => {
    const term = this.search().toLowerCase();
    return this.dataService.equipment().filter((e) => e.name.toLowerCase().includes(term));
  });

  filteredSupplies = computed(() => {
    const term = this.search().toLowerCase();
    return this.dataService.supplies().filter((s) => s.name.toLowerCase().includes(term));
  });

  statusColor(status: string): string {
    return STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-500';
  }
}

import { Component, inject, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import {
  CatalogTab,
  ResourceType,
  ResourceStatus,
  RESOURCE_STATUS_LABELS,
  RESOURCE_STATUS_CLASSES,
  LabRequest,
  CreateResourceRequest,
} from '../models';
import {
  LucideAngularModule,
  Plus,
  Search,
  Edit2,
  FlaskConical,
  Cpu,
  Package,
  X,
} from 'lucide-angular';

/** Mapea la pestaña activa al ResourceType real que se crea/filtra. */
const TAB_RESOURCE_TYPE: Record<Exclude<CatalogTab, 'labs'>, ResourceType> = {
  equipment: 'EQUIPO',
  supplies: 'INSUMO',
};

@Component({
  selector: 'app-new-lab-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div class="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 class="font-bold text-gray-900">Nuevo Laboratorio</h2>
          <button (click)="close.emit()" class="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg">
            <lucide-icon [img]="X" size="18" />
          </button>
        </div>
        <div class="p-6 space-y-4">
          @if (error()) {
            <div class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{{ error() }}</div>
          }
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">Nombre</label>
            <input type="text" [(ngModel)]="name" placeholder="Ej: Laboratorio F401" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">Ubicación</label>
            <input type="text" [(ngModel)]="location" placeholder="Ej: Edificio F, Piso 4" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">Capacidad (personas)</label>
            <input type="number" min="0" [(ngModel)]="capacity" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
          </div>
        </div>
        <div class="flex gap-3 p-6 border-t border-gray-100 pt-4">
          <button (click)="close.emit()" class="flex-1 border border-gray-200 text-gray-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
          <button
            (click)="submit()"
            [disabled]="!canSubmit() || submitting()"
            class="flex-1 bg-[#5cb85c] hover:bg-[#449d44] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            {{ submitting() ? 'Creando…' : 'Crear Laboratorio' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NewLabModalComponent {
  readonly X = X;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<LabRequest>();

  name = '';
  location = '';
  capacity: number | null = null;

  submitting = signal(false);
  error = signal<string | null>(null);

  // Método normal (no computed): lee campos planos ligados con ngModel, no
  // signals — un computed() no se recalcularía cuando cambian.
  canSubmit(): boolean {
    return !!this.name.trim() && this.capacity !== null && this.capacity >= 0;
  }

  submit(): void {
    this.error.set(null);
    this.saved.emit({
      name: this.name.trim(),
      location: this.location.trim() || undefined,
      capacity: this.capacity as number,
    });
  }
}

@Component({
  selector: 'app-new-resource-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div class="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 class="font-bold text-gray-900">{{ resourceType === 'EQUIPO' ? 'Nuevo Equipo' : 'Nuevo Insumo' }}</h2>
          <button (click)="close.emit()" class="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg">
            <lucide-icon [img]="X" size="18" />
          </button>
        </div>
        <div class="p-6 space-y-4">
          @if (error()) {
            <div class="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{{ error() }}</div>
          }
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">Nombre</label>
            <input type="text" [(ngModel)]="name" placeholder="Ej: Impresora 3D Ultimaker S5" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">Laboratorio</label>
            <select [(ngModel)]="labId" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50">
              <option [ngValue]="null" disabled>Selecciona un laboratorio…</option>
              @for (lab of labs(); track lab.id) {
                <option [ngValue]="lab.id">{{ lab.name }}</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1.5">Categoría</label>
            <select [(ngModel)]="categoryId" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50">
              <option [ngValue]="null" disabled>Selecciona una categoría…</option>
              @for (cat of categories(); track cat.id) {
                <option [ngValue]="cat.id">{{ cat.name }}</option>
              }
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">{{ resourceType === 'EQUIPO' ? 'Cantidad total *' : 'Stock inicial *' }}</label>
              <input type="number" min="0" [(ngModel)]="quantityTotal" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Umbral de reposición</label>
              <input type="number" min="0" [(ngModel)]="reorderThreshold" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
            </div>
          </div>
          @if (resourceType === 'INSUMO') {
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Unidad de medida *</label>
              <input type="text" [(ngModel)]="unitOfMeasure" placeholder="Ej: kg, caja, botella" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
            </div>
          }
          @if (resourceType === 'EQUIPO') {
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Número de serie *</label>
              <input type="text" [(ngModel)]="serialNumber" placeholder="Ej: UM-S5-001" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
              <p class="text-[11px] text-gray-400 mt-1">Obligatorio y único — así lo exige ms-campuslab-catalog para equipos.</p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Marca</label>
                <input type="text" [(ngModel)]="brand" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Modelo</label>
                <input type="text" [(ngModel)]="model" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5cb85c] bg-gray-50" />
              </div>
            </div>
          }
        </div>
        <div class="flex gap-3 p-6 border-t border-gray-100 pt-4">
          <button (click)="close.emit()" class="flex-1 border border-gray-200 text-gray-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
          <button
            (click)="submit()"
            [disabled]="!canSubmit() || submitting()"
            class="flex-1 bg-[#5cb85c] hover:bg-[#449d44] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            {{ submitting() ? 'Creando…' : 'Crear' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NewResourceModalComponent {
  private dataService = inject(DataService);

  readonly X = X;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<CreateResourceRequest>();

  resourceType: ResourceType = 'EQUIPO';

  name = '';
  labId: number | null = null;
  categoryId: number | null = null;
  quantityTotal: number | null = null;
  reorderThreshold: number | null = null;
  unitOfMeasure = '';
  brand = '';
  model = '';
  serialNumber = '';

  submitting = signal(false);
  error = signal<string | null>(null);

  labs = this.dataService.labs;
  categories = this.dataService.categories;

  // Refleja las validaciones reales de ResourceService en ms-campuslab-catalog:
  // EQUIPO exige quantityTotal + equipment.serialNumber; INSUMO exige
  // quantityTotal + unitOfMeasure. Validar acá evita un viaje al backend
  // solo para recibir un 409 por un campo vacío.
  canSubmit(): boolean {
    if (!this.name.trim() || this.labId === null || this.categoryId === null) return false;
    if (this.quantityTotal === null || this.quantityTotal < 0) return false;
    if (this.resourceType === 'EQUIPO') return !!this.serialNumber.trim();
    if (this.resourceType === 'INSUMO') return !!this.unitOfMeasure.trim();
    return true;
  }

  submit(): void {
    this.error.set(null);
    this.saved.emit({
      labId: this.labId as number,
      categoryId: this.categoryId as number,
      name: this.name.trim(),
      resourceType: this.resourceType,
      quantityTotal: this.quantityTotal ?? undefined,
      reorderThreshold: this.reorderThreshold ?? undefined,
      unitOfMeasure: this.resourceType === 'INSUMO' ? this.unitOfMeasure.trim() || undefined : undefined,
      equipment:
        this.resourceType === 'EQUIPO'
          ? {
              brand: this.brand.trim() || undefined,
              model: this.model.trim() || undefined,
              serialNumber: this.serialNumber.trim(),
            }
          : undefined,
    });
  }
}

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, NewLabModalComponent, NewResourceModalComponent],
  template: `
    <div class="p-6">
      @if (showLabModal()) {
        <app-new-lab-modal (close)="showLabModal.set(false)" (saved)="onLabSaved($event)" />
      }
      @if (showResourceModal()) {
        <app-new-resource-modal (close)="showResourceModal.set(false)" (saved)="onResourceSaved($event)" />
      }

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Catálogo de Recursos</h1>
          <p class="text-sm text-gray-500 mt-0.5">ms-campuslab-catalog · /api/catalog/*</p>
        </div>
        @if (canManageCatalog()) {
          <button
            (click)="openCreateModal()"
            class="flex items-center gap-2 bg-[#5cb85c] hover:bg-[#449d44] text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors shadow-sm"
          >
            <lucide-icon [img]="Plus" size="16" /> {{ tab() === 'labs' ? 'Agregar Laboratorio' : 'Agregar Recurso' }}
          </button>
        }
      </div>

      @if (!canManageCatalog()) {
        <div class="mb-4 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          👁️ Tu rol ({{ auth.currentUser()?.role }}) tiene acceso de solo lectura al catálogo.
        </div>
      }
      @if (actionError()) {
        <div class="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{{ actionError() }}</div>
      }

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
                  <span class="text-xs font-mono text-gray-400">#{{ lab.id }}</span>
                  <h3 class="font-semibold text-gray-900 text-sm mt-0.5">{{ lab.name }}</h3>
                </div>
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  {{ resourceCountForLab(lab.id) }} recursos
                </span>
              </div>
              <p class="text-xs text-gray-400 mb-1">{{ lab.location || 'Sin ubicación registrada' }}</p>
              <p class="text-xs text-gray-400">Capacidad: {{ lab.capacity }} personas</p>
            </div>
          }
          @if (filteredLabs().length === 0) {
            <div class="col-span-full py-12 text-center text-gray-400 text-sm">No hay laboratorios que coincidan con la búsqueda</div>
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
                    <td class="px-4 py-3 font-mono text-xs text-gray-400">#{{ eq.id }}</td>
                    <td class="px-4 py-3 font-medium text-gray-900">{{ eq.name }}</td>
                    <td class="px-4 py-3 hidden md:table-cell text-xs text-gray-500">{{ eq.labName || ('Lab #' + eq.labId) }}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <div class="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div class="h-full bg-[#5cb85c] rounded-full" [style.width.%]="stockPct(eq)"></div>
                        </div>
                        <span class="text-xs text-gray-600 font-semibold">{{ eq.quantityAvailable ?? 0 }}/{{ eq.quantityTotal ?? 0 }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <span class="text-[10px] font-bold px-2.5 py-1 rounded-full" [class]="statusClass(eq.status)">
                        {{ statusLabel(eq.status) }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      @if (canAdjustStock()) {
                        <button (click)="promptAdjustStock(eq.id, eq.name)" class="text-xs text-[#5cb85c] hover:text-[#449d44] font-medium">Ajustar stock</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (filteredEquipment().length === 0) {
            <div class="py-12 text-center text-gray-400 text-sm">No hay equipos que coincidan con la búsqueda</div>
          }
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
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Umbral reposición</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Alerta</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (sup of filteredSupplies(); track sup.id) {
                  <tr class="hover:bg-gray-50 transition-colors" [class]="isLowStock(sup) ? 'bg-red-50/40' : ''">
                    <td class="px-4 py-3 font-mono text-xs text-gray-400">#{{ sup.id }}</td>
                    <td class="px-4 py-3 font-medium text-gray-900">{{ sup.name }}</td>
                    <td class="px-4 py-3 hidden md:table-cell text-xs text-gray-500">{{ sup.labName || ('Lab #' + sup.labId) }}</td>
                    <td class="px-4 py-3">
                      <span class="font-bold text-sm" [class]="isLowStock(sup) ? 'text-red-600' : 'text-gray-900'">{{ sup.quantityAvailable ?? 0 }}</span>
                      <span class="text-xs text-gray-400 ml-1">{{ sup.unitOfMeasure }}</span>
                    </td>
                    <td class="px-4 py-3 text-xs text-gray-500">{{ sup.reorderThreshold ?? 0 }} {{ sup.unitOfMeasure }}</td>
                    <td class="px-4 py-3">
                      @if (isLowStock(sup)) {
                        <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Stock bajo</span>
                      } @else {
                        <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">OK</span>
                      }
                    </td>
                    <td class="px-4 py-3">
                      @if (canAdjustStock()) {
                        <button (click)="promptAdjustStock(sup.id, sup.name)" class="text-xs text-[#5cb85c] hover:text-[#449d44] font-medium">Ajustar stock</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (filteredSupplies().length === 0) {
            <div class="py-12 text-center text-gray-400 text-sm">No hay insumos que coincidan con la búsqueda</div>
          }
        </div>
      }

      <p class="text-xs text-gray-400 mt-3 font-mono">GET /api/catalog/resources · POST /api/catalog/resources · PUT /api/catalog/resources/&#123;id&#125;/stock</p>
    </div>
  `,
})
export class CatalogPageComponent {
  private dataService = inject(DataService);
  auth = inject(AuthService);

  readonly Plus = Plus;
  readonly Search = Search;
  readonly Edit2 = Edit2;
  readonly FlaskConical = FlaskConical;
  readonly Cpu = Cpu;
  readonly Package = Package;

  data = this.dataService;

  /** Igual que @PreAuthorize("hasRole('ADMIN')") en el backend (crear/editar labs y recursos). */
  canManageCatalog(): boolean {
    return this.auth.hasRole('ADMIN');
  }

  /** Igual que @PreAuthorize("hasAnyRole('ADMIN','TECNICO')") en el backend (ajustar stock). */
  canAdjustStock(): boolean {
    return this.auth.hasAnyRole('ADMIN', 'TECNICO');
  }

  tab = signal<CatalogTab>('labs');
  search = signal('');
  showLabModal = signal(false);
  showResourceModal = signal(false);
  actionError = signal<string | null>(null);

  tabs = computed(() => [
    { id: 'labs' as CatalogTab, label: 'Laboratorios', icon: this.FlaskConical, count: this.dataService.labs().length },
    { id: 'equipment' as CatalogTab, label: 'Equipos', icon: this.Cpu, count: this.dataService.equipment().length },
    { id: 'supplies' as CatalogTab, label: 'Insumos', icon: this.Package, count: this.dataService.supplies().length },
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
      (l) => l.name.toLowerCase().includes(term) || (l.location ?? '').toLowerCase().includes(term)
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

  resourceCountForLab(labId: number): number {
    return this.dataService.resources().filter((r) => r.labId === labId).length;
  }

  stockPct(r: { quantityAvailable: number | null; quantityTotal: number | null }): number {
    if (!r.quantityTotal) return 0;
    return ((r.quantityAvailable ?? 0) / r.quantityTotal) * 100;
  }

  isLowStock(r: { quantityAvailable: number | null; reorderThreshold: number | null }): boolean {
    return (r.quantityAvailable ?? 0) <= (r.reorderThreshold ?? 0);
  }

  statusLabel(s: ResourceStatus): string {
    return RESOURCE_STATUS_LABELS[s];
  }
  statusClass(s: ResourceStatus): string {
    return RESOURCE_STATUS_CLASSES[s];
  }

  openCreateModal(): void {
    this.actionError.set(null);
    if (this.tab() === 'labs') {
      this.showLabModal.set(true);
    } else {
      this.showResourceModal.set(true);
    }
  }

  onLabSaved(payload: LabRequest): void {
    this.dataService.createLab(payload).subscribe({
      next: () => this.showLabModal.set(false),
      error: (err) => {
        console.error('Error al crear laboratorio:', err);
        this.actionError.set(err?.error?.message || 'No se pudo crear el laboratorio (¿tu rol tiene permiso de ADMIN?).');
      },
    });
  }

  onResourceSaved(payload: CreateResourceRequest): void {
    const resourceType = TAB_RESOURCE_TYPE[this.tab() as 'equipment' | 'supplies'] ?? 'EQUIPO';
    this.dataService.createResource({ ...payload, resourceType }).subscribe({
      next: () => this.showResourceModal.set(false),
      error: (err) => {
        console.error('Error al crear recurso:', err);
        this.actionError.set(err?.error?.message || 'No se pudo crear el recurso (¿tu rol tiene permiso de ADMIN?).');
      },
    });
  }

  promptAdjustStock(id: number, name: string): void {
    this.actionError.set(null);
    const input = window.prompt(
      `Ajustar stock de "${name}"\nIngresa la cantidad a sumar (positivo) o restar (negativo):`,
      '0'
    );
    if (input === null) return;

    const delta = Number(input);
    if (!Number.isFinite(delta) || delta === 0) {
      this.actionError.set('Ingresa un número distinto de 0.');
      return;
    }

    this.dataService.adjustStock(id, { delta }).subscribe({
      error: (err) => {
        console.error('Error al ajustar stock:', err);
        this.actionError.set(err?.error?.message || 'No se pudo ajustar el stock.');
      },
    });
  }
}

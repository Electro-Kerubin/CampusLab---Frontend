import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Booking,
  Lab,
  CatalogResource,
  Category,
  LabRequest,
  CreateResourceRequest,
  StockAdjustRequest,
  AuditEvent,
  CreateBookingRequest,
  UpdateBookingStatusRequest,
  UsageByHour,
  EquipmentStatusSummary,
  BookingsByHour,
  TopResource,
  StatusDistribution,
  CycleTimePoint,
  ReportKpis,
  WorkflowStep,
  BookingStatus,
  ALL_STATUSES,
} from '../models';

/**
 * Servicio de datos conectado al backend Java Spring Boot.
 *
 * Endpoints consumidos:
 *  - ms-campuslab-bookings  → GET/POST /api/bookings · PUT /api/bookings/{id}/status
 *  - ms-campuslab-catalog   → GET /api/catalog/labs|resources|categories
 *  - ms-campuslab-audit     → GET /api/audit
 *  - ms-campuslab-report    → GET /api/report/*
 *
 * Si el backend no responde, cada colección cae automáticamente en datos
 * semilla para permitir el desarrollo del frontend sin backend levantado.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  // ─── Estado (signals) ─────────────────────────────────────────────────
  readonly bookings = signal<Booking[]>([]);
  readonly labs = signal<Lab[]>([]);
  /** Todos los recursos (SALA/EQUIPO/INSUMO). equipment()/supplies() abajo se derivan de esto. */
  readonly resources = signal<CatalogResource[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly auditEvents = signal<AuditEvent[]>([]);
  readonly usageByHour = signal<UsageByHour[]>([]);
  readonly equipmentStatus = signal<EquipmentStatusSummary[]>([]);
  readonly bookingsByHour = signal<BookingsByHour[]>([]);
  readonly topResources = signal<TopResource[]>([]);
  readonly statusDistribution = signal<StatusDistribution[]>([]);
  readonly cycleTime = signal<CycleTimePoint[]>([]);
  readonly reportKpis = signal<ReportKpis>({
    totalReservas: 0,
    tasaAprobacion: 0,
    tiempoCicloPromedio: 0,
    tasaCancelacion: 0,
  });

  /** True mientras hay peticiones en vuelo */
  readonly loading = signal(false);
  /** True si el backend no respondió y se usan datos semilla */
  readonly usingFallback = signal(false);

  readonly ranges = ['Últimas 24h', 'Últimos 7 días', 'Este mes', 'Último trimestre'];

  constructor() {
    this.reloadAll();
  }

  // ─── Carga inicial ────────────────────────────────────────────────────
  reloadAll(): void {
    this.loading.set(true);
    this.loadBookings();
    this.loadLabs();
    this.loadResources();
    this.loadCategories();
    this.loadAuditEvents();
    this.loadUsageByHour();
    this.loadEquipmentStatus();
    this.loadBookingsByHour();
    this.loadTopResources();
    this.loadStatusDistribution();
    this.loadCycleTime();
    this.loadReportKpis();
  }

  /** Refresca solo reservas y auditoría (las más cambiantes). */
  refreshBookings(): void {
    this.loadBookings();
    this.loadAuditEvents();
  }

  // ─── Bookings: ms-campuslab-bookings ──────────────────────────────────
  loadBookings(status?: BookingStatus): void {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    this.http
      .get<Booking[]>(`${this.api}/bookings${params}`)
      .pipe(catchError(() => this.fallback('bookings', SEED_BOOKINGS)))
      .subscribe((data) => {
        this.bookings.set(data);
        this.loading.set(false);
      });
  }

  createBooking(payload: CreateBookingRequest): Observable<Booking> {
    return this.http.post<Booking>(`${this.api}/bookings`, payload).pipe(
      tap((created) => this.bookings.update((cur) => [created, ...cur]))
    );
  }

  updateBookingStatus(id: number, status: BookingStatus): Observable<Booking> {
    const body: UpdateBookingStatusRequest = { status };
    return this.http
      .put<Booking>(`${this.api}/bookings/${id}/status`, body)
      .pipe(
        tap((updated) =>
          this.bookings.update((cur) => cur.map((b) => (b.id === id ? updated : b)))
        )
      );
  }

  // ─── Catalog: ms-campuslab-catalog ────────────────────────────────────
  loadLabs(): void {
    this.http
      .get<Lab[]>(`${this.api}/catalog/labs`)
      .pipe(catchError(() => this.fallback('catalog/labs', SEED_LABS)))
      .subscribe((data) => this.labs.set(data));
  }

  createLab(payload: LabRequest): Observable<Lab> {
    return this.http
      .post<Lab>(`${this.api}/catalog/labs`, payload)
      .pipe(tap((created) => this.labs.update((cur) => [created, ...cur])));
  }

  /** Todos los recursos, o solo los de un laboratorio si se pasa labId. */
  loadResources(labId?: number): void {
    const params = labId ? `?labId=${labId}` : '';
    this.http
      .get<CatalogResource[]>(`${this.api}/catalog/resources${params}`)
      .pipe(catchError(() => this.fallback('catalog/resources', SEED_RESOURCES)))
      .subscribe((data) => this.resources.set(data));
  }

  createResource(payload: CreateResourceRequest): Observable<CatalogResource> {
    return this.http
      .post<CatalogResource>(`${this.api}/catalog/resources`, payload)
      .pipe(tap((created) => this.resources.update((cur) => [created, ...cur])));
  }

  /** Suma/resta stock (delta positivo o negativo) a un recurso. */
  adjustStock(id: number, payload: StockAdjustRequest): Observable<CatalogResource> {
    return this.http
      .put<CatalogResource>(`${this.api}/catalog/resources/${id}/stock`, payload)
      .pipe(
        tap((updated) =>
          this.resources.update((cur) => cur.map((r) => (r.id === id ? updated : r)))
        )
      );
  }

  loadCategories(): void {
    this.http
      .get<Category[]>(`${this.api}/catalog/categories`)
      .pipe(catchError(() => this.fallback('catalog/categories', SEED_CATEGORIES)))
      .subscribe((data) => this.categories.set(data));
  }

  /** Recursos de tipo EQUIPO, derivados de resources(). */
  readonly equipment = computed(() => this.resources().filter((r) => r.resourceType === 'EQUIPO'));

  /** Recursos de tipo INSUMO, derivados de resources(). */
  readonly supplies = computed(() => this.resources().filter((r) => r.resourceType === 'INSUMO'));

  // ─── Audit: ms-campuslab-audit ────────────────────────────────────────
  loadAuditEvents(filters?: { tipo?: string; userId?: string; from?: string; to?: string }): void {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters ?? {}).filter(([, v]) => !!v)
      ) as Record<string, string>
    ).toString();
    const suffix = qs ? `?${qs}` : '';
    this.http
      .get<AuditEvent[]>(`${this.api}/audit${suffix}`)
      .pipe(catchError(() => this.fallback('audit', SEED_AUDIT_EVENTS)))
      .subscribe((data) => this.auditEvents.set(data));
  }

  // ─── Report: ms-campuslab-report ──────────────────────────────────────
  loadUsageByHour(): void {
    this.http
      .get<UsageByHour[]>(`${this.api}/report/usage-by-hour`)
      .pipe(catchError(() => this.fallback('report/usage-by-hour', SEED_USAGE_BY_HOUR)))
      .subscribe((data) => this.usageByHour.set(data));
  }

  loadEquipmentStatus(): void {
    this.http
      .get<EquipmentStatusSummary[]>(`${this.api}/report/equipment-status`)
      .pipe(catchError(() => this.fallback('report/equipment-status', SEED_EQUIPMENT_STATUS)))
      .subscribe((data) => this.equipmentStatus.set(data));
  }

  loadBookingsByHour(): void {
    this.http
      .get<BookingsByHour[]>(`${this.api}/report/bookings-by-hour`)
      .pipe(catchError(() => this.fallback('report/bookings-by-hour', SEED_BOOKINGS_BY_HOUR)))
      .subscribe((data) => this.bookingsByHour.set(data));
  }

  loadTopResources(): void {
    this.http
      .get<TopResource[]>(`${this.api}/report/top-resources`)
      .pipe(catchError(() => this.fallback('report/top-resources', SEED_TOP_RESOURCES)))
      .subscribe((data) => this.topResources.set(data));
  }

  loadStatusDistribution(): void {
    this.http
      .get<StatusDistribution[]>(`${this.api}/report/status-distribution`)
      .pipe(catchError(() => this.fallback('report/status-distribution', SEED_STATUS_DISTRIBUTION)))
      .subscribe((data) => this.statusDistribution.set(data));
  }

  loadCycleTime(): void {
    this.http
      .get<CycleTimePoint[]>(`${this.api}/report/cycle-time`)
      .pipe(catchError(() => this.fallback('report/cycle-time', SEED_CYCLE_TIME)))
      .subscribe((data) => this.cycleTime.set(data));
  }

  loadReportKpis(): void {
    this.http
      .get<ReportKpis>(`${this.api}/report/kpis`)
      .pipe(catchError(() => this.fallback('report/kpis', SEED_KPIS)))
      .subscribe((data) => this.reportKpis.set(data));
  }

  // ─── Derivados del estado ─────────────────────────────────────────────
  /** Pipeline del flujo de reservas derivado de los estados actuales. */
  readonly workflowSteps = computed<WorkflowStep[]>(() => {
    const bs = this.bookings();
    const count = (s: BookingStatus) => bs.filter((b) => b.status === s).length;
    const activeStatuses: BookingStatus[] = ['SOLICITADA', 'APROBADA', 'EN_PREPARACION', 'EN_USO'];
    const current = activeStatuses
      .map((s) => ({ s, n: count(s) }))
      .sort((a, b) => b.n - a.n)[0]?.s;

    return ALL_STATUSES.filter((s) => s !== 'CANCELADA').map((s) => {
      const n = count(s);
      const isActive = s === current && n > 0;
      return {
        id: s,
        label: s.replace('_', ' '),
        desc: isActive
          ? `${n} reserva(s) en este estado ahora`
          : n > 0
            ? `${n} reserva(s) históricas`
            : 'Sin reservas en este estado',
        active: isActive,
        done: n > 0 && !isActive,
      };
    });
  });

  /** KPIs del dashboard derivados de reservas y equipos. */
  readonly activeBookingsCount = computed(
    () =>
      this.bookings().filter((b) =>
        ['APROBADA', 'EN_PREPARACION', 'EN_USO'].includes(b.status)
      ).length
  );

  readonly pendingApprovalsCount = computed(
    () => this.bookings().filter((b) => b.status === 'SOLICITADA').length
  );

  readonly equipmentOccupancy = computed(() => {
    const eq = this.equipment();
    if (eq.length === 0) return { pct: 0, inUse: 0 };
    const total = eq.reduce((acc, e) => acc + (e.quantityTotal ?? 0), 0);
    const used = eq.reduce((acc, e) => acc + ((e.quantityTotal ?? 0) - (e.quantityAvailable ?? 0)), 0);
    return { pct: total > 0 ? Math.round((used / total) * 100) : 0, inUse: used };
  });

  // ─── Helpers ──────────────────────────────────────────────────────────
  private fallback<T>(endpoint: string, seed: T): Observable<T> {
    console.warn(
      `[CampusLab] Backend no disponible para /${endpoint}. Usando datos de demostración.`
    );
    this.usingFallback.set(true);
    return of(seed);
  }
}

// ─── Datos semilla (fallback sin backend) ─────────────────────────────────
// Mismo shape que BookingResponse de ms-campuslab-bookings (vía el BFF).
const SEED_BOOKINGS: Booking[] = [
  { id: 1, resourceId: 101, resourceNombre: 'Laboratorio A102', studentEmail: 'maria.gonzalez@duocuc.cl', purpose: 'Impresión 3D — proyecto final', startTime: '2026-09-11T09:00:00', endTime: '2026-09-11T11:00:00', status: 'EN_PREPARACION', createdAt: '2026-09-10T18:00:00', updatedAt: '2026-09-11T08:00:00' },
  { id: 2, resourceId: 204, resourceNombre: 'Laboratorio B204', studentEmail: 'carlos.ruiz@duocuc.cl', purpose: 'Microscopía electrónica — práctica', startTime: '2026-09-11T11:00:00', endTime: '2026-09-11T13:00:00', status: 'APROBADA', createdAt: '2026-09-10T12:00:00', updatedAt: '2026-09-10T12:30:00' },
  { id: 3, resourceId: 301, resourceNombre: 'Sala Cómputo C1', studentEmail: 'ana.torres@duocuc.cl', purpose: 'Renderizado de proyecto 3D', startTime: '2026-09-11T14:00:00', endTime: '2026-09-11T16:00:00', status: 'SOLICITADA', createdAt: '2026-09-11T09:00:00', updatedAt: '2026-09-11T09:00:00' },
  { id: 4, resourceId: 102, resourceNombre: 'Laboratorio A102', studentEmail: 'pedro.silva@duocuc.cl', purpose: 'Kit Arduino — prototipo IoT', startTime: '2026-09-10T10:00:00', endTime: '2026-09-10T12:00:00', status: 'EN_USO', createdAt: '2026-09-09T15:00:00', updatedAt: '2026-09-10T10:02:00' },
  { id: 5, resourceId: 401, resourceNombre: 'Laboratorio D301', studentEmail: 'laura.mendez@duocuc.cl', purpose: 'Osciloscopio — medición de señales', startTime: '2026-09-10T08:00:00', endTime: '2026-09-10T10:00:00', status: 'DEVUELTA', createdAt: '2026-09-09T14:00:00', updatedAt: '2026-09-10T10:05:00' },
  { id: 6, resourceId: 302, resourceNombre: 'Sala Cómputo C2', studentEmail: 'jorge.pinto@duocuc.cl', purpose: 'Renderizado de video', startTime: '2026-09-09T15:00:00', endTime: '2026-09-09T17:00:00', status: 'CANCELADA', createdAt: '2026-09-08T10:00:00', updatedAt: '2026-09-09T14:22:00' },
  { id: 7, resourceId: 205, resourceNombre: 'Laboratorio B204', studentEmail: 'sofia.reyes@duocuc.cl', purpose: 'Microscopía óptica — práctica', startTime: '2026-09-12T13:00:00', endTime: '2026-09-12T15:00:00', status: 'SOLICITADA', createdAt: '2026-09-12T07:58:00', updatedAt: '2026-09-12T07:58:00' },
  { id: 8, resourceId: 103, resourceNombre: 'Laboratorio A102', studentEmail: 'andres.vega@duocuc.cl', purpose: 'Impresión 3D — pieza de repuesto', startTime: '2026-09-12T16:00:00', endTime: '2026-09-12T18:00:00', status: 'APROBADA', createdAt: '2026-09-11T20:00:00', updatedAt: '2026-09-12T08:00:00' },
];

// Mismo shape que LabResponseDTO/ResourceResponseDTO/CategoryResponseDTO de
// ms-campuslab-catalog.
const SEED_LABS: Lab[] = [
  { id: 1, name: 'Laboratorio A102', location: 'Edificio A, Piso 1', capacity: 15, createdAt: '2026-01-10T08:00:00' },
  { id: 2, name: 'Laboratorio B204', location: 'Edificio B, Piso 2', capacity: 12, createdAt: '2026-01-10T08:00:00' },
  { id: 3, name: 'Sala Cómputo C1', location: 'Edificio C, Piso 1', capacity: 20, createdAt: '2026-01-10T08:00:00' },
  { id: 4, name: 'Laboratorio D301', location: 'Edificio D, Piso 3', capacity: 18, createdAt: '2026-01-10T08:00:00' },
  { id: 5, name: 'Laboratorio E105', location: 'Edificio E, Piso 1', capacity: 16, createdAt: '2026-01-10T08:00:00' },
];

const SEED_CATEGORIES: Category[] = [
  { id: 1, name: 'Equipos de laboratorio', description: 'Instrumental y equipos reutilizables asignados a un laboratorio', createdAt: '2026-01-10T08:00:00' },
  { id: 2, name: 'Insumos consumibles', description: 'Materiales de uso único o recargable (reactivos, guantes, etc.)', createdAt: '2026-01-10T08:00:00' },
  { id: 3, name: 'Salas', description: 'Espacios físicos reservables dentro de un laboratorio', createdAt: '2026-01-10T08:00:00' },
];

const SEED_RESOURCES: CatalogResource[] = [
  { id: 101, labId: 1, labName: 'Laboratorio A102', categoryId: 1, categoryName: 'Equipos de laboratorio', name: 'Impresora 3D Ultimaker S5', resourceType: 'EQUIPO', status: 'DISPONIBLE', quantityTotal: 3, quantityAvailable: 2, reorderThreshold: 1, brand: 'Ultimaker', model: 'S5', serialNumber: 'UM-S5-001', unitOfMeasure: null, createdAt: '2026-01-12T09:00:00', updatedAt: '2026-01-12T09:00:00' },
  { id: 102, labId: 1, labName: 'Laboratorio A102', categoryId: 1, categoryName: 'Equipos de laboratorio', name: 'Impresora 3D Prusa MK4', resourceType: 'EQUIPO', status: 'EN_USO', quantityTotal: 3, quantityAvailable: 1, reorderThreshold: 1, brand: 'Prusa', model: 'MK4', serialNumber: 'PR-MK4-002', unitOfMeasure: null, createdAt: '2026-01-12T09:00:00', updatedAt: '2026-01-12T09:00:00' },
  { id: 205, labId: 2, labName: 'Laboratorio B204', categoryId: 1, categoryName: 'Equipos de laboratorio', name: 'Microscopio Electrónico Zeiss', resourceType: 'EQUIPO', status: 'DISPONIBLE', quantityTotal: 2, quantityAvailable: 1, reorderThreshold: 1, brand: 'Zeiss', model: null, serialNumber: null, unitOfMeasure: null, createdAt: '2026-01-12T09:00:00', updatedAt: '2026-01-12T09:00:00' },
  { id: 301, labId: 3, labName: 'Sala Cómputo C1', categoryId: 1, categoryName: 'Equipos de laboratorio', name: 'PC Workstation Dell Precision', resourceType: 'EQUIPO', status: 'DISPONIBLE', quantityTotal: 20, quantityAvailable: 14, reorderThreshold: 2, brand: 'Dell', model: 'Precision', serialNumber: null, unitOfMeasure: null, createdAt: '2026-01-12T09:00:00', updatedAt: '2026-01-12T09:00:00' },
  { id: 401, labId: 4, labName: 'Laboratorio D301', categoryId: 1, categoryName: 'Equipos de laboratorio', name: 'Osciloscopio Digital Tektronix', resourceType: 'EQUIPO', status: 'MANTENIMIENTO', quantityTotal: 5, quantityAvailable: 0, reorderThreshold: 1, brand: 'Tektronix', model: null, serialNumber: null, unitOfMeasure: null, createdAt: '2026-01-12T09:00:00', updatedAt: '2026-01-12T09:00:00' },
  { id: 103, labId: 1, labName: 'Laboratorio A102', categoryId: 2, categoryName: 'Insumos consumibles', name: 'Filamento PLA 1.75mm (blanco)', resourceType: 'INSUMO', status: 'DISPONIBLE', quantityTotal: null, quantityAvailable: 12, reorderThreshold: 5, brand: null, model: null, serialNumber: null, unitOfMeasure: 'kg', createdAt: '2026-01-12T09:00:00', updatedAt: '2026-01-12T09:00:00' },
  { id: 104, labId: 1, labName: 'Laboratorio A102', categoryId: 2, categoryName: 'Insumos consumibles', name: 'Filamento PETG 1.75mm (negro)', resourceType: 'INSUMO', status: 'DISPONIBLE', quantityTotal: null, quantityAvailable: 4, reorderThreshold: 5, brand: null, model: null, serialNumber: null, unitOfMeasure: 'kg', createdAt: '2026-01-12T09:00:00', updatedAt: '2026-01-12T09:00:00' },
  { id: 206, labId: 2, labName: 'Laboratorio B204', categoryId: 2, categoryName: 'Insumos consumibles', name: 'Portaobjetos de vidrio (100 uds)', resourceType: 'INSUMO', status: 'DISPONIBLE', quantityTotal: null, quantityAvailable: 8, reorderThreshold: 3, brand: null, model: null, serialNumber: null, unitOfMeasure: 'caja', createdAt: '2026-01-12T09:00:00', updatedAt: '2026-01-12T09:00:00' },
  { id: 501, labId: 5, labName: 'Laboratorio E105', categoryId: 2, categoryName: 'Insumos consumibles', name: 'Guantes de nitrilo (M)', resourceType: 'INSUMO', status: 'DISPONIBLE', quantityTotal: null, quantityAvailable: 2, reorderThreshold: 5, brand: null, model: null, serialNumber: null, unitOfMeasure: 'caja', createdAt: '2026-01-12T09:00:00', updatedAt: '2026-01-12T09:00:00' },
];

const SEED_AUDIT_EVENTS: AuditEvent[] = [
  { id: 'EVT-001', reservaId: 'RES-2024-001', tipo: 'CREADA', usuario: 'María González', rol: 'Estudiante', lab: 'Lab A102', timestamp: '2026-09-11 08:30:14', ip: '192.168.1.45', traceId: 'abc-123-def', detalle: 'Reserva creada vía portal web' },
  { id: 'EVT-002', reservaId: 'RES-2024-001', tipo: 'APROBADA', usuario: 'Rodrigo Muñoz', rol: 'Técnico', lab: 'Lab A102', timestamp: '2026-09-11 08:52:03', ip: '10.0.1.12', traceId: 'abc-124-def', detalle: 'Aprobación manual por técnico de turno' },
  { id: 'EVT-003', reservaId: 'RES-2024-001', tipo: 'EN_PREPARACION', usuario: 'Rodrigo Muñoz', rol: 'Técnico', lab: 'Lab A102', timestamp: '2026-09-11 09:15:22', ip: '10.0.1.12', traceId: 'abc-125-def', detalle: 'Inicio de preparación de sala y equipos' },
  { id: 'EVT-004', reservaId: 'RES-2024-002', tipo: 'CREADA', usuario: 'Carlos Ruiz', rol: 'Técnico', lab: 'Lab B204', timestamp: '2026-09-11 09:00:05', ip: '10.0.1.8', traceId: 'bcd-201-efg', detalle: 'Reserva creada por técnico para clase programada' },
  { id: 'EVT-005', reservaId: 'RES-2024-002', tipo: 'APROBADA', usuario: 'Sistema AD', rol: 'Admin', lab: 'Lab B204', timestamp: '2026-09-11 09:01:00', ip: '10.0.0.1', traceId: 'bcd-202-efg', detalle: 'Aprobación automática (reserva por técnico autorizado)' },
  { id: 'EVT-006', reservaId: 'RES-2024-003', tipo: 'CREADA', usuario: 'Ana Torres', rol: 'Estudiante', lab: 'Sala C1', timestamp: '2026-09-11 09:45:31', ip: '192.168.2.77', traceId: 'cde-301-fgh', detalle: 'Reserva creada vía app móvil' },
  { id: 'EVT-007', reservaId: 'RES-2024-004', tipo: 'EN_USO', usuario: 'Pedro Silva', rol: 'Estudiante', lab: 'Lab A102', timestamp: '2026-09-10 10:02:18', ip: '192.168.1.88', traceId: 'def-401-ghi', detalle: 'Equipo recibido y uso iniciado' },
  { id: 'EVT-008', reservaId: 'RES-2024-005', tipo: 'DEVUELTA', usuario: 'Laura Méndez', rol: 'Técnico', lab: 'Lab D301', timestamp: '2026-09-10 10:05:44', ip: '10.0.1.15', traceId: 'efg-501-hij', detalle: 'Devolución registrada, equipo en buen estado' },
  { id: 'EVT-009', reservaId: 'RES-2024-006', tipo: 'CANCELADA', usuario: 'Jorge Pinto', rol: 'Estudiante', lab: 'Sala C2', timestamp: '2026-09-09 14:22:09', ip: '192.168.3.12', traceId: 'fgh-601-ijk', detalle: 'Cancelación por el solicitante' },
  { id: 'EVT-010', reservaId: 'RES-2024-007', tipo: 'CREADA', usuario: 'Sofía Reyes', rol: 'Estudiante', lab: 'Lab B204', timestamp: '2026-09-12 07:58:43', ip: '192.168.1.55', traceId: 'ghi-701-jkl', detalle: 'Reserva programada para el día siguiente' },
];

const SEED_USAGE_BY_HOUR: UsageByHour[] = [
  { h: '00', impresoras: 0, microscopios: 0, pcs: 1, labs: 0 },
  { h: '02', impresoras: 0, microscopios: 1, pcs: 2, labs: 1 },
  { h: '04', impresoras: 1, microscopios: 2, pcs: 3, labs: 2 },
  { h: '06', impresoras: 3, microscopios: 4, pcs: 5, labs: 5 },
  { h: '08', impresoras: 8, microscopios: 12, pcs: 14, labs: 18 },
  { h: '10', impresoras: 15, microscopios: 22, pcs: 20, labs: 24 },
  { h: '12', impresoras: 12, microscopios: 18, pcs: 16, labs: 20 },
  { h: '14', impresoras: 10, microscopios: 16, pcs: 18, labs: 17 },
  { h: '16', impresoras: 9, microscopios: 14, pcs: 15, labs: 14 },
  { h: '18', impresoras: 6, microscopios: 8, pcs: 10, labs: 8 },
  { h: '20', impresoras: 4, microscopios: 5, pcs: 6, labs: 5 },
  { h: '22', impresoras: 2, microscopios: 3, pcs: 4, labs: 3 },
];

const SEED_EQUIPMENT_STATUS: EquipmentStatusSummary[] = [
  { name: 'Impresoras 3D', ocupado: 65, disponible: 25, mantenimiento: 10 },
  { name: 'Microscopios', ocupado: 40, disponible: 50, mantenimiento: 10 },
  { name: 'PCs Alta Gama', ocupado: 75, disponible: 15, mantenimiento: 10 },
];

const SEED_BOOKINGS_BY_HOUR: BookingsByHour[] = [
  { h: '08:00', reservas: 4, canceladas: 0 },
  { h: '09:00', reservas: 8, canceladas: 1 },
  { h: '10:00', reservas: 14, canceladas: 0 },
  { h: '11:00', reservas: 18, canceladas: 2 },
  { h: '12:00', reservas: 12, canceladas: 1 },
  { h: '13:00', reservas: 6, canceladas: 0 },
  { h: '14:00', reservas: 10, canceladas: 0 },
  { h: '15:00', reservas: 15, canceladas: 1 },
  { h: '16:00', reservas: 11, canceladas: 0 },
  { h: '17:00', reservas: 7, canceladas: 0 },
  { h: '18:00', reservas: 3, canceladas: 0 },
];

const SEED_TOP_RESOURCES: TopResource[] = [
  { name: 'PC Workstation Dell', usos: 142 },
  { name: 'Impresora 3D Ultimaker', usos: 98 },
  { name: 'Microscopio Zeiss', usos: 87 },
  { name: 'Osciloscopio Tektronix', usos: 64 },
  { name: 'Kit Arduino', usos: 58 },
  { name: 'Microscopio Nikon', usos: 52 },
  { name: 'Espectrómetro UV', usos: 41 },
];

const SEED_STATUS_DISTRIBUTION: StatusDistribution[] = [
  { name: 'Devuelta', value: 280, color: '#9ca3af' },
  { name: 'En Uso', value: 45, color: '#60a5fa' },
  { name: 'Aprobada', value: 32, color: '#5cb85c' },
  { name: 'Solicitada', value: 28, color: '#fbbf24' },
  { name: 'Cancelada', value: 18, color: '#f87171' },
];

const SEED_CYCLE_TIME: CycleTimePoint[] = [
  { semana: 'S1 Sep', ciclo: 4.2 },
  { semana: 'S2 Sep', ciclo: 3.8 },
  { semana: 'S3 Sep', ciclo: 5.1 },
  { semana: 'S4 Sep', ciclo: 4.6 },
  { semana: 'S1 Oct', ciclo: 3.2 },
];

const SEED_KPIS: ReportKpis = {
  totalReservas: 403,
  tasaAprobacion: 87,
  tiempoCicloPromedio: 4.2,
  tasaCancelacion: 4.5,
};

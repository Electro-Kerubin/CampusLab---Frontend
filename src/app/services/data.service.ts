import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Booking,
  Lab,
  Equipment,
  Supply,
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
 *  - ms-campuslab-catalog   → GET /api/catalog/labs|equipment|supplies
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
  readonly equipment = signal<Equipment[]>([]);
  readonly supplies = signal<Supply[]>([]);
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
    this.loadEquipment();
    this.loadSupplies();
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
      tap((created) => this.bookings.update((cur) => [created, ...cur])),
      catchError(() => {
        const local: Booking = {
          id: `RES-LOCAL-${Date.now()}`,
          lab: payload.lab,
          equipment: payload.equipment || 'Por definir',
          requester: payload.requester || 'Usuario actual',
          role: 'Estudiante',
          date: payload.date,
          time: payload.time,
          status: 'SOLICITADA',
        };
        this.bookings.update((cur) => [local, ...cur]);
        return of(local);
      })
    );
  }

  updateBookingStatus(id: string, status: BookingStatus): Observable<Booking> {
    const body: UpdateBookingStatusRequest = { status };
    return this.http
      .put<Booking>(`${this.api}/bookings/${encodeURIComponent(id)}/status`, body)
      .pipe(
        tap(() =>
          this.bookings.update((cur) =>
            cur.map((b) => (b.id === id ? { ...b, status } : b))
          )
        ),
        catchError(() => {
          this.bookings.update((cur) =>
            cur.map((b) => (b.id === id ? { ...b, status } : b))
          );
          const updated = this.bookings().find((b) => b.id === id);
          return of(updated as Booking);
        })
      );
  }

  // ─── Catalog: ms-campuslab-catalog ────────────────────────────────────
  loadLabs(): void {
    this.http
      .get<Lab[]>(`${this.api}/catalog/labs`)
      .pipe(catchError(() => this.fallback('catalog/labs', SEED_LABS)))
      .subscribe((data) => this.labs.set(data));
  }

  loadEquipment(): void {
    this.http
      .get<Equipment[]>(`${this.api}/catalog/equipment`)
      .pipe(catchError(() => this.fallback('catalog/equipment', SEED_EQUIPMENT)))
      .subscribe((data) => this.equipment.set(data));
  }

  loadSupplies(): void {
    this.http
      .get<Supply[]>(`${this.api}/catalog/supplies`)
      .pipe(catchError(() => this.fallback('catalog/supplies', SEED_SUPPLIES)))
      .subscribe((data) => this.supplies.set(data));
  }

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
    const activeStatuses: BookingStatus[] = ['SOLICITADA', 'APROBADA', 'EN_PREPARACIÓN', 'EN_USO'];
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
        ['APROBADA', 'EN_PREPARACIÓN', 'EN_USO'].includes(b.status)
      ).length
  );

  readonly pendingApprovalsCount = computed(
    () => this.bookings().filter((b) => b.status === 'SOLICITADA').length
  );

  readonly equipmentOccupancy = computed(() => {
    const eq = this.equipment();
    if (eq.length === 0) return { pct: 0, inUse: 0 };
    const total = eq.reduce((acc, e) => acc + e.total, 0);
    const used = eq.reduce((acc, e) => acc + (e.total - e.stock), 0);
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
const SEED_BOOKINGS: Booking[] = [
  { id: 'RES-2024-001', lab: 'Laboratorio A102', equipment: 'Impresora 3D Ultimaker', requester: 'María González', role: 'Estudiante', date: '2026-09-11', time: '09:00–11:00', status: 'EN_PREPARACIÓN' },
  { id: 'RES-2024-002', lab: 'Laboratorio B204', equipment: 'Microscopio Electrónico', requester: 'Carlos Ruiz', role: 'Técnico', date: '2026-09-11', time: '11:00–13:00', status: 'APROBADA' },
  { id: 'RES-2024-003', lab: 'Sala Cómputo C1', equipment: 'PC Alta Gama × 5', requester: 'Ana Torres', role: 'Estudiante', date: '2026-09-11', time: '14:00–16:00', status: 'SOLICITADA' },
  { id: 'RES-2024-004', lab: 'Laboratorio A102', equipment: 'Kit Electrónica Arduino', requester: 'Pedro Silva', role: 'Estudiante', date: '2026-09-10', time: '10:00–12:00', status: 'EN_USO' },
  { id: 'RES-2024-005', lab: 'Laboratorio D301', equipment: 'Osciloscopio Digital', requester: 'Laura Méndez', role: 'Técnico', date: '2026-09-10', time: '08:00–10:00', status: 'DEVUELTA' },
  { id: 'RES-2024-006', lab: 'Sala Cómputo C2', equipment: 'PC Alta Gama × 3', requester: 'Jorge Pinto', role: 'Estudiante', date: '2026-09-09', time: '15:00–17:00', status: 'CANCELADA' },
  { id: 'RES-2024-007', lab: 'Laboratorio B204', equipment: 'Microscopio Óptico', requester: 'Sofía Reyes', role: 'Estudiante', date: '2026-09-12', time: '13:00–15:00', status: 'SOLICITADA' },
  { id: 'RES-2024-008', lab: 'Laboratorio A102', equipment: 'Impresora 3D Prusa', requester: 'Andrés Vega', role: 'Técnico', date: '2026-09-12', time: '16:00–18:00', status: 'APROBADA' },
];

const SEED_LABS: Lab[] = [
  { id: 'A102', name: 'Laboratorio A102', type: 'Impresión 3D', capacity: 15, available: 3, total: 6, location: 'Edificio A, Piso 1', status: 'Disponible' },
  { id: 'B204', name: 'Laboratorio B204', type: 'Microscopía', capacity: 12, available: 2, total: 8, location: 'Edificio B, Piso 2', status: 'Ocupado' },
  { id: 'C101', name: 'Sala Cómputo C1', type: 'Computación', capacity: 20, available: 20, total: 20, location: 'Edificio C, Piso 1', status: 'Disponible' },
  { id: 'C201', name: 'Sala Cómputo C2', type: 'Computación', capacity: 20, available: 15, total: 20, location: 'Edificio C, Piso 2', status: 'Parcial' },
  { id: 'D301', name: 'Laboratorio D301', type: 'Electrónica', capacity: 18, available: 0, total: 10, location: 'Edificio D, Piso 3', status: 'En Mantenimiento' },
  { id: 'E105', name: 'Laboratorio E105', type: 'Química', capacity: 16, available: 8, total: 12, location: 'Edificio E, Piso 1', status: 'Disponible' },
];

const SEED_EQUIPMENT: Equipment[] = [
  { id: 'EQ-001', name: 'Impresora 3D Ultimaker S5', lab: 'A102', stock: 2, total: 3, status: 'Disponible' },
  { id: 'EQ-002', name: 'Impresora 3D Prusa MK4', lab: 'A102', stock: 1, total: 3, status: 'En Uso' },
  { id: 'EQ-003', name: 'Microscopio Electrónico Zeiss', lab: 'B204', stock: 1, total: 2, status: 'Disponible' },
  { id: 'EQ-004', name: 'Microscopio Óptico Nikon', lab: 'B204', stock: 3, total: 6, status: 'Disponible' },
  { id: 'EQ-005', name: 'PC Workstation Dell Precision', lab: 'C101', stock: 14, total: 20, status: 'Parcial' },
  { id: 'EQ-006', name: 'Osciloscopio Digital Tektronix', lab: 'D301', stock: 0, total: 5, status: 'Mantenimiento' },
  { id: 'EQ-007', name: 'Kit Arduino Avanzado', lab: 'D301', stock: 8, total: 10, status: 'Disponible' },
  { id: 'EQ-008', name: 'Espectrómetro UV-Vis', lab: 'E105', stock: 2, total: 4, status: 'Disponible' },
];

const SEED_SUPPLIES: Supply[] = [
  { id: 'INS-001', name: 'Filamento PLA 1.75mm (blanco)', unit: 'kg', stock: 12, minStock: 5, lab: 'A102' },
  { id: 'INS-002', name: 'Filamento PETG 1.75mm (negro)', unit: 'kg', stock: 4, minStock: 5, lab: 'A102' },
  { id: 'INS-003', name: 'Portaobjetos de vidrio (100 uds)', unit: 'caja', stock: 8, minStock: 3, lab: 'B204' },
  { id: 'INS-004', name: 'Guantes de nitrilo (M)', unit: 'caja', stock: 2, minStock: 5, lab: 'E105' },
  { id: 'INS-005', name: 'Alcohol isopropílico 1L', unit: 'botella', stock: 6, minStock: 3, lab: 'E105' },
  { id: 'INS-006', name: 'Cable Dupont 40cm (20uds)', unit: 'set', stock: 15, minStock: 5, lab: 'D301' },
];

const SEED_AUDIT_EVENTS: AuditEvent[] = [
  { id: 'EVT-001', reservaId: 'RES-2024-001', tipo: 'CREADA', usuario: 'María González', rol: 'Estudiante', lab: 'Lab A102', timestamp: '2026-09-11 08:30:14', ip: '192.168.1.45', traceId: 'abc-123-def', detalle: 'Reserva creada vía portal web' },
  { id: 'EVT-002', reservaId: 'RES-2024-001', tipo: 'APROBADA', usuario: 'Rodrigo Muñoz', rol: 'Técnico', lab: 'Lab A102', timestamp: '2026-09-11 08:52:03', ip: '10.0.1.12', traceId: 'abc-124-def', detalle: 'Aprobación manual por técnico de turno' },
  { id: 'EVT-003', reservaId: 'RES-2024-001', tipo: 'EN_PREPARACIÓN', usuario: 'Rodrigo Muñoz', rol: 'Técnico', lab: 'Lab A102', timestamp: '2026-09-11 09:15:22', ip: '10.0.1.12', traceId: 'abc-125-def', detalle: 'Inicio de preparación de sala y equipos' },
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

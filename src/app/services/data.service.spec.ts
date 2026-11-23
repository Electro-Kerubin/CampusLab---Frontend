//PARA TESTING
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataService } from './data.service';
import { environment } from '../../environments/environment';
import { Booking, BookingStatus, CatalogResource } from '../models';

const booking = (id: number, status: BookingStatus, extra: Partial<Booking> = {}): Booking => ({
  id,
  resourceId: 100 + id,
  resourceNombre: `Recurso ${id}`,
  studentEmail: `alumno${id}@duocuc.cl`,
  purpose: 'Práctica',
  startTime: '2026-11-30T10:00:00',
  endTime: '2026-11-30T11:00:00',
  status,
  createdAt: '2026-11-29T10:00:00',
  updatedAt: '2026-11-29T10:00:00',
  ...extra,
});

const resource = (id: number, extra: Partial<CatalogResource> = {}): CatalogResource => ({
  id,
  labId: 1,
  labName: 'Laboratorio A102',
  categoryId: 1,
  categoryName: 'Equipos',
  name: `Recurso ${id}`,
  resourceType: 'EQUIPO',
  status: 'DISPONIBLE',
  quantityTotal: 10,
  quantityAvailable: 10,
  reorderThreshold: 1,
  brand: null,
  model: null,
  serialNumber: null,
  unitOfMeasure: null,
  createdAt: '',
  updatedAt: '',
  ...extra,
});

const API = environment.apiUrl;
const serverError = { status: 500, statusText: 'Server Error' };

describe('DataService', () => {
  let service: DataService;
  let http: HttpTestingController;

  beforeEach(() => {
    spyOn(console, 'warn');
    spyOn(console, 'error');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DataService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const discardInitialLoads = () => http.match(() => true);

  it('al crearse carga todas las colecciones desde el backend', () => {
    const urls = http.match(() => true).map((r) => r.request.urlWithParams.replace(API, ''));
    expect(urls.sort()).toEqual(
      [
        '/audit',
        '/bookings',
        '/catalog/categories',
        '/catalog/labs',
        '/catalog/resources',
        '/report/equipment-status',
        '/report/kpis',
        '/report/top-resources',
        '/report/usage-by-hour',
      ].sort()
    );
    expect(service.loading()).toBeTrue();
  });

  describe('reservas (ms-campuslab-bookings)', () => {
    beforeEach(discardInitialLoads);

    it('GET /api/bookings guarda la respuesta y apaga el loading', () => {
      service.loadBookings();
      http.expectOne(`${API}/bookings`).flush([booking(1, 'SOLICITADA')]);

      expect(service.bookings().map((b) => b.id)).toEqual([1]);
      expect(service.loading()).toBeFalse();
      expect(service.usingFallback()).toBeFalse();
    });

    it('GET /api/bookings?status= cuando se filtra por estado', () => {
      service.loadBookings('APROBADA');
      const req = http.expectOne(`${API}/bookings?status=APROBADA`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('POST /api/bookings envía el body del contrato y agrega la reserva al inicio', () => {
      service.bookings.set([booking(1, 'APROBADA')]);
      const payload = {
        resourceId: 1,
        purpose: 'Práctica 3',
        startTime: '2026-11-30T10:00:00',
        endTime: '2026-11-30T11:00:00',
      };
      service.createBooking(payload).subscribe();

      const req = http.expectOne(`${API}/bookings`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(booking(99, 'SOLICITADA'));

      expect(service.bookings().map((b) => b.id)).toEqual([99, 1]);
    });

    it('PUT /api/bookings/{id}/status reemplaza solo esa reserva y recarga el catálogo', () => {
      service.bookings.set([booking(7, 'SOLICITADA'), booking(8, 'SOLICITADA')]);
      service.updateBookingStatus(7, 'APROBADA').subscribe();

      const req = http.expectOne(`${API}/bookings/7/status`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: 'APROBADA' });
      req.flush(booking(7, 'APROBADA'));

      expect(service.bookings().map((b) => b.status)).toEqual(['APROBADA', 'SOLICITADA']);
      http.expectOne(`${API}/catalog/resources`).flush([]);
    });
  });

  describe('fallback a datos demo cuando el backend no responde', () => {
    beforeEach(discardInitialLoads);

    it('reservas: usa los datos semilla y marca usingFallback', () => {
      service.loadBookings();
      http.expectOne(`${API}/bookings`).flush('boom', serverError);

      expect(service.bookings().length).toBe(8);
      expect(service.bookings().every((b) => !!b.status && !!b.studentEmail)).toBeTrue();
      expect(service.usingFallback()).toBeTrue();
      expect(service.loading()).toBeFalse();
    });

    it('catálogo: labs, recursos y categorías caen a datos semilla', () => {
      service.loadLabs();
      service.loadResources();
      service.loadCategories();
      http.expectOne(`${API}/catalog/labs`).flush(null, serverError);
      http.expectOne(`${API}/catalog/resources`).flush(null, serverError);
      http.expectOne(`${API}/catalog/categories`).flush(null, serverError);

      expect(service.labs().length).toBe(5);
      expect(service.resources().length).toBe(9);
      expect(service.categories().length).toBe(3);
    });

    it('reportería de uso y estado de equipos caen a datos semilla', () => {
      service.loadUsageByHour();
      service.loadEquipmentStatus();
      http.expectOne(`${API}/report/usage-by-hour`).flush(null, serverError);
      http.expectOne(`${API}/report/equipment-status`).flush(null, serverError);

      expect(service.usageByHour().length).toBe(12);
      expect(service.equipmentStatus().map((e) => e.name)).toContain('Microscopios');
    });

    it('KPIs y top recursos NO inventan datos: quedan vacíos', () => {
      service.loadHourlyMetrics();
      service.loadResourceUsage();
      http.expectOne(`${API}/report/kpis`).flush(null, serverError);
      http.expectOne(`${API}/report/top-resources`).flush(null, serverError);

      expect(service.hourlyMetrics()).toEqual([]);
      expect(service.resourceUsage()).toEqual([]);
    });

    it('auditoría NUNCA usa datos de demostración: queda vacía y marcada como no disponible', () => {
      service.loadAuditEvents();
      http.expectOne(`${API}/audit`).flush(null, serverError);

      expect(service.auditEvents()).toEqual([]);
      expect(service.auditUnavailable()).toBeTrue();
      expect(service.usingFallback()).toBeFalse();
    });

    it('DLQ sin respuesta queda en null ("sin datos"), no en un "todo OK" inventado', () => {
      service.loadDlqStatus();
      http.expectOne(`${API}/notify/dlq`).flush(null, serverError);
      expect(service.dlqStatus()).toBeNull();
    });
  });

  describe('auditoría y catálogo', () => {
    beforeEach(discardInitialLoads);

    it('GET /api/audit envía solo los filtros con valor y limpia el aviso de error', () => {
      service.auditUnavailable.set(true);
      service.loadAuditEvents({ tipo: 'APROBADA', userId: '', from: '2026-11-01', to: undefined });

      const req = http.expectOne((r) => r.url.startsWith(`${API}/audit`));
      expect(req.request.urlWithParams).toBe(`${API}/audit?tipo=APROBADA&from=2026-11-01`);
      expect(service.auditUnavailable()).toBeFalse();
      req.flush([]);
    });

    it('GET /api/catalog/resources?labId= filtra por laboratorio', () => {
      service.loadResources(3);
      http.expectOne(`${API}/catalog/resources?labId=3`).flush([]);
    });

    it('POST /api/catalog/labs agrega el laboratorio creado', () => {
      service.createLab({ name: 'Lab Nuevo', capacity: 10 }).subscribe();
      const req = http.expectOne(`${API}/catalog/labs`);
      expect(req.request.method).toBe('POST');
      req.flush({ id: 9, name: 'Lab Nuevo', location: null, capacity: 10, createdAt: '' });
      expect(service.labs()[0].name).toBe('Lab Nuevo');
    });

    it('POST /api/catalog/resources agrega el recurso creado', () => {
      const payload = { labId: 1, categoryId: 2, name: 'Guantes', resourceType: 'INSUMO' as const, unitOfMeasure: 'caja' };
      service.createResource(payload).subscribe();
      const req = http.expectOne(`${API}/catalog/resources`);
      expect(req.request.body).toEqual(payload);
      req.flush(resource(50, { name: 'Guantes', resourceType: 'INSUMO' }));
      expect(service.supplies().map((r) => r.id)).toEqual([50]);
    });

    it('PUT /api/catalog/resources/{id}/stock reemplaza el recurso ajustado', () => {
      service.resources.set([resource(1), resource(2)]);
      service.adjustStock(2, { delta: -3 }).subscribe();

      const req = http.expectOne(`${API}/catalog/resources/2/stock`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ delta: -3 });
      req.flush(resource(2, { quantityAvailable: 7 }));

      expect(service.resources().find((r) => r.id === 2)?.quantityAvailable).toBe(7);
    });

    it('refreshBookings() recarga reservas y auditoría', () => {
      service.refreshBookings();
      http.expectOne(`${API}/bookings`).flush([]);
      http.expectOne(`${API}/audit`).flush([]);
    });
  });

  describe('estado derivado (computed)', () => {
    beforeEach(discardInitialLoads);

    it('equipment() y supplies() separan los recursos por tipo', () => {
      service.resources.set([
        resource(1, { resourceType: 'EQUIPO' }),
        resource(2, { resourceType: 'INSUMO' }),
        resource(3, { resourceType: 'SALA' }),
      ]);
      expect(service.equipment().map((r) => r.id)).toEqual([1]);
      expect(service.supplies().map((r) => r.id)).toEqual([2]);
    });

    it('KPIs del dashboard: activas (APROBADA/EN_PREPARACION/EN_USO) y pendientes (SOLICITADA)', () => {
      service.bookings.set([
        booking(1, 'APROBADA'),
        booking(2, 'EN_PREPARACION'),
        booking(3, 'EN_USO'),
        booking(4, 'SOLICITADA'),
        booking(5, 'DEVUELTA'),
        booking(6, 'CANCELADA'),
      ]);
      expect(service.activeBookingsCount()).toBe(3);
      expect(service.pendingApprovalsCount()).toBe(1);
    });

    it('equipmentOccupancy(): porcentaje de unidades en uso sobre el total de equipos', () => {
      service.resources.set([
        resource(1, { quantityTotal: 3, quantityAvailable: 1 }),
        resource(2, { quantityTotal: 5, quantityAvailable: 5 }),
        resource(3, { resourceType: 'INSUMO', quantityTotal: 100, quantityAvailable: 0 }),
      ]);
      expect(service.equipmentOccupancy()).toEqual({ pct: 25, inUse: 2 });
    });

    it('equipmentOccupancy() sin equipos o con total 0 es 0 %', () => {
      expect(service.equipmentOccupancy()).toEqual({ pct: 0, inUse: 0 });
      service.resources.set([resource(1, { quantityTotal: null, quantityAvailable: null })]);
      expect(service.equipmentOccupancy().pct).toBe(0);
    });

    it('statusDistribution(): cuenta por estado y omite los que no tienen reservas', () => {
      service.bookings.set([booking(1, 'APROBADA'), booking(2, 'APROBADA'), booking(3, 'CANCELADA')]);
      expect(service.statusDistribution()).toEqual([
        { name: 'APROBADA', value: 2, color: '#5cb85c' },
        { name: 'CANCELADA', value: 1, color: '#f87171' },
      ]);
    });

    it('reportKpis(): totales, ciclo promedio en horas y tasas de aprobación/cancelación', () => {
      service.hourlyMetrics.set([
        { labId: 1, bucketHour: '2026-11-23T10:00:00', bookingsCount: 3, avgCycleMinutes: 90 },
        { labId: 1, bucketHour: '2026-11-23T11:00:00', bookingsCount: 2, avgCycleMinutes: 30 },
        { labId: 1, bucketHour: '2026-11-23T12:00:00', bookingsCount: 1, avgCycleMinutes: null },
      ]);
      service.bookings.set([
        booking(1, 'APROBADA'),
        booking(2, 'DEVUELTA'),
        booking(3, 'CANCELADA'),
        booking(4, 'SOLICITADA'),
      ]);

      expect(service.reportKpis()).toEqual({
        totalReservas: 6,
        tiempoCicloPromedio: 1,
        tasaAprobacion: 50,
        tasaCancelacion: 25,
      });
    });

    it('reportKpis() sin datos no divide por cero', () => {
      expect(service.reportKpis()).toEqual({
        totalReservas: 0,
        tiempoCicloPromedio: 0,
        tasaAprobacion: 0,
        tasaCancelacion: 0,
      });
    });

    it('topResourcesView(): ordena por uso y usa el nombre del catálogo (o "Recurso #id")', () => {
      service.resources.set([resource(101, { name: 'Impresora 3D' })]);
      service.resourceUsage.set([
        { resourceId: 101, periodStart: '', periodEnd: '', usageCount: 3, totalDurationMinutes: null },
        { resourceId: 999, periodStart: '', periodEnd: '', usageCount: 7, totalDurationMinutes: null },
      ]);
      expect(service.topResourcesView()).toEqual([
        { name: 'Recurso #999', usos: 7 },
        { name: 'Impresora 3D', usos: 3 },
      ]);
    });

    it('workflowSteps(): el estado activo es el que más reservas tiene ahora; CANCELADA no aparece', () => {
      service.bookings.set([
        booking(1, 'SOLICITADA'),
        booking(2, 'EN_USO'),
        booking(3, 'EN_USO'),
        booking(4, 'DEVUELTA'),
      ]);
      const steps = service.workflowSteps();

      expect(steps.map((s) => s.id)).toEqual(['SOLICITADA', 'APROBADA', 'EN_PREPARACION', 'EN_USO', 'DEVUELTA']);
      const byId = Object.fromEntries(steps.map((s) => [s.id, s]));
      expect(byId['EN_USO'].active).toBeTrue();
      expect(byId['EN_USO'].desc).toBe('2 reserva(s) en este estado ahora');
      expect(byId['SOLICITADA'].done).toBeTrue();
      expect(byId['APROBADA'].desc).toBe('Sin reservas en este estado');
      expect(byId['EN_PREPARACION'].label).toBe('EN PREPARACION');
    });
  });
});

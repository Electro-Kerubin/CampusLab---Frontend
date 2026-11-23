import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataService } from './data.service';

describe('DataService', () => {
  let service: DataService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DataService);
    http = TestBed.inject(HttpTestingController);
    http.match(() => true);
  });

  afterEach(() => http.verify());

  it('GET /api/bookings lista reservas', () => {
    const requests = http.match((r) => r.url.endsWith('/bookings'));
    requests.forEach((req) => req.flush([
      { id: 1, resourceId: 1, resourceNombre: 'Química', studentEmail: 'ana@campus.cl', status: 'SOLICITADA' },
    ]));

    service.loadBookings();
    const req = http.expectOne((r) => r.url.endsWith('/bookings'));
    req.flush([
      { id: 1, resourceId: 1, resourceNombre: 'Química', studentEmail: 'ana@campus.cl', status: 'SOLICITADA' },
    ]);

    expect(service.bookings().length).toBe(1);
    expect(service.bookings()[0].status).toBe('SOLICITADA');
  });

  it('GET /api/bookings envía ?status= cuando se filtra', () => {
    service.loadBookings('APROBADA');
    const req = http.expectOne((r) => r.url === '/api/bookings?status=APROBADA');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('POST /api/bookings crea una reserva con el body del contrato', () => {
    const payload = {
      resourceId: 1,
      studentEmail: 'carmen@campus.cl',
      purpose: 'Práctica 3',
      startTime: '2026-11-30T10:00:00',
      endTime: '2026-11-30T11:00:00',
    };
    service.createBooking(payload).subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/bookings'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 99, ...payload, status: 'SOLICITADA' });
  });

  it('PUT /api/bookings/{id}/status cambia el estado', () => {
    service.updateBookingStatus(7, 'APROBADA').subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/bookings/7/status'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'APROBADA' });
    req.flush({ id: 7, status: 'APROBADA' });
    const resourcesReq = http.expectOne((r) => r.url.endsWith('/catalog/resources'));
    resourcesReq.flush([]);
  });

  it('GET /api/catalog/labs devuelve laboratorios', () => {
    service.loadLabs();
    const req = http.expectOne((r) => r.url.endsWith('/catalog/labs'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('GET /api/report/kpis carga las métricas por hora', () => {
    service.loadHourlyMetrics();
    const req = http.expectOne((r) => r.url.endsWith('/report/kpis'));
    req.flush([{ bucketHour: '2026-11-23T10:00:00', bookingsCount: 10 }]);
    expect(service.hourlyMetrics().length).toBe(1);
    expect(service.hourlyMetrics()[0].bookingsCount).toBe(10);
  });

  it('cae a datos demo cuando el backend responde 500', () => {
    service.loadBookings();
    const req = http.expectOne((r) => r.url.endsWith('/bookings'));
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(Array.isArray(service.bookings())).toBeTrue();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DataService } from './data.service';

/**
 * KPI "tiempo de ciclo" (solicitud -> devolución) que ms-campuslab-report calcula con el tópico Kafka audit.timeline
 * y el BFF expone en GET /api/report/cycle-time.
 */
describe('DataService: tiempo de ciclo (Kafka audit.timeline)', () => {
  let data: DataService;
  let http: HttpTestingController;

  beforeEach(() => {
    spyOn(console, 'warn');   // el servicio avisa por consola cuando un endpoint no responde
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    data = TestBed.inject(DataService);
    http = TestBed.inject(HttpTestingController);
    // Las demás cargas iniciales del constructor no interesan en estas pruebas
    http.match((r) => !r.url.endsWith('/report/cycle-time'));
  });

  it('pide el tiempo de ciclo al BFF al cargar y lo muestra en horas en la tarjeta de Reportería', () => {
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/report/cycle-time')).flush({
      days: 7, returned: 12, cancelled: 2, inProgress: 5, avgCycleMinutes: 90, maxCycleMinutes: 240,
    });

    expect(data.cycleTime()?.returned).toBe(12);
    expect(data.reportKpis().tiempoCicloPromedio).toBe(1.5);   // 90 min = 1,5 h
  });

  it('sin reservas devueltas el promedio es nulo y la tarjeta muestra 0', () => {
    http.expectOne((r) => r.url.endsWith('/report/cycle-time')).flush({
      days: 7, returned: 0, cancelled: 0, inProgress: 0, avgCycleMinutes: null, maxCycleMinutes: null,
    });

    expect(data.cycleTime()?.avgCycleMinutes).toBeNull();
    expect(data.reportKpis().tiempoCicloPromedio).toBe(0);
  });

  it('si el BFF no responde no inventa datos: el KPI queda en 0', () => {
    http.expectOne((r) => r.url.endsWith('/report/cycle-time')).flush('error', { status: 503, statusText: 'Service Unavailable' });

    expect(data.cycleTime()).toBeNull();
    expect(data.reportKpis().tiempoCicloPromedio).toBe(0);
  });
});

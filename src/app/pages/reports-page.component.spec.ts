//PARA TESTING
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ReportsPageComponent } from './reports-page.component';
import { DataService } from '../services/data.service';
import { Booking, BookingStatus, CatalogResource } from '../models';

const booking = (id: number, status: BookingStatus) => ({ id, status }) as Booking;

describe('ReportsPageComponent', () => {
  let fixture: ComponentFixture<ReportsPageComponent>;
  let data: DataService;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent ?? '';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReportsPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideCharts(withDefaultRegisterables())],
    });
    data = TestBed.inject(DataService);
    fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
  });

  const kpi = (label: string) =>
    Array.from(root().querySelectorAll('p')).find((p) => p.textContent?.trim() === label)?.previousElementSibling?.textContent?.trim();

  it('muestra las 4 tarjetas KPI con los valores calculados', () => {
    data.hourlyMetrics.set([
      { labId: 1, bucketHour: '2026-11-23T10:00:00', bookingsCount: 4, avgCycleMinutes: 120 },
      { labId: 1, bucketHour: '2026-11-23T11:00:00', bookingsCount: 1, avgCycleMinutes: 60 },
    ]);
    data.bookings.set([booking(1, 'APROBADA'), booking(2, 'DEVUELTA'), booking(3, 'CANCELADA'), booking(4, 'SOLICITADA')]);
    fixture.detectChanges();

    expect(kpi('Reservas (24h)')).toBe('5');
    expect(kpi('Tasa Aprobación (todas)')).toBe('50%');
    expect(kpi('Tiempo de Ciclo Prom. (24h)')).toBe('1.5h');
    expect(kpi('Tasa Cancelación (todas)')).toBe('25%');
  });

  it('sin datos muestra los estados vacíos en vez de gráficos', () => {
    expect(text()).toContain('Sin datos en las últimas 24h');
    expect(text()).toContain('Sin datos en los últimos 7 días');
    expect(text()).toContain('Sin reservas cargadas todavía');
    expect(root().querySelectorAll('canvas').length).toBe(0);
  });

  it('con métricas por hora dibuja los gráficos ordenados por hora', () => {
    data.hourlyMetrics.set([
      { labId: 1, bucketHour: '2026-11-23T11:00:00', bookingsCount: 2, avgCycleMinutes: null },
      { labId: 1, bucketHour: '2026-11-23T09:00:00', bookingsCount: 5, avgCycleMinutes: 45 },
    ]);
    fixture.detectChanges();

    const c = fixture.componentInstance;
    expect(c.reservasChartData().datasets[0].data).toEqual([5, 2]);
    expect(c.cicloChartData().datasets[0].data).toEqual([45, 0]);
    expect(root().querySelectorAll('canvas').length).toBe(2);
  });

  it('lista los recursos más usados con su nombre del catálogo y el más usado primero', () => {
    data.resources.set([{ id: 101, name: 'Impresora 3D' } as CatalogResource]);
    data.resourceUsage.set([
      { resourceId: 101, periodStart: '', periodEnd: '', usageCount: 2, totalDurationMinutes: null },
      { resourceId: 7, periodStart: '', periodEnd: '', usageCount: 8, totalDurationMinutes: null },
    ]);
    fixture.detectChanges();

    const t = text();
    expect(t).toContain('Recurso #7');
    expect(t).toContain('8 usos');
    expect(t.indexOf('Recurso #7')).toBeLessThan(t.indexOf('Impresora 3D'));
    expect(fixture.componentInstance.maxTopUsos()).toBe(8);
  });

  it('la distribución de estados usa etiquetas legibles y el conteo por estado', () => {
    data.bookings.set([booking(1, 'EN_PREPARACION'), booking(2, 'EN_PREPARACION'), booking(3, 'CANCELADA')]);
    fixture.detectChanges();

    expect(text()).toContain('En Preparación');
    expect(text()).toContain('Cancelada');
    const chart = fixture.componentInstance.estadosChartData();
    expect(chart.labels).toEqual(['En Preparación', 'Cancelada']);
    expect(chart.datasets[0].data).toEqual([2, 1]);
  });

  it('statusLabel devuelve el código tal cual si no lo conoce', () => {
    expect(fixture.componentInstance.statusLabel('DESCONOCIDO')).toBe('DESCONOCIDO');
  });
});

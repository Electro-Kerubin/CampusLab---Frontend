import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuditPageComponent } from './audit-page.component';
import { DataService } from '../services/data.service';
import { AuditEvent, EventType } from '../models';

const event = (id: string, tipo: EventType, extra: Partial<AuditEvent> = {}): AuditEvent => ({
  id,
  reservaId: `RES-${id}`,
  tipo,
  usuario: 'ana@duocuc.cl',
  rol: 'ESTUDIANTE',
  lab: 'Laboratorio A102',
  timestamp: '2026-11-23 10:15:00',
  ip: '10.0.0.1',
  traceId: `trace-${id}`,
  detalle: `Detalle ${id}`,
  ...extra,
});

describe('AuditPageComponent', () => {
  let fixture: ComponentFixture<AuditPageComponent>;
  let data: DataService;
  let comp: AuditPageComponent;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent ?? '';

  function create(query: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [AuditPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
      ],
    });
    data = TestBed.inject(DataService);
    spyOn(data, 'loadAuditEvents'); // las consultas al servidor se verifican como llamadas
    data.auditEvents.set([
      event('1', 'CREADA', { lab: 'Laboratorio B204' }),
      event('2', 'APROBADA', { usuario: 'luis@duocuc.cl' }),
      event('3', 'APROBADA'),
    ]);
    fixture = TestBed.createComponent(AuditPageComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('muestra el timeline completo y el conteo por tipo de evento', () => {
    create();
    expect(text()).toContain('3 eventos');
    expect(comp.countByType('APROBADA')).toBe(2);
    expect(comp.countByType('CANCELADA')).toBe(0);
  });

  it('el buscador filtra por reserva, usuario o laboratorio', () => {
    create();
    comp.search.set('luis');
    expect(comp.filtered().map((e) => e.id)).toEqual(['2']);
    comp.search.set('b204');
    expect(comp.filtered().map((e) => e.id)).toEqual(['1']);
    comp.search.set('res-3');
    expect(comp.filtered().map((e) => e.id)).toEqual(['3']);
  });

  it('el buscador global del header pre-carga el filtro con ?q=', () => {
    create({ q: 'luis' });
    expect(comp.search()).toBe('luis');
    expect(text()).toContain('1 eventos');
  });

  it('las tarjetas por tipo activan y desactivan el filtro', () => {
    create();
    comp.toggleTypeFilter('APROBADA');
    expect(comp.filtered().length).toBe(2);
    comp.toggleTypeFilter('APROBADA');
    expect(comp.filterType()).toBe('ALL');
    comp.onTypeChange('CREADA');
    expect(comp.filtered().map((e) => e.id)).toEqual(['1']);
    comp.onTypeChange('ALL');
    expect(comp.filtered().length).toBe(3);
  });

  it('al hacer clic en un evento muestra su detalle (trace ID, IP) y al volver a hacer clic lo oculta', () => {
    create();
    const firstRow = () => root().querySelector<HTMLButtonElement>('.divide-y button')!;
    firstRow().click();
    fixture.detectChanges();
    expect(text()).toContain('trace-1');
    expect(text()).toContain('10.0.0.1');

    firstRow().click();
    fixture.detectChanges();
    expect(text()).not.toContain('trace-1');
  });

  it('mensaje distinto si no hay eventos o si el filtro no coincide', () => {
    create();
    comp.search.set('zzz');
    fixture.detectChanges();
    expect(text()).toContain('No hay eventos que coincidan con los filtros');

    data.auditEvents.set([]);
    fixture.detectChanges();
    expect(text()).toContain('Aún no hay eventos de auditoría registrados');
  });

  it('si el servicio de auditoría no responde lo avisa (y no muestra datos inventados)', () => {
    create();
    data.auditEvents.set([]);
    data.auditUnavailable.set(true);
    fixture.detectChanges();

    expect(text()).toContain('Servicio de auditoría no disponible');
    expect(text()).toContain('Por seguridad no se muestran datos de demostración');
    expect(text()).not.toContain('Servicio de auditoría conectado');
  });

  it('"Filtrar" consulta al servidor con el rango de fechas', () => {
    create();
    comp.onFromDate('2026-11-01');
    comp.onToDate('2026-11-20');
    comp.applyFilters();
    expect(data.loadAuditEvents).toHaveBeenCalledWith({ from: '2026-11-01', to: '2026-11-20' });
  });

  it('las fechas se realinean si el inicio queda después del fin (o al revés)', () => {
    create();
    comp.onToDate('2026-11-10');
    comp.onFromDate('2026-11-15'); // inicio > fin → el fin se mueve al inicio
    expect(comp.to()).toBe('2026-11-15');

    comp.onToDate('2026-11-01'); // fin < inicio → el inicio se mueve al fin
    expect(comp.from()).toBe('2026-11-01');
  });

  it('"Limpiar" borra texto, tipo y fechas y vuelve a consultar sin filtros', () => {
    create();
    comp.search.set('x');
    comp.filterType.set('CREADA');
    comp.onFromDate('2026-11-01');
    comp.clearFilters();

    expect([comp.search(), comp.filterType(), comp.from(), comp.to()]).toEqual(['', 'ALL', '', '']);
    expect(data.loadAuditEvents).toHaveBeenCalledWith({});
  });
});

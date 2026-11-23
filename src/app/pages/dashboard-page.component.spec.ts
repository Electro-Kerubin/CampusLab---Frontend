//PARA TESTING
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { DashboardPageComponent } from './dashboard-page.component';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { Booking, BookingStatus, CatalogResource, Role } from '../models';

const booking = (id: number, status: BookingStatus) => ({ id, status }) as Booking;
const equipo = (total: number, available: number) =>
  ({ resourceType: 'EQUIPO', quantityTotal: total, quantityAvailable: available }) as CatalogResource;

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let data: DataService;

  function create(roles: Role[]) {
    TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideCharts(withDefaultRegisterables()),
        {
          provide: AuthService,
          useValue: { hasAnyRole: (...r: Role[]) => r.some((x) => roles.includes(x)) },
        },
      ],
    });
    data = TestBed.inject(DataService);
    fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
  }

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const kpi = (title: string) => {
    const label = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('p')).find(
      (p) => p.textContent?.trim() === title
    );
    return label?.nextElementSibling?.textContent?.trim();
  };

  it('muestra los KPIs calculados desde las reservas y los equipos', () => {
    create(['ADMIN']);
    data.bookings.set([
      booking(1, 'APROBADA'),
      booking(2, 'EN_USO'),
      booking(3, 'SOLICITADA'),
      booking(4, 'SOLICITADA'),
      booking(5, 'CANCELADA'),
    ]);
    data.resources.set([equipo(4, 1)]);
    fixture.detectChanges();

    expect(kpi('Reservas Activas')).toBe('2');
    expect(kpi('Aprobaciones Pendientes')).toBe('2');
    expect(kpi('Ocupación de Equipos')).toBe('75%');
    expect(text()).toContain('3 en uso');
  });

  it('el anillo de ocupación refleja el porcentaje', () => {
    create(['ADMIN']);
    const comp = fixture.componentInstance;
    expect(comp.circleOffset()).toBeCloseTo(comp.circleCirc, 5);

    data.resources.set([equipo(2, 1)]);
    expect(comp.circleOffset()).toBeCloseTo(comp.circleCirc / 2, 5);
  });

  it('dibuja el flujo de reservas con sus estados', () => {
    create(['ADMIN']);
    data.bookings.set([booking(1, 'EN_USO')]);
    fixture.detectChanges();

    expect(text()).toContain('EN USO');
    expect(text()).toContain('1 reserva(s) en este estado ahora');
  });

  it('arma los gráficos a partir de los datos de reportería', () => {
    create(['ADMIN']);
    data.usageByHour.set([{ h: '08', impresoras: 1, microscopios: 2, pcs: 3, labs: 4 }]);
    data.equipmentStatus.set([{ name: 'Microscopios', ocupado: 40, disponible: 50, mantenimiento: 10 }]);
    fixture.detectChanges();

    const lab = fixture.componentInstance.labUsageChartData();
    expect(lab.labels).toEqual(['08']);
    expect(lab.datasets.map((d) => d.data)).toEqual([[4], [1], [2], [3]]);

    const eq = fixture.componentInstance.equipmentChartData();
    expect(eq.labels).toEqual(['Microscopios']);
    expect(eq.datasets.map((d) => d.data)).toEqual([[40], [50], [10]]);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('canvas').length).toBe(2);
  });

  describe('sección de mensajería (DLQ)', () => {
    (['ADMIN', 'TECNICO'] as Role[]).forEach((role) =>
      it(`la ve un ${role}`, () => {
        create([role]);
        expect(text()).toContain('Mensajería · Mensajes Fallidos');
      })
    );

    (['ESTUDIANTE', 'AUDITOR'] as Role[]).forEach((role) =>
      it(`NO la ve un ${role}`, () => {
        create([role]);
        expect(text()).not.toContain('Mensajería · Mensajes Fallidos');
      })
    );
  });

  it('"Nueva Reserva" lleva a la página de reservas', () => {
    create(['ESTUDIANTE']);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    const btn = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Nueva Reserva')
    );
    btn!.click();

    expect(router.navigate).toHaveBeenCalledWith(['/bookings']);
  });

  it('el botón de actualizar recarga todos los datos', () => {
    create(['ADMIN']);
    spyOn(data, 'reloadAll');

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[title="Actualizar datos"]')!.click();

    expect(data.reloadAll).toHaveBeenCalledTimes(1);
  });

  it('estilos de cada paso del flujo según su estado', () => {
    create(['ADMIN']);
    const c = fixture.componentInstance;
    expect(c.stepCss({ active: true, done: false })).toContain('bg-[#5cb85c]');
    expect(c.stepCss({ active: false, done: true })).toContain('bg-green-50');
    expect(c.stepCss({ active: false, done: false })).toContain('bg-white');
    expect(c.stepLabelCss({ active: true, done: false })).toBe('text-[#5cb85c]');
    expect(c.stepLabelCss({ active: false, done: true })).toBe('text-gray-600');
    expect(c.stepLabelCss({ active: false, done: false })).toBe('text-gray-400');
  });
});

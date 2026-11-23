import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BookingsPageComponent, NewReservationModalComponent } from './bookings-page.component';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { Booking, BookingStatus, CatalogResource, Role } from '../models';

const booking = (id: number, status: BookingStatus, extra: Partial<Booking> = {}): Booking => ({
  id,
  resourceId: 100 + id,
  resourceNombre: `Recurso ${id}`,
  studentEmail: `alumno${id}@duocuc.cl`,
  purpose: 'Práctica',
  startTime: '2026-11-30T10:00:00',
  endTime: '2026-11-30T11:00:00',
  status,
  createdAt: '',
  updatedAt: '',
  ...extra,
});

function providers(roles: Role[], roleLabel = roles.join(' / ')) {
  return [
    provideRouter([]),
    provideHttpClient(),
    provideHttpClientTesting(),
    {
      provide: AuthService,
      useValue: {
        currentUser: () => ({ role: roleLabel }),
        hasAnyRole: (...r: Role[]) => r.some((x) => roles.includes(x)),
      },
    },
  ];
}

describe('BookingsPageComponent', () => {
  let fixture: ComponentFixture<BookingsPageComponent>;
  let comp: BookingsPageComponent;
  let data: DataService;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent ?? '';
  const buttons = () => Array.from(root().querySelectorAll('button'));
  const button = (label: string) => buttons().find((b) => b.textContent?.includes(label));
  const rowOf = (id: number) =>
    Array.from(root().querySelectorAll<HTMLTableRowElement>('tbody tr')).find((r) => r.textContent?.includes(`#${id}`))!;

  function create(roles: Role[], roleLabel?: string) {
    TestBed.configureTestingModule({ imports: [BookingsPageComponent], providers: providers(roles, roleLabel) });
    data = TestBed.inject(DataService);
    data.bookings.set([
      booking(1, 'SOLICITADA', { resourceNombre: 'Laboratorio de Química' }),
      booking(2, 'APROBADA', { studentEmail: 'luis@duocuc.cl' }),
      booking(3, 'DEVUELTA'),
    ]);
    fixture = TestBed.createComponent(BookingsPageComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('lista las reservas con recurso, solicitante y estado legible', () => {
    create(['ADMIN']);
    expect(root().querySelectorAll('tbody tr').length).toBe(3);
    expect(text()).toContain('Laboratorio de Química');
    expect(text()).toContain('luis@duocuc.cl');
    expect(rowOf(1).textContent).toContain('Solicitada');
  });

  it('si el BFF no trae el nombre del recurso muestra "Recurso #id"', () => {
    create(['ADMIN']);
    data.bookings.set([booking(9, 'SOLICITADA', { resourceNombre: null, resourceId: 555 })]);
    fixture.detectChanges();
    expect(text()).toContain('Recurso #555');
  });

  it('los chips de estado muestran el conteo y filtran la tabla (clic de nuevo = todas)', () => {
    create(['ADMIN']);
    expect(button('Todas (3)')).toBeDefined();
    expect(button('Aprobada (1)')).toBeDefined();
    expect(button('Cancelada (0)')).toBeDefined();

    button('Aprobada (1)')!.click();
    fixture.detectChanges();
    expect(comp.filtered().map((b) => b.id)).toEqual([2]);

    button('Aprobada (1)')!.click();
    fixture.detectChanges();
    expect(comp.filterStatus()).toBe('ALL');
  });

  it('el buscador filtra por id, recurso o solicitante', () => {
    create(['ADMIN']);
    comp.search.set('química');
    expect(comp.filtered().map((b) => b.id)).toEqual([1]);
    comp.search.set('luis');
    expect(comp.filtered().map((b) => b.id)).toEqual([2]);
    comp.search.set('zzz');
    fixture.detectChanges();
    expect(text()).toContain('No hay reservas que coincidan con los filtros');
  });

  it('al hacer clic en una reserva se despliega su detalle, y otro clic lo cierra', () => {
    create(['ADMIN']);
    rowOf(1).click();
    fixture.detectChanges();
    expect(text()).toContain('Reserva #1 — Detalle');

    rowOf(1).click();
    fixture.detectChanges();
    expect(text()).not.toContain('Reserva #1 — Detalle');
  });

  describe('cambio de estado (solo TECNICO/ADMIN)', () => {
    it('ofrece solo las transiciones válidas de la máquina de estados', () => {
      create(['TECNICO']);
      rowOf(1).click(); // SOLICITADA → APROBADA | CANCELADA
      fixture.detectChanges();
      const transitions = buttons().filter((b) => b.textContent?.includes('→')).map((b) => b.textContent!.trim());
      expect(transitions).toEqual(['→ Aprobada', '→ Cancelada']);
    });

    it('un estado final no ofrece transiciones', () => {
      create(['ADMIN']);
      rowOf(3).click(); // DEVUELTA
      fixture.detectChanges();
      expect(text()).toContain('Devuelta es un estado final');
    });

    it('al elegir una transición llama al backend y muestra la reserva actualizada', () => {
      create(['ADMIN']);
      spyOn(data, 'updateBookingStatus').and.returnValue(of(booking(1, 'APROBADA')));
      rowOf(1).click();
      fixture.detectChanges();

      button('→ Aprobada')!.click();
      fixture.detectChanges();

      expect(data.updateBookingStatus).toHaveBeenCalledWith(1, 'APROBADA');
      expect(comp.selected()?.status).toBe('APROBADA');
      expect(comp.changingStatus()).toBeFalse();
    });

    it('si el backend rechaza el cambio (p. ej. 409 sin stock) muestra su mensaje', () => {
      spyOn(console, 'error');
      create(['ADMIN']);
      spyOn(data, 'updateBookingStatus').and.returnValue(
        throwError(() => ({ status: 409, error: { message: 'No hay stock disponible' } }))
      );
      rowOf(1).click();
      fixture.detectChanges();
      button('→ Aprobada')!.click();
      fixture.detectChanges();

      expect(text()).toContain('No hay stock disponible');
      expect(comp.changingStatus()).toBeFalse();
    });

    it('un ESTUDIANTE ve el detalle pero no puede cambiar el estado', () => {
      create(['ESTUDIANTE']);
      rowOf(1).click();
      fixture.detectChanges();
      expect(text()).toContain('Reserva #1 — Detalle');
      expect(buttons().some((b) => b.textContent?.includes('→'))).toBeFalse();
    });
  });

  describe('crear reservas', () => {
    it('ESTUDIANTE/TECNICO/ADMIN ven "Nueva Reserva" y abre el modal', () => {
      create(['ESTUDIANTE']);
      button('Nueva Reserva')!.click();
      fixture.detectChanges();
      expect(root().querySelector('app-new-reservation-modal')).not.toBeNull();
    });

    it('un AUDITOR tiene acceso de solo lectura', () => {
      create(['AUDITOR'], 'Auditor');
      expect(button('Nueva Reserva')).toBeUndefined();
      expect(text()).toContain('Tu rol (Auditor) tiene acceso de solo lectura a las reservas');
    });

    it('al guardar crea la reserva, cierra el modal y refresca la lista', () => {
      create(['ESTUDIANTE']);
      spyOn(data, 'createBooking').and.returnValue(of(booking(10, 'SOLICITADA')));
      spyOn(data, 'refreshBookings');
      comp.showModal.set(true);
      const payload = { resourceId: 1, purpose: 'x', startTime: 'a', endTime: 'b' };

      comp.onSaved(payload);

      expect(data.createBooking).toHaveBeenCalledWith(payload);
      expect(comp.showModal()).toBeFalse();
      expect(data.refreshBookings).toHaveBeenCalled();
    });

    it('si crear falla el modal queda abierto', () => {
      spyOn(console, 'error');
      create(['ESTUDIANTE']);
      spyOn(data, 'createBooking').and.returnValue(throwError(() => ({ status: 500 })));
      comp.showModal.set(true);
      comp.onSaved({ resourceId: 1, purpose: 'x', startTime: 'a', endTime: 'b' });
      expect(comp.showModal()).toBeTrue();
    });
  });
});

describe('NewReservationModalComponent', () => {
  let fixture: ComponentFixture<NewReservationModalComponent>;
  let modal: NewReservationModalComponent;
  let data: DataService;

  const resources = [
    { id: 101, name: 'Impresora 3D Ultimaker', labName: 'Laboratorio A102', labId: 1, resourceType: 'EQUIPO' },
    { id: 205, name: 'Microscopio Zeiss', labName: 'Laboratorio B204', labId: 2, resourceType: 'EQUIPO' },
  ] as CatalogResource[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NewReservationModalComponent], providers: providers(['ESTUDIANTE']) });
    data = TestBed.inject(DataService);
    spyOn(data, 'loadResources');
    data.resources.set(resources);
    fixture = TestBed.createComponent(NewReservationModalComponent);
    modal = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('al abrirse refresca el catálogo', () => {
    expect(data.loadResources).toHaveBeenCalled();
  });

  it('busca recursos por nombre o laboratorio', () => {
    modal.resourceSearch = 'b204';
    expect(modal.filteredResources().map((r) => r.id)).toEqual([205]);
    modal.resourceSearch = '';
    expect(modal.filteredResources().length).toBe(2);
  });

  it('seguir escribiendo después de elegir invalida la selección', () => {
    modal.selectResource(resources[0]);
    expect(modal.selectedResource()?.id).toBe(101);
    modal.resourceSearch = 'Impresora 3D Ulti';
    modal.onResourceSearchChange();
    expect(modal.selectedResource()).toBeNull();
  });

  it('no se puede enviar sin recurso o sin propósito', () => {
    modal.purpose = 'Práctica';
    expect(modal.canSubmit()).toBeFalse(); // sin recurso
    modal.selectResource(resources[0]);
    modal.purpose = '   ';
    expect(modal.canSubmit()).toBeFalse(); // propósito vacío
    modal.purpose = 'Práctica';
    expect(modal.canSubmit()).toBeTrue();
  });

  it('rechaza un horario donde el término no es posterior al inicio', () => {
    const emitted: unknown[] = [];
    modal.saved.subscribe((p) => emitted.push(p));
    modal.selectResource(resources[0]);
    modal.purpose = 'x';
    modal.startHour = '11:00';
    modal.endHour = '11:00';

    modal.submit();

    expect(emitted).toEqual([]);
    expect(modal.error()).toBe('La hora de término debe ser posterior a la hora de inicio.');
  });

  it('emite el body del contrato POST /api/bookings (sin studentEmail: lo pone el backend)', () => {
    const emitted: unknown[] = [];
    modal.saved.subscribe((p) => emitted.push(p));
    modal.selectResource(resources[1]);
    modal.date = '2026-12-01';
    modal.startHour = '09:00';
    modal.endHour = '10:30';
    modal.purpose = '  Microscopía  ';

    modal.submit();

    expect(emitted).toEqual([
      { resourceId: 205, purpose: 'Microscopía', startTime: '2026-12-01T09:00:00', endTime: '2026-12-01T10:30:00' },
    ]);
  });

  it('etiqueta legible del tipo de recurso', () => {
    expect(modal.resourceTypeLabel('SALA')).toBe('Sala');
    expect(modal.resourceTypeLabel('INSUMO')).toBe('Insumo');
  });
});

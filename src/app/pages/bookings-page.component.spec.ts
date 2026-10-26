import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { Booking } from '../models';
import { BookingsPageComponent } from './bookings-page.component';

/**
 * Regresión del QA: al hacer click en una reserva, su detalle se mostraba al FINAL de la lista en vez de
 * justo debajo de la fila seleccionada.
 */
describe('BookingsPageComponent: detalle de una reserva', () => {
  let fixture: ComponentFixture<BookingsPageComponent>;
  let root: HTMLElement;

  const booking = (id: number, status: Booking['status'] = 'SOLICITADA'): Booking => ({
    id,
    resourceId: 1,
    resourceNombre: `Recurso ${id}`,
    studentEmail: `alumno${id}@duocuc.cl`,
    purpose: `Práctica ${id}`,
    startTime: '2026-10-19T09:00:00',
    endTime: '2026-10-19T11:00:00',
    status,
    createdAt: '2026-10-18T10:00:00',
    updatedAt: '2026-10-18T10:00:00',
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BookingsPageComponent],
      providers: [
        // El componente inyecta ActivatedRoute (pre-carga del filtro ?q del buscador global)
        provideRouter([]),
        {
          provide: DataService,
          useValue: {
            bookings: signal([booking(8), booking(10), booking(9), booking(4, 'APROBADA')]),
            resources: signal([]),
            loadResources: () => {},
            refreshBookings: () => {},
            updateBookingStatus: () => {},
          },
        },
        { provide: AuthService, useValue: { hasAnyRole: () => true } },
      ],
    });
    fixture = TestBed.createComponent(BookingsPageComponent);
    root = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  /** Las filas del cuerpo de la tabla, en orden (reservas y, si hay, la fila de detalle). */
  const rows = (): HTMLTableRowElement[] => Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr'));
  const bookingRows = (): HTMLTableRowElement[] => rows().filter((r) => !r.classList.contains('detail-row'));
  const detailRows = (): HTMLTableRowElement[] => rows().filter((r) => r.classList.contains('detail-row'));

  function click(rowIndex: number): void {
    bookingRows()[rowIndex].click();
    fixture.detectChanges();
  }

  it('al principio no hay ningún detalle abierto', () => {
    expect(bookingRows().length).toBe(4);
    expect(detailRows().length).toBe(0);
  });

  it('el detalle aparece JUSTO DEBAJO de la reserva clickeada, no al final de la lista', () => {
    click(1); // la reserva #10, segunda de la lista

    const clicked = bookingRows()[1];
    expect(clicked.textContent).toContain('#10');
    expect(clicked.nextElementSibling).toBe(detailRows()[0]);
    expect(detailRows().length).toBe(1);
    expect(detailRows()[0].textContent).toContain('Reserva #10 — Detalle');
    // y no es la última fila de la tabla (quedan 2 reservas más abajo)
    expect(detailRows()[0].nextElementSibling).not.toBeNull();
  });

  it('funciona igual con la primera y con la última reserva', () => {
    click(0);
    expect(bookingRows()[0].nextElementSibling).toBe(detailRows()[0]);
    expect(detailRows()[0].textContent).toContain('Reserva #8 — Detalle');

    click(3);
    expect(bookingRows()[3].nextElementSibling).toBe(detailRows()[0]);
    expect(detailRows()[0].textContent).toContain('Reserva #4 — Detalle');
  });

  it('solo hay un detalle a la vez: al elegir otra reserva el detalle se mueve', () => {
    click(0);
    click(2);

    expect(detailRows().length).toBe(1);
    expect(bookingRows()[2].nextElementSibling).toBe(detailRows()[0]);
    expect(detailRows()[0].textContent).toContain('Reserva #9 — Detalle');
  });

  it('un segundo click en la misma reserva cierra el detalle', () => {
    click(1);
    click(1);

    expect(detailRows().length).toBe(0);
  });

  it('la fila seleccionada queda resaltada y marcada como expandida', () => {
    click(1);

    expect(bookingRows()[1].classList).toContain('bg-blue-50');
    expect(bookingRows()[1].getAttribute('aria-expanded')).toBe('true');
    expect(bookingRows()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('el botón de cerrar del detalle lo cierra', () => {
    click(2);

    (detailRows()[0].querySelector('button[aria-label="Cerrar detalle"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(detailRows().length).toBe(0);
  });

  it('el detalle ofrece las transiciones de estado válidas para ese estado', () => {
    click(0); // #8 SOLICITADA -> APROBADA o CANCELADA

    const buttons = Array.from(detailRows()[0].querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(buttons).toContain('→ Aprobada');
    expect(buttons).toContain('→ Cancelada');
  });

  it('el detalle ocupa todo el ancho de la tabla', () => {
    click(0);

    expect(detailRows()[0].querySelector('td')?.getAttribute('colspan')).toBe('7');
  });
});

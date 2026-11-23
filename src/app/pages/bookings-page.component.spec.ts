import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { BookingsPageComponent } from './bookings-page.component';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';

describe('BookingsPageComponent', () => {
  let fixture: ComponentFixture<BookingsPageComponent>;
  const bookings = signal<any[]>([]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingsPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: DataService,
          useValue: {
            bookings,
            refreshBookings: () => {},
            createBooking: () => ({ subscribe: () => {} }),
            updateBookingStatus: () => ({ subscribe: () => {} }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ role: 'Administrador' }),
            hasAnyRole: () => true,
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BookingsPageComponent);
    fixture.detectChanges();
  });

  it('se crea con la lista de reservas real', () => {
    bookings.set([
      { id: 1, resourceId: 1, resourceNombre: 'Química', studentEmail: 'Ana', purpose: 'Práctica', startTime: '2026-11-30T10:00:00', endTime: '2026-11-30T11:00:00', status: 'SOLICITADA', createdAt: '', updatedAt: '' },
    ]);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Química');
  });

  it('muestra los estados del flujo', () => {
    bookings.set([
      { id: 1, resourceId: 1, resourceNombre: 'A', studentEmail: 'Ana', purpose: '', startTime: '', endTime: '', status: 'APROBADA', createdAt: '', updatedAt: '' },
      { id: 2, resourceId: 2, resourceNombre: 'B', studentEmail: 'Luis', purpose: '', startTime: '', endTime: '', status: 'CANCELADA', createdAt: '', updatedAt: '' },
    ]);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent.toUpperCase();
    expect(text).toContain('APROBADA');
    expect(text).toContain('CANCELADA');
  });
});

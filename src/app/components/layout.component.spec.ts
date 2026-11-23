import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { signal } from '@angular/core';

describe('LayoutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: signal({ name: 'Carmen Vidal', avatar: 'CV', role: 'Administrador', email: 'carmen@campus.cl' }), logout: () => {} } },
        { provide: DataService, useValue: { bookings: signal([]), labs: signal([]), resources: signal([]) } },
      ],
    }).compileComponents();
  });

  it('renderiza la navegación con las secciones principales', () => {
    const fixture = TestBed.createComponent(LayoutComponent);
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;
    ['Dashboard', 'Reservas', 'Catálogo'].forEach((t) => expect(text).withContext(t).toContain(t));
  });
});

import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { AuditPageComponent } from './audit-page.component';
import { BookingsPageComponent } from './bookings-page.component';
import { CatalogPageComponent } from './catalog-page.component';
import { ReportsPageComponent } from './reports-page.component';

/**
 * Regresión del QA: bajo el título de cada sección había un texto técnico ("ms-campuslab-bookings · /api/bookings/*")
 * y Reportería mostraba un aviso largo sobre Kafka cuando no tenía datos. Ninguno de los dos debe aparecer.
 *
 * Se usa el DataService real con HttpClient de pruebas sin responder nada: las páginas se renderizan con sus
 * listas vacías, que es justo el caso en que antes aparecía el aviso de Reportería.
 */
describe('Encabezados de las páginas', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { hasAnyRole: () => true, hasRole: () => true } },
      ],
    });
  });

  const paginas: Array<{ nombre: string; componente: Type<unknown>; titulo: string }> = [
    { nombre: 'Reservas', componente: BookingsPageComponent, titulo: 'Gestión de Reservas' },
    { nombre: 'Catálogo', componente: CatalogPageComponent, titulo: 'Catálogo de Recursos' },
    { nombre: 'Auditoría', componente: AuditPageComponent, titulo: 'Auditoría y Trazabilidad' },
    { nombre: 'Reportería', componente: ReportsPageComponent, titulo: 'Reportería & Analítica' },
  ];

  paginas.forEach(({ nombre, componente, titulo }) => {
    it(`${nombre}: muestra el título sin el texto técnico del microservicio debajo`, () => {
      const fixture = TestBed.createComponent(componente);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;

      const h1 = root.querySelector('h1');
      expect(h1?.textContent?.trim()).toBe(titulo);
      // No hay ningún párrafo pegado al título dentro de su bloque de cabecera
      expect(h1?.nextElementSibling).toBeNull();

      expect(root.textContent ?? '').not.toContain('ms-campuslab-');
    });
  });

  it('Reportería sin datos NO muestra el aviso de Kafka', () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const data = TestBed.inject(DataService);

    // Es el caso exacto en que antes aparecía el aviso
    expect(data.hourlyMetrics().length).toBe(0);
    expect(data.resourceUsage().length).toBe(0);

    const texto = root.textContent ?? '';
    expect(texto).not.toContain('no tiene datos todavía');
    expect(texto).not.toContain('Si Kafka no está corriendo');
    expect(texto).not.toContain('⚠️');
    expect(root.querySelector('.bg-amber-50')).toBeNull();
    // Las secciones siguen mostrando su propio estado vacío
    expect(texto).toContain('Sin datos en las últimas 24h');
  });
});

describe('DataService: stock de equipos al cambiar el estado de una reserva', () => {
  it('después de cambiar el estado recarga el catálogo para que el stock se vea actualizado', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const data = TestBed.inject(DataService);
    const http = TestBed.inject(HttpTestingController);
    // Descarta las cargas iniciales del constructor
    http.match(() => true);

    data.updateBookingStatus(5, 'APROBADA').subscribe();
    http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/bookings/5/status')).flush({
      id: 5, resourceId: 1, studentEmail: 'a@duocuc.cl', purpose: 'x', startTime: '2026-10-20T09:00:00',
      endTime: '2026-10-20T11:00:00', status: 'APROBADA', createdAt: '2026-10-20T08:00:00', updatedAt: '2026-10-20T08:00:00',
    });

    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/catalog/resources'));
    http.verify();
  });

  it('si el cambio de estado falla (p. ej. sin stock) NO recarga el catálogo', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const data = TestBed.inject(DataService);
    const http = TestBed.inject(HttpTestingController);
    http.match(() => true);

    let mensaje: string | undefined;
    data.updateBookingStatus(5, 'APROBADA').subscribe({ error: (err) => (mensaje = err.error?.message) });
    http
      .expectOne((r) => r.method === 'PUT' && r.url.endsWith('/bookings/5/status'))
      .flush({ message: "No hay stock disponible de 'Microscopio' (0 de 3)" }, { status: 409, statusText: 'Conflict' });

    expect(mensaje).toBe("No hay stock disponible de 'Microscopio' (0 de 3)");
    http.expectNone((r) => r.url.endsWith('/catalog/resources'));
    http.verify();
  });
});

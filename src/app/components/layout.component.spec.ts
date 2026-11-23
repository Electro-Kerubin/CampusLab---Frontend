//PARA TESTING
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { AppUser, Booking, CatalogResource, Lab } from '../models';

describe('LayoutComponent', () => {
  let fixture: ComponentFixture<LayoutComponent>;
  let comp: LayoutComponent;
  let auth: { currentUser: ReturnType<typeof signal<AppUser | null>>; logout: jasmine.Spy };
  let router: Router;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent ?? '';

  const bookings = signal<Booking[]>([]);
  const labs = signal<Lab[]>([]);
  const resources = signal<CatalogResource[]>([]);

  beforeEach(() => {
    auth = {
      currentUser: signal<AppUser | null>({
        name: 'Carmen Vidal',
        email: 'carmen.vidal@duocuc.cl',
        avatar: 'CV',
        role: 'Administrador',
        roles: ['ADMIN'],
      }),
      logout: jasmine.createSpy('logout').and.resolveTo(),
    };
    bookings.set([
      { id: 3, resourceId: 301, resourceNombre: 'Sala Cómputo C1', studentEmail: 'ana@duocuc.cl', purpose: 'Render' } as Booking,
      { id: 13, resourceId: 302, resourceNombre: 'Sala Cómputo C2', studentEmail: 'jorge@duocuc.cl', purpose: 'Video' } as Booking,
    ]);
    labs.set([{ id: 1, name: 'Laboratorio A102', location: 'Edificio A' } as Lab]);
    resources.set([{ id: 101, name: 'Impresora 3D Ultimaker', brand: 'Ultimaker', model: 'S5', labName: 'Laboratorio A102' } as CatalogResource]);

    TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: DataService, useValue: { bookings, labs, resources } },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(LayoutComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra las 5 secciones de navegación con sus rutas', () => {
    const links = Array.from(root().querySelectorAll('nav a')).map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(links).toEqual([
      ['Dashboard', '/dashboard'],
      ['Reservas', '/bookings'],
      ['Catálogo de Recursos', '/catalog'],
      ['Reportería', '/reports'],
      ['Auditoría', '/audit'],
    ]);
  });

  it('muestra el usuario de la sesión: iniciales, nombre y rol', () => {
    expect(text()).toContain('CV');
    expect(text()).toContain('Carmen Vidal');
    expect(text()).toContain('Administrador');
  });

  it('"Cerrar sesión" cierra la sesión en Microsoft y vuelve al login', async () => {
    comp.toggleMenu();
    fixture.detectChanges();
    expect(text()).toContain('carmen.vidal@duocuc.cl');

    const logoutBtn = Array.from(root().querySelectorAll('button')).find((b) => b.textContent?.includes('Cerrar sesión'))!;
    logoutBtn.click();
    await fixture.whenStable();

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(comp.menuOpen).toBeFalse();
  });

  describe('buscador global', () => {
    it('no busca con menos de 2 caracteres', () => {
      comp.searchQuery.set('s');
      expect(comp.bookingResults()).toEqual([]);
      expect(comp.hasResults()).toBeFalse();
    });

    it('encuentra reservas, laboratorios y recursos por texto', () => {
      comp.searchQuery.set('a102');
      expect(comp.labResults().map((l) => l.id)).toEqual([1]);
      expect(comp.resourceResults().map((r) => r.id)).toEqual([101]);
      comp.searchQuery.set('ultimaker');
      expect(comp.resourceResults().map((r) => r.id)).toEqual([101]);
      comp.searchQuery.set('jorge');
      expect(comp.bookingResults().map((b) => b.id)).toEqual([13]);
    });

    it('"#3" busca el id exacto; "3" busca ids que lo contienen', () => {
      comp.searchQuery.set('#3');
      expect(comp.bookingResults().map((b) => b.id)).toEqual([3]);
      comp.searchQuery.set('13');
      expect(comp.bookingResults().map((b) => b.id)).toEqual([13]);
    });

    it('Enter lleva a Reservas con el filtro si hay reservas que coinciden', () => {
      comp.searchQuery.set('  jorge ');
      comp.goToFirstResult();
      expect(router.navigate).toHaveBeenCalledWith(['/bookings'], { queryParams: { q: 'jorge' } });
    });

    it('Enter lleva al Catálogo si solo hay laboratorios o recursos', () => {
      comp.searchQuery.set('edificio a');
      comp.goToFirstResult();
      expect(router.navigate).toHaveBeenCalledWith(['/catalog'], { queryParams: { q: 'edificio a' } });
    });

    it('Enter sin resultados no navega', () => {
      comp.searchQuery.set('zzzz');
      comp.goToFirstResult();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('los resultados solo se muestran con foco y 2+ caracteres', () => {
      comp.searchQuery.set('jorge');
      expect(comp.showResults()).toBeFalse();
      comp.searchFocused.set(true);
      expect(comp.showResults()).toBeTrue();
    });
  });
});

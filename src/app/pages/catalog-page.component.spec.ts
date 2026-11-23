//PARA TESTING
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CatalogPageComponent } from './catalog-page.component';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { CatalogResource, Lab, Role } from '../models';

const lab = (id: number, name: string, location: string | null = null): Lab =>
  ({ id, name, location, capacity: 10, createdAt: '' });

const res = (id: number, extra: Partial<CatalogResource>) =>
  ({
    id,
    labId: 1,
    labName: 'Laboratorio A102',
    name: `Recurso ${id}`,
    resourceType: 'EQUIPO',
    status: 'DISPONIBLE',
    quantityTotal: 4,
    quantityAvailable: 2,
    reorderThreshold: 1,
    unitOfMeasure: null,
    ...extra,
  }) as CatalogResource;

describe('CatalogPageComponent', () => {
  let fixture: ComponentFixture<CatalogPageComponent>;
  let comp: CatalogPageComponent;
  let data: DataService;
  const root = () => fixture.nativeElement as HTMLElement;
  const text = () => root().textContent ?? '';
  const button = (label: string) =>
    Array.from(root().querySelectorAll('button')).find((b) => b.textContent?.includes(label));

  function create(roles: Role[], roleLabel = roles.join(' / ')) {
    TestBed.configureTestingModule({
      imports: [CatalogPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ role: roleLabel }),
            hasRole: (r: Role) => roles.includes(r),
            hasAnyRole: (...r: Role[]) => r.some((x) => roles.includes(x)),
          },
        },
      ],
    });
    data = TestBed.inject(DataService);
    data.labs.set([lab(1, 'Laboratorio A102', 'Edificio A'), lab(2, 'Sala Cómputo C1', 'Edificio C')]);
    data.resources.set([
      res(10, { name: 'Microscopio Zeiss' }),
      res(20, { name: 'Guantes', resourceType: 'INSUMO', quantityAvailable: 2, reorderThreshold: 5, unitOfMeasure: 'caja' }),
      res(21, { name: 'Filamento PLA', resourceType: 'INSUMO', quantityAvailable: 12, reorderThreshold: 5, unitOfMeasure: 'kg' }),
    ]);
    fixture = TestBed.createComponent(CatalogPageComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  }

  function goToTab(tab: 'labs' | 'equipment' | 'supplies') {
    comp.tab.set(tab);
    fixture.detectChanges();
  }

  it('las pestañas muestran el conteo de labs, equipos e insumos', () => {
    create(['ADMIN']);
    expect(comp.tabs().map((t) => [t.label, t.count])).toEqual([
      ['Laboratorios', 2],
      ['Equipos', 1],
      ['Insumos', 2],
    ]);
  });

  it('el buscador filtra laboratorios por nombre o ubicación y cambia el placeholder por pestaña', () => {
    create(['ADMIN']);
    comp.search.set('edificio c');
    fixture.detectChanges();
    expect(text()).toContain('Sala Cómputo C1');
    expect(text()).not.toContain('Laboratorio A102');

    goToTab('supplies');
    expect(comp.searchPlaceholder()).toBe('Buscar insumos...');
  });

  it('marca "Stock bajo" los insumos en o bajo su umbral de reposición', () => {
    create(['ADMIN']);
    goToTab('supplies');
    const rows = Array.from(root().querySelectorAll('tbody tr'));
    const row = (name: string) => rows.find((r) => r.textContent?.includes(name))!.textContent!;

    expect(row('Guantes')).toContain('Stock bajo');
    expect(row('Filamento PLA')).toContain('OK');
  });

  it('muestra el stock disponible/total y el estado legible de los equipos', () => {
    create(['ADMIN']);
    goToTab('equipment');
    expect(text()).toContain('2/4');
    expect(text()).toContain('Disponible');
    expect(comp.stockPct({ quantityAvailable: 2, quantityTotal: 4 })).toBe(50);
    expect(comp.stockPct({ quantityAvailable: 2, quantityTotal: null })).toBe(0);
  });

  describe('permisos por rol (iguales a @PreAuthorize del backend)', () => {
    it('ADMIN: puede agregar al catálogo y ajustar stock', () => {
      create(['ADMIN'], 'Administrador');
      expect(button('Agregar Laboratorio')).toBeDefined();
      expect(text()).not.toContain('solo lectura');
      goToTab('equipment');
      expect(button('Agregar Recurso')).toBeDefined();
      expect(button('Ajustar stock')).toBeDefined();
    });

    it('TECNICO: solo lectura del catálogo, pero puede ajustar stock', () => {
      create(['TECNICO'], 'Técnico');
      expect(text()).toContain('Tu rol (Técnico) tiene acceso de solo lectura al catálogo');
      expect(button('Agregar')).toBeUndefined();
      goToTab('equipment');
      expect(button('Ajustar stock')).toBeDefined();
    });

    it('ESTUDIANTE: ni agrega ni ajusta stock', () => {
      create(['ESTUDIANTE']);
      goToTab('supplies');
      expect(button('Agregar')).toBeUndefined();
      expect(button('Ajustar stock')).toBeUndefined();
    });
  });

  it('el botón de crear abre el modal según la pestaña: laboratorio o recurso del tipo activo', () => {
    create(['ADMIN']);
    button('Agregar Laboratorio')!.click();
    fixture.detectChanges();
    expect(comp.showLabModal()).toBeTrue();
    expect(root().querySelector('app-new-lab-modal')).not.toBeNull();

    comp.showLabModal.set(false);
    goToTab('supplies');
    button('Agregar Recurso')!.click();
    fixture.detectChanges();
    expect(comp.showResourceModal()).toBeTrue();
    expect(comp.activeResourceType()).toBe('INSUMO');
  });

  describe('ajustar stock', () => {
    beforeEach(() => create(['TECNICO']));

    it('envía el delta ingresado', () => {
      spyOn(window, 'prompt').and.returnValue('-3');
      spyOn(data, 'adjustStock').and.returnValue(of({} as CatalogResource));
      comp.promptAdjustStock(10, 'Microscopio Zeiss');
      expect(data.adjustStock).toHaveBeenCalledWith(10, { delta: -3 });
    });

    it('cancelar el prompt no hace nada', () => {
      spyOn(window, 'prompt').and.returnValue(null);
      spyOn(data, 'adjustStock');
      comp.promptAdjustStock(10, 'x');
      expect(data.adjustStock).not.toHaveBeenCalled();
      expect(comp.actionError()).toBeNull();
    });

    ['0', 'abc'].forEach((input) =>
      it(`rechaza "${input}" con un mensaje sin llamar al backend`, () => {
        spyOn(window, 'prompt').and.returnValue(input);
        spyOn(data, 'adjustStock');
        comp.promptAdjustStock(10, 'x');
        expect(data.adjustStock).not.toHaveBeenCalled();
        expect(comp.actionError()).toBe('Ingresa un número distinto de 0.');
      })
    );

    it('muestra el mensaje del backend si el ajuste falla', () => {
      spyOn(console, 'error');
      spyOn(window, 'prompt').and.returnValue('5');
      spyOn(data, 'adjustStock').and.returnValue(throwError(() => ({ error: { message: 'Stock insuficiente' } })));
      comp.promptAdjustStock(10, 'x');
      fixture.detectChanges();
      expect(text()).toContain('Stock insuficiente');
    });
  });

  describe('guardar desde los modales', () => {
    beforeEach(() => {
      create(['ADMIN']);
      spyOn(console, 'error');
    });

    it('laboratorio creado: cierra el modal', () => {
      spyOn(data, 'createLab').and.returnValue(of(lab(3, 'Nuevo')));
      comp.showLabModal.set(true);
      comp.onLabSaved({ name: 'Nuevo', capacity: 5 });
      expect(data.createLab).toHaveBeenCalledWith({ name: 'Nuevo', capacity: 5 });
      expect(comp.showLabModal()).toBeFalse();
    });

    it('error al crear laboratorio: deja el modal abierto y explica el motivo', () => {
      spyOn(data, 'createLab').and.returnValue(throwError(() => ({ status: 403 })));
      comp.showLabModal.set(true);
      comp.onLabSaved({ name: 'Nuevo', capacity: 5 });
      expect(comp.showLabModal()).toBeTrue();
      expect(comp.actionError()).toContain('No se pudo crear el laboratorio');
    });

    it('recurso creado: cierra el modal; con error muestra el mensaje del backend', () => {
      const payload = { labId: 1, categoryId: 1, name: 'X', resourceType: 'EQUIPO' as const };
      const create$ = spyOn(data, 'createResource').and.returnValue(of({} as CatalogResource));
      comp.showResourceModal.set(true);
      comp.onResourceSaved(payload);
      expect(comp.showResourceModal()).toBeFalse();

      create$.and.returnValue(throwError(() => ({ error: { message: "Los INSUMOS requieren 'unitOfMeasure'" } })));
      comp.showResourceModal.set(true);
      comp.onResourceSaved(payload);
      expect(comp.showResourceModal()).toBeTrue();
      expect(comp.actionError()).toBe("Los INSUMOS requieren 'unitOfMeasure'");
    });
  });
});

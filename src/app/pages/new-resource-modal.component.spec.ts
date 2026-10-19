import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataService } from '../services/data.service';
import { CreateResourceRequest, ResourceType } from '../models';
import { NewResourceModalComponent } from './catalog-page.component';

/**
 * Regresión del QA "Los INSUMOS requieren 'unitOfMeasure'" (409): el modal estaba fijo en EQUIPO y no
 * recibía la pestaña activa, así que en "Insumos" mostraba los campos de un equipo y enviaba
 * resourceType INSUMO sin unidad de medida.
 */
describe('NewResourceModalComponent', () => {
  let fixture: ComponentFixture<NewResourceModalComponent>;
  let emitted: CreateResourceRequest[];

  function create(resourceType: ResourceType): NewResourceModalComponent {
    TestBed.configureTestingModule({
      imports: [NewResourceModalComponent],
      providers: [
        {
          provide: DataService,
          useValue: { labs: signal([{ id: 1, name: 'Laboratorio A102' }]), categories: signal([{ id: 1, name: 'Insumos' }]) },
        },
      ],
    });
    fixture = TestBed.createComponent(NewResourceModalComponent);
    fixture.componentRef.setInput('resourceType', resourceType);
    const component = fixture.componentInstance;
    emitted = [];
    component.saved.subscribe((payload) => emitted.push(payload));
    fixture.detectChanges();
    return component;
  }

  function fillCommonFields(component: NewResourceModalComponent): void {
    component.name = 'Guantes de nitrilo';
    component.labId = 1;
    component.categoryId = 1;
    component.quantityTotal = 10;
  }

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('en la pestaña Insumos el formulario es de insumo: pide unidad de medida y no número de serie', () => {
    create('INSUMO');

    expect(text()).toContain('Nuevo Insumo');
    expect(text()).toContain('Stock inicial');
    expect(text()).not.toContain('Nuevo Equipo');
    expect(text()).not.toContain('Número de serie');
  });

  it('en la pestaña Equipos el formulario es de equipo: pide número de serie', () => {
    create('EQUIPO');

    expect(text()).toContain('Nuevo Equipo');
  });

  it('un insumo se envía como INSUMO con su unidad de medida y SIN datos de equipo', () => {
    const component = create('INSUMO');
    fillCommonFields(component);
    component.unitOfMeasure = '  caja ';
    // datos de equipo que quedaron escritos en el formulario no deben viajar con un insumo
    component.serialNumber = 'SN-1';
    component.brand = 'Marca';

    component.submit();

    expect(emitted.length).toBe(1);
    expect(emitted[0].resourceType).toBe('INSUMO');
    expect(emitted[0].unitOfMeasure).toBe('caja');
    expect(emitted[0].equipment).toBeUndefined();
  });

  it('un equipo se envía como EQUIPO con su serie y SIN unidad de medida', () => {
    const component = create('EQUIPO');
    fillCommonFields(component);
    component.serialNumber = ' SN-1 ';
    component.unitOfMeasure = 'caja';

    component.submit();

    expect(emitted[0].resourceType).toBe('EQUIPO');
    expect(emitted[0].equipment?.serialNumber).toBe('SN-1');
    expect(emitted[0].unitOfMeasure).toBeUndefined();
  });

  it('no deja guardar un insumo sin unidad de medida ni un equipo sin número de serie', () => {
    const insumo = create('INSUMO');
    fillCommonFields(insumo);
    expect(insumo.canSubmit()).toBeFalse();
    insumo.unitOfMeasure = 'kg';
    expect(insumo.canSubmit()).toBeTrue();

    TestBed.resetTestingModule();
    const equipo = create('EQUIPO');
    fillCommonFields(equipo);
    expect(equipo.canSubmit()).toBeFalse();
    equipo.serialNumber = 'SN-9';
    expect(equipo.canSubmit()).toBeTrue();
  });
});

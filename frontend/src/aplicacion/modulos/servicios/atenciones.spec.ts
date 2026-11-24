import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Cares } from './atenciones';
import { Auth } from '../../nucleo/autenticacion';
import type { AtencionReal } from '../../servicios/servicio-atenciones-api';

const CITA = '9007199254740993';
const SERVICIO = '9007199254740995';
const INSUMO = '9007199254740997';
const cita = {
  id_cita: CITA,
  id_paciente: '10',
  id_medico: '20',
  paciente: 'Paciente real',
  medico: 'Médico real',
  fecha_hora_inicio: '2026-12-01T14:00:00.000Z',
  motivo: 'Consulta',
  estado: 'CONFIRMADA',
};
const atencion: AtencionReal = {
  id_atencion: '9007199254740999',
  referencia: 'AT-REAL',
  id_cita: CITA,
  id_medico: '20',
  paciente: 'Paciente real',
  medico: 'Médico real',
  fecha_atencion: '2026-12-01T14:30:00.000Z',
  diagnostico: 'Control',
  notas: 'Notas',
  estado: 'COMPLETADA',
  servicios: [{ id_servicio: SERVICIO, nombre: 'Consulta general', cantidad: 1 }],
  insumos: [{ id_insumo: INSUMO, nombre: 'Material', unidad_medida: 'ml', cantidad: 1.25 }],
};

describe('Atenciones conectadas al backend', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Cares>;
  let route: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };

  beforeEach(() => {
    route = { snapshot: { queryParamMap: convertToParamMap({}) } };
    TestBed.configureTestingModule({
      imports: [Cares],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(Auth).guardarSesion({
      token: 'token-medico',
      token_type: 'Bearer',
      usuario: {
        id_usuario: '30',
        nombre_usuario: 'medico.real',
        correo: 'medico@example.test',
        nombre_completo: 'Médico real',
        rol: 'MEDICO',
        id_medico: '20',
      },
    });
  });
  afterEach(() => {
    http.verify();
  });

  function crear(desdeAgenda = false) {
    if (desdeAgenda) route.snapshot.queryParamMap = convertToParamMap({ cita: CITA });
    fixture = TestBed.createComponent(Cares);
    fixture.detectChanges();
    return fixture.componentInstance;
  }
  function cargar(guardada = false, pagina = 1, paciente = '') {
    for (const endpoint of ['catalogos', 'pendientes', 'paginados', 'resumen']) {
      const req = http.expectOne((request) => request.url.endsWith(`/atenciones/${endpoint}`));
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-medico');
      if (endpoint === 'catalogos')
        req.flush({
          data: {
            servicios: [{ id_servicio: SERVICIO, nombre: 'Consulta general' }],
            insumos: [
              {
                id_insumo: INSUMO,
                nombre: 'Material',
                unidad_medida: 'ml',
                stock_actual: guardada ? 8.75 : 10,
              },
            ],
          },
        });
      if (endpoint === 'pendientes') req.flush({ data: guardada ? [] : [cita] });
      if (endpoint === 'paginados') {
        expect(req.request.params.get('page')).toBe(String(pagina));
        expect(req.request.params.get('paciente') ?? '').toBe(paciente);
        req.flush({
          data: guardada ? [atencion] : [],
          paginacion: {
            pagina_actual: pagina,
            total_elementos: 11,
            total_paginas: 2,
            tiene_anterior: pagina > 1,
            tiene_siguiente: pagina < 2,
          },
        });
      }
      if (endpoint === 'resumen')
        req.flush({
          data: { total_atenciones: guardada ? 1 : 0, citas_pendientes: guardada ? 0 : 1 },
        });
    }
    fixture.detectChanges();
  }
  function completar(page: Cares) {
    page.open(CITA);
    page.form.patchValue({
      citaId: CITA,
      diagnostico: 'Control',
      notas: 'Notas',
      servicios: [SERVICIO],
    });
    page.consumos.push(page.consumptionGroup());
    page.consumos.at(0).patchValue({ insumoId: INSUMO, cantidad: 1.25 });
    fixture.detectChanges();
  }

  it('abre desde la agenda, guarda IDs completos y refresca historial, pendientes y stock', () => {
    const page = crear(true);
    cargar();
    const acceso = http.expectOne((req) => req.url.endsWith(`/cita/${CITA}`));
    acceso.flush({ data: { ...cita, puede_registrar: true } });
    expect(page.editing()).toBe(true);
    expect(page.form.controls.citaId.value).toBe(CITA);
    completar(page);
    page.save();
    page.save();
    const guardar = http.expectOne('http://localhost:3000/api/atenciones');
    expect(guardar.request.method).toBe('POST');
    expect(guardar.request.body).toEqual({
      id_cita: CITA,
      diagnostico: 'Control',
      notas: 'Notas',
      servicios: [{ id_servicio: SERVICIO, cantidad: 1 }],
      insumos: [{ id_insumo: INSUMO, cantidad: 1.25 }],
    });
    guardar.flush({ data: atencion });
    cargar(true);
    expect(page.editing()).toBe(false);
    expect(page.detail()?.id_atencion).toBe(atencion.id_atencion);
    expect(page.rows()).toEqual([atencion]);
    expect(page.eligible()).toEqual([]);
    expect(page.catalogos().insumos[0].stock_actual).toBe(8.75);
    expect(page.aviso()).toContain('Atención registrada');
  });

  it('conserva diagnóstico y consumos cuando el servidor rechaza el stock', () => {
    const page = crear();
    cargar();
    completar(page);
    const original = page.form.getRawValue();
    page.save();
    http
      .expectOne('http://localhost:3000/api/atenciones')
      .flush({ message: 'Stock insuficiente' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(page.editing()).toBe(true);
    expect(page.guardando()).toBe(false);
    expect(page.form.getRawValue()).toEqual(original);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Stock insuficiente',
    );
  });

  it('no abre una cita ajena cuando la API devuelve 403', () => {
    const page = crear(true);
    cargar();
    http
      .expectOne((req) => req.url.endsWith(`/cita/${CITA}`))
      .flush({ message: 'No puede acceder a esta cita' }, { status: 403, statusText: 'Forbidden' });
    expect(page.editing()).toBe(false);
    expect(page.error()).toContain('No puede acceder');
  });

  it('pagina y filtra pacientes en servidor, sin cargar registros demo', () => {
    const page = crear();
    cargar();
    page.cambiarPagina(1);
    cargar(false, 2);
    expect(page.pagina()).toBe(2);
    page.query.set('Paciente real');
    page.buscar();
    cargar(false, 1, 'Paciente real');
    expect(page.pagina()).toBe(1);
    expect(page.rows()).toEqual([]);
  });

  it('rechaza insumos repetidos antes de enviar la operación', () => {
    const page = crear();
    cargar();
    completar(page);
    page.consumos.push(page.consumptionGroup());
    page.consumos.at(1).patchValue({ insumoId: INSUMO, cantidad: 1 });
    page.save();
    expect(page.error()).toContain('No repitas');
    http.expectNone('http://localhost:3000/api/atenciones');
  });
});

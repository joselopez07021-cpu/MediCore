import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Patients } from './admision/pacientes';
import { Appointments } from './admision/citas';
import { Supplies } from './inventario/insumos';
import { Movements } from './inventario/movimientos';
import { Reports, generarCsv } from './reportes/reportes';
import { Agenda } from './admision/agenda';
import { Auth } from '../nucleo/autenticacion';
import { interceptorAutenticacion } from '../nucleo/interceptor-autenticacion';
import { BackendChatbotGateway } from '../servicios/servicio-chatbot';

const ID = '9007199254740993';
const paciente = {
  id_paciente: ID,
  nombre: 'Ana',
  apellido: 'Prueba',
  identificacion: 'TEST',
  fecha_nacimiento: '2000-01-01',
  telefono: '88888888',
  correo: 'ana@example.com',
  direccion: null,
  fecha_registro: '2026-01-01',
  activo: true,
};
const cita = {
  id_cita: ID,
  id_paciente: ID,
  id_medico: '2',
  paciente: 'Ana Prueba',
  medico: 'Medico Uno',
  fecha_hora_inicio: '2027-01-01T15:00:00Z',
  fecha_hora_fin: '2027-01-01T15:30:00Z',
  motivo: 'Consulta',
  estado: 'PROGRAMADA',
};
const insumo = {
  id_insumo: ID,
  id_categoria: '1',
  nombre: 'Material',
  codigo: 'INS-1',
  categoria: 'General',
  unidad_medida: 'ml',
  stock_actual: '9.75',
  stock_minimo: '2',
  estado: 'DISPONIBLE',
  activo: true,
  descripcion: null,
};
const reporte = {
  total_citas: 1,
  citas_atendidas: 0,
  total_atenciones: 0,
  total_servicios: 0,
  total_movimientos: 0,
  insumos_por_reponer: 0,
  citas_por_medico: [{ id: '2', nombre: 'Medico Uno', cantidad: 1, unidad: '' }],
  servicios: [],
  consumos: [],
};

describe('Operaciones de la interfaz conectadas a HTTP', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([interceptorAutenticacion])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(Auth).guardarSesion({
      token: 'token-integracion',
      token_type: 'Bearer',
      usuario: {
        id_usuario: '1',
        nombre_usuario: 'admin',
        correo: 'admin@example.com',
        nombre_completo: 'Admin',
        rol: 'ADMINISTRADOR',
        id_medico: null,
      },
    });
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });
  function responder(ruta: string, data: unknown) {
    http.expectOne('http://localhost:3000/api/' + ruta).flush({ message: 'Correcto', data });
  }

  it('registra paciente una sola vez, limpia el formulario y utiliza el registro del servidor', () => {
    const fixture = TestBed.createComponent(Patients);
    fixture.detectChanges();
    responder('pacientes', []);
    const page = fixture.componentInstance;
    page.formulario.patchValue({ ...paciente, nombre: ' Ana ' });
    page.guardar();
    page.guardar();
    const req = http.expectOne('http://localhost:3000/api/pacientes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.nombre).toBe('Ana');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-integracion');
    req.flush({ message: 'Creado', data: paciente });
    expect(page.pacientes()[0].id_paciente).toBe(ID);
    expect(page.guardando()).toBe(false);
    expect(page.formulario.controls.nombre.value).toBe('');
  });
  it('edita sin duplicar y conserva formulario e identidad ante un 409', () => {
    const fixture = TestBed.createComponent(Patients);
    fixture.detectChanges();
    responder('pacientes', [paciente]);
    const page = fixture.componentInstance;
    page.editar(paciente);
    page.formulario.patchValue({ telefono: '77777777' });
    page.guardar();
    const req = http.expectOne('http://localhost:3000/api/pacientes/' + ID);
    expect(req.request.method).toBe('PUT');
    req.flush({ message: 'Identificación duplicada' }, { status: 409, statusText: 'Conflict' });
    expect(page.idEnEdicion()).toBe(ID);
    expect(page.formulario.controls.telefono.value).toBe('77777777');
    expect(page.pacientes()).toHaveLength(1);
    page.guardar();
    http
      .expectOne('http://localhost:3000/api/pacientes/' + ID)
      .flush({ message: 'Actualizado', data: { ...paciente, telefono: '77777777' } });
    expect(page.idEnEdicion()).toBeNull();
    expect(page.pacientes()).toHaveLength(1);
    expect(page.pacientes()[0].telefono).toBe('77777777');
  });
  it('no cambia el estado local hasta que el backend confirma el PATCH', () => {
    const fixture = TestBed.createComponent(Patients);
    fixture.detectChanges();
    responder('pacientes', [paciente]);
    const page = fixture.componentInstance;
    page.cambiarEstado(paciente);
    expect(page.pacientes()[0].activo).toBe(true);
    const req = http.expectOne('http://localhost:3000/api/pacientes/' + ID + '/estado');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ activo: false });
    req.flush({ message: 'Desactivado', data: { ...paciente, activo: false } });
    expect(page.pacientes()[0].activo).toBe(false);
    page.editar(paciente);
    page.cancelarEdicion();
    expect(page.idEnEdicion()).toBeNull();
  });
  it('historial: consulta únicamente el paciente elegido y maneja el fallo sin perder la tabla', () => {
    const fixture = TestBed.createComponent(Patients);
    fixture.detectChanges();
    responder('pacientes', [paciente]);
    const page = fixture.componentInstance;
    page.verHistorial(paciente);
    http
      .expectOne('http://localhost:3000/api/pacientes/' + ID + '/citas')
      .flush({ message: 'Sin conexión' }, { status: 503, statusText: 'Unavailable' });
    expect(page.errorHistorial()).toBeTruthy();
    expect(page.pacientes()).toHaveLength(1);
    page.verHistorial(paciente);
    responder('pacientes/' + ID + '/citas', [cita]);
    expect(page.historial()[0].id_cita).toBe(ID);
  });
  it('asistente: envía el mensaje por HTTP sin transmitir el historial de conversación', () => {
    let respuesta = '';
    TestBed.inject(BackendChatbotGateway)
      .send({ message: 'Ver citas', history: [{ role: 'user', content: 'Dato anterior' }] })
      .subscribe((r) => (respuesta = r.message));
    const req = http.expectOne('http://localhost:3000/api/asistente');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ message: 'Ver citas' });
    req.flush({ message: 'Abre Agenda médica' });
    expect(respuesta).toBe('Abre Agenda médica');
  });
  it('citas: mantiene el ID string, muestra horario CR y conserva el editor ante conflicto', () => {
    const fixture = TestBed.createComponent(Appointments);
    fixture.detectChanges();
    responder('citas', [cita]);
    responder('pacientes', [paciente]);
    responder('medicos', []);
    const page = fixture.componentInstance;
    page.open(cita as never);
    expect(page.values().hora).toBe('09:00');
    page.save({
      id_paciente: ID,
      id_medico: '2',
      fecha: '2027-01-01',
      hora: '09:00',
      motivo: 'Cambio',
      estado: 'PROGRAMADA',
    });
    const req = http.expectOne('http://localhost:3000/api/citas/' + ID);
    expect(req.request.body.id_paciente).toBe(ID);
    req.flush({ message: 'Horario ocupado' }, { status: 409, statusText: 'Conflict' });
    expect(page.editing()?.id_cita).toBe(ID);
    expect(page.error()).toBe('Horario ocupado');
    expect(page.guardando()).toBe(false);
  });
  it('agenda de admisión consulta datos reales y filtra por identificador string', () => {
    const fixture = TestBed.createComponent(Agenda);
    fixture.detectChanges();
    responder('medicos', []);
    const req = http.expectOne((r) => r.url.endsWith('/citas/agenda'));
    req.flush({ data: [cita, { ...cita, id_cita: 'otro', id_medico: '3' }] });
    const page = fixture.componentInstance;
    page.doctor.set('2');
    expect(page.rows().map((c) => c.id_cita)).toEqual([ID]);
  });
  it('insumos: al editar no envía stock_actual y mantiene mínimo entero', () => {
    const fixture = TestBed.createComponent(Supplies);
    fixture.detectChanges();
    responder('insumos', [insumo]);
    responder('categorias-insumos', [{ id_categoria: '1', nombre: 'General' }]);
    const page = fixture.componentInstance;
    page.open(insumo);
    page.save({
      nombre: 'Material editado',
      id_categoria: '1',
      unidad_medida: 'ml',
      stock_minimo: '3',
      stock_actual: 999,
    });
    const req = http.expectOne('http://localhost:3000/api/insumos/' + ID);
    expect(req.request.body.stock_minimo).toBe(3);
    expect(req.request.body.stock_actual).toBeUndefined();
    req.flush({ message: 'No disponible' }, { status: 409, statusText: 'Conflict' });
    expect(page.editing()).toBeTruthy();
  });
  it('movimientos: actualiza el selector al abrir e incluye insumos nuevos sin existencias', () => {
    const fixture = TestBed.createComponent(Movements);
    fixture.detectChanges();
    responder('movimientos-inventario', []);
    responder('insumos', [insumo]);
    const page = fixture.componentInstance;
    page.open();
    page.open();
    expect(page.editing()).toBe(false);
    expect(page.cargando()).toBe(true);
    responder('insumos', [
      insumo,
      { ...insumo, id_insumo: '33', nombre: 'Insumo nuevo', stock_actual: '0', estado: 'AGOTADO' },
    ]);
    fixture.detectChanges();
    expect(page.editing()).toBe(true);
    expect(page.cargando()).toBe(false);
    const option = fixture.nativeElement.querySelector('[role="dialog"] option[value="33"]');
    expect(option?.textContent).toContain('Insumo nuevo · 0 ml');
  });
  it('movimientos: si falla la actualización del catálogo no abre un selector desactualizado', () => {
    const fixture = TestBed.createComponent(Movements);
    fixture.detectChanges();
    responder('movimientos-inventario', []);
    responder('insumos', [insumo]);
    const page = fixture.componentInstance;
    page.open();
    http.expectOne('http://localhost:3000/api/insumos').flush(
      { message: 'No se pudieron cargar los insumos' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    expect(page.editing()).toBe(false);
    expect(page.cargando()).toBe(false);
    expect(page.error()).toBe('No se pudieron cargar los insumos');
  });
  it('movimientos: rechaza doble envío y conserva el editor si no hay stock', () => {
    const fixture = TestBed.createComponent(Movements);
    fixture.detectChanges();
    responder('movimientos-inventario', []);
    responder('insumos', [insumo]);
    const page = fixture.componentInstance;
    page.open();
    responder('insumos', [insumo]);
    const datos = { id_insumo: ID, tipo_movimiento: 'SALIDA', cantidad: '100', motivo: 'Prueba' };
    page.save(datos);
    page.save(datos);
    const req = http.expectOne('http://localhost:3000/api/movimientos-inventario');
    expect(req.request.body.id_insumo).toBe(ID);
    req.flush({ message: 'Stock insuficiente' }, { status: 409, statusText: 'Conflict' });
    expect(page.editing()).toBe(true);
    expect(page.guardando()).toBe(false);
    expect(page.error()).toBe('Stock insuficiente');
  });
  it('reportes: envía filtros al servidor y rechaza períodos invertidos', () => {
    const fixture = TestBed.createComponent(Reports);
    fixture.detectChanges();
    responder('medicos', []);
    responder('reportes', reporte);
    const page = fixture.componentInstance;
    page.from.set('2026-02-01');
    page.to.set('2026-01-01');
    page.cargar();
    http.expectNone((r) => r.url.endsWith('/reportes'));
    page.to.set('2026-02-28');
    page.doctor.set(ID);
    expect(page.filtrosCambiados()).toBe(true);
    page.cargar();
    const req = http.expectOne((r) => r.url.endsWith('/reportes'));
    expect(req.request.params.get('id_medico')).toBe(ID);
    expect(req.request.params.get('fecha_hasta')).toBe('2026-02-28');
    req.flush({ data: reporte });
    expect(page.filtrosCambiados()).toBe(false);
  });
  it('CSV: escapa comillas, saltos y fórmulas de hojas de cálculo', () => {
    const csv = generarCsv([['=SUM(A1)', 'Una "cita"', 'dos\nlíneas', 1.25]]);
    expect(csv).toContain('"\'=SUM(A1)"');
    expect(csv).toContain('"Una ""cita"""');
    expect(csv).toContain('"dos\nlíneas"');
  });
});

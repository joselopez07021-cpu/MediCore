import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './rutas-aplicacion';
import { Auth } from './nucleo/autenticacion';
import { DemoStore } from './nucleo/almacen-demostracion';
import { seed } from './nucleo/datos-demostracion';
import { Cares } from './modulos/servicios/atenciones';
import { Patients } from './modulos/admision/pacientes';
import { RecordEditor } from './compartidos/editor-registros';
import { By } from '@angular/platform-browser';
import { Login } from './modulos/autenticacion/inicio-sesion';
import { Shell } from './estructura/estructura-principal';
import { Agenda } from './modulos/admision/agenda';
import { Dashboard } from './modulos/inicio/inicio';
import type { Role } from './nucleo/modelos';
import type { RespuestaLogin } from './servicios/servicio-autenticacion-api';
import { Api } from './servicios/servicio-api';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

describe('Páginas y permisos de MediCore', () => {
  function respuestaLogin(rol: Role, idMedico: string | null = null): RespuestaLogin {
    return {
      message: 'Inicio de sesión exitoso',
      data: {
        token: 'token-solo-para-pruebas',
        token_type: 'Bearer',
        usuario: {
          id_usuario: '1',
          nombre_usuario: 'usuario.prueba',
          correo: 'prueba@medicore.test',
          nombre_completo: 'Usuario de prueba',
          rol,
          id_medico: idMedico,
        },
      },
    };
  }

  function prepararSesion(rol: Exclude<Role, 'MEDICO'>): void {
    TestBed.inject(Auth).guardarSesion(respuestaLogin(rol).data);
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Api,
          useValue: {
            verificarConexion: () => of({
              status: 200,
              message: 'Conexión simulada para pruebas',
              data: { database: 'connected' },
            }),
          },
        },
      ],
    });
    TestBed.inject(DemoStore).data.set(seed());
  });
  it('renderiza todas las páginas principales con el perfil administrador', async () => {
    prepararSesion('ADMINISTRADOR');
    const harness = await RouterTestingHarness.create();
    const pages = [
      ['/inicio', 'Buen día'],
      ['/admision/pacientes', 'Pacientes'],
      ['/admision/citas', 'Citas médicas'],
      ['/admision/agenda', 'Agenda médica'],
      ['/admision/medicos', 'Directorio médico'],
      ['/servicios/atenciones', 'Atenciones médicas'],
      ['/servicios/catalogo', 'Servicios hospitalarios'],
      ['/inventario/insumos', 'Inventario hospitalario'],
      ['/inventario/movimientos', 'Movimientos de inventario'],
      ['/administracion/compras', 'Compras y abastecimiento'],
      ['/administracion/finanzas', 'Gestión financiera'],
      ['/administracion/rrhh', 'Recursos humanos'],
      ['/administracion/usuarios', 'Usuarios y roles'],
      ['/reportes', 'Reportes y análisis'],
    ];
    for (const [url, title] of pages) {
      await harness.navigateByUrl(url);
      expect(TestBed.inject(Router).url).toBe(url);
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent, url).toContain(title);
    }
  });
  it('redirige usuarios sin sesión al acceso y bloquea módulos de otro rol', async () => {
    const harness = await RouterTestingHarness.create('/inventario/insumos');
    expect(
      TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).queryParams['returnUrl'],
    ).toBe('/inventario/insumos');
    prepararSesion('ADMISION');
    await harness.navigateByUrl('/inventario/insumos');
    expect(TestBed.inject(Router).url).toBe('/inicio');
    await harness.navigateByUrl('/admision/pacientes');
    expect(harness.routeNativeElement?.textContent).toContain('Registrar paciente');
  });
  it('permite abrir un formulario reactivo y registrar un paciente sin reiniciarlo al detectar cambios', async () => {
    prepararSesion('ADMINISTRADOR');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admision/pacientes');
    const page = harness.routeDebugElement!.query(By.directive(Patients))
      .componentInstance as Patients;
    page.open(null);
    harness.detectChanges();
    await harness.fixture.whenStable();
    const editor = harness.routeDebugElement!.query(By.directive(RecordEditor))
      .componentInstance as RecordEditor;
    editor.form.patchValue({
      nombre: 'Paciente de prueba',
      documento: 'TEST-001',
      nacimiento: '1990-01-01',
      telefono: '617-555-0123',
      correo: 'test@example.com',
    });
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(editor.form.controls['nombre'].value).toBe('Paciente de prueba');
    editor.submit();
    harness.detectChanges();
    expect(TestBed.inject(DemoStore).data().pacientes.at(-1)?.nombre).toBe('Paciente de prueba');
  });
  it('permite al administrador registrar una atención en los datos de demostración', async () => {
    prepararSesion('ADMINISTRADOR');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/servicios/atenciones?cita=1');
    const page = harness.routeDebugElement!.query(By.directive(Cares)).componentInstance as Cares;
    expect(page.editing()).toBe(true);
    expect(page.form.controls.citaId.value).toBe('1');
    expect(page.eligible().some((x) => x.id === 1)).toBe(true);
    page.form.patchValue({ diagnostico: 'Control de prueba', servicios: [1] });
    page.consumos.push(page.consumptionGroup());
    page.consumos.at(0).patchValue({ insumoId: '1', cantidad: 2 });
    page.save();
    expect(
      TestBed.inject(DemoStore)
        .data()
        .citas.find((x) => x.id === 1)?.estado,
    ).toBe('ATENDIDA');
    expect(page.editing()).toBe(false);
  });
  it.each(['1', '9007199254740993'])(
    'consulta la agenda real sin asociar el ID médico %s con registros demo',
    async (idMedico) => {
      const http = TestBed.inject(HttpTestingController);
      const auth = TestBed.inject(Auth);
      const harness = await RouterTestingHarness.create('/login');
      const login = harness.routeDebugElement!.componentInstance as Login;
      login.form.patchValue({ username: 'medico.real', password: 'clave-de-prueba' });
      login.enter();
      const respuesta = respuestaLogin('MEDICO', idMedico);
      respuesta.data.usuario.nombre_completo = 'Profesional de PostgreSQL';
      http.expectOne('http://localhost:3000/api/auth/login').flush(respuesta);
      await harness.fixture.whenStable();
      expect(auth.idMedicoReal()).toBe(idMedico);
      expect(auth.medicoId()).toBeNull();
      expect(harness.routeNativeElement?.textContent).toContain('Profesional de PostgreSQL');
      const inicio = harness.routeDebugElement!.query(By.directive(Dashboard)).componentInstance as Dashboard;
      expect(inicio.day()).toEqual([]);

      await harness.navigateByUrl('/admision/agenda');
      const agenda = harness.routeDebugElement!.query(By.directive(Agenda)).componentInstance as Agenda;
      expect(agenda.rows()).toEqual([]);
      const solicitud = http.expectOne((req) => req.url.endsWith('/citas/agenda'));
      expect(solicitud.request.method).toBe('GET');
      expect(solicitud.request.params.get('fecha')).toBe(agenda.date());
      expect(solicitud.request.params.has('id_medico')).toBe(false);
      expect(solicitud.request.headers.get('Authorization')).toBe('Bearer token-solo-para-pruebas');
      const cita = {
        id_cita: 'cita-real', id_paciente: 'paciente-real', id_medico: idMedico,
        paciente: 'Paciente de PostgreSQL', medico: 'Profesional de PostgreSQL',
        fecha_hora_inicio: '2026-11-24T14:30:00.000Z', motivo: 'Consulta real', estado: 'CONFIRMADA',
      };
      solicitud.flush({ message: 'Agenda', data: [cita, { ...cita, id_cita: 'otra-cita', id_medico: 'otro-medico' }] });
      harness.detectChanges();
      expect(agenda.citasReales().map((item) => item.id_cita)).toEqual(['cita-real']);
      expect(harness.routeNativeElement?.textContent).toContain('Paciente de PostgreSQL');
      expect(harness.routeNativeElement?.textContent).toContain('08:30');
      expect(harness.routeNativeElement?.textContent).not.toContain('Ana Sofía Martínez');

      agenda.date.set('2026-11-25');
      harness.detectChanges();
      expect(agenda.citasReales()).toEqual([]);
      http.expectOne((req) => req.url.endsWith('/citas/agenda') && req.params.get('fecha') === '2026-11-25')
        .flush({ message: 'Agenda', data: [] });
      harness.detectChanges();
      expect(harness.routeNativeElement?.textContent).toContain('No hay citas registradas');

      agenda.date.set('2026-11-26');
      harness.detectChanges();
      http.expectOne((req) => req.url.endsWith('/citas/agenda'))
        .flush({ message: 'Error' }, { status: 503, statusText: 'Unavailable' });
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar');
      expect(agenda.citasReales()).toEqual([]);

      await harness.navigateByUrl('/servicios/atenciones?cita=1');
      const atenciones = harness.routeDebugElement!.query(By.directive(Cares)).componentInstance as Cares;
      expect(atenciones.eligible()).toEqual([]);
      expect(atenciones.rows()).toEqual([]);
      expect(atenciones.editing()).toBe(false);
      atenciones.open(1);
      expect(atenciones.editing()).toBe(false);
      const antes = JSON.stringify(TestBed.inject(DemoStore).data());
      atenciones.form.patchValue({ citaId: '1', diagnostico: 'No guardar en demo', servicios: [1] });
      atenciones.save();
      expect(JSON.stringify(TestBed.inject(DemoStore).data())).toBe(antes);
      expect(atenciones.error()).toContain('pendiente de integración');
      auth.logout();
      expect(auth.idMedicoReal()).toBeNull();
      http.verify();
    },
  );
  it('no consulta ni muestra agenda demo si la sesión médica carece de ID real', async () => {
    TestBed.inject(Auth).guardarSesion(respuestaLogin('MEDICO').data);
    const harness = await RouterTestingHarness.create('/admision/agenda');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent)
      .toContain('perfil médico válido');
    TestBed.inject(HttpTestingController).expectNone((req) => req.url.endsWith('/citas/agenda'));
    const agenda = harness.routeDebugElement!.query(By.directive(Agenda)).componentInstance as Agenda;
    expect(agenda.rows()).toEqual([]);
  });
  it('rechaza el login cuando el servidor devuelve 401', async () => {
    const harness = await RouterTestingHarness.create('/login');
    const login = harness.routeDebugElement!.componentInstance as Login;
    const http = TestBed.inject(HttpTestingController);

    login.form.patchValue({
      username: 'admin.demo',
      password: 'incorrecta',
    });

    login.enter();

    const solicitud = http.expectOne(
      'http://localhost:3000/api/auth/login',
    );

    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual({
      nombre_usuario: 'admin.demo',
      password: 'incorrecta',
    });

    solicitud.flush(
      { message: 'Credenciales inválidas o cuenta deshabilitada' },
      { status: 401, statusText: 'Unauthorized' },
    );

    harness.detectChanges();

    expect(TestBed.inject(Auth).usuario()).toBeNull();
    expect(TestBed.inject(Auth).token()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(
      harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent,
    ).toContain('Credenciales inválidas');

    http.verify();
  });
  it('valida el formulario, inicia sesión por HTTP y permite navegar hasta cerrar sesión', async () => {
    const auth = TestBed.inject(Auth);
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/administracion/usuarios');
    const login = harness.routeDebugElement!.componentInstance as Login;
    expect(login.destinationName).toBe('Usuarios');
    login.enter();
    expect(login.form.invalid).toBe(true);
    http.expectNone('http://localhost:3000/api/auth/login');
    login.form.patchValue({ username: 'admin.demo', password: 'Admin123!' });
    login.enter();
    expect(login.enviando()).toBe(true);
    // Un segundo envío mientras esperamos no debe duplicar la solicitud.
    login.enter();
    const solicitud = http.expectOne('http://localhost:3000/api/auth/login');
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual({
      nombre_usuario: 'admin.demo',
      password: 'Admin123!',
    });
    expect(auth.usuario()).toBeNull();
    solicitud.flush(respuestaLogin('ADMINISTRADOR'));
    await harness.fixture.whenStable();
    expect(login.enviando()).toBe(false);
    expect(auth.usuario()?.rol).toBe('ADMINISTRADOR');
    expect(auth.token()).toBe('token-solo-para-pruebas');
    expect(TestBed.inject(Router).url).toBe('/administracion/usuarios');
    await harness.navigateByUrl('/administracion/finanzas');
    expect(TestBed.inject(Router).url).toBe('/administracion/finanzas');
    await harness.navigateByUrl('/inventario/insumos');
    expect(TestBed.inject(Router).url).toBe('/inventario/insumos');
    await harness.navigateByUrl('/inicio');
    await harness.navigateByUrl('/administracion/usuarios');
    expect(TestBed.inject(Router).url).toBe('/administracion/usuarios');
    expect(auth.role()).toBe('ADMINISTRADOR');
    http.expectNone('http://localhost:3000/api/auth/login');
    (harness.routeDebugElement!.componentInstance as Shell).logout();
    await harness.fixture.whenStable();
    expect(auth.usuario()).toBeNull();
    expect(auth.token()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/login');
    await harness.navigateByUrl('/administracion/usuarios');
    expect(TestBed.inject(Router).url).toContain('/login');
    http.verify();
  });
  it('no autoriza el acceso con solo un rol demo guardado en el navegador', async () => {
    sessionStorage.setItem('medicore-role', 'INVENTARIO');
    const harness = await RouterTestingHarness.create('/inventario/insumos');
    const auth = TestBed.inject(Auth);
    expect(auth.usuario()).toBeNull();
    expect(auth.token()).toBeNull();
    expect(auth.can(['INVENTARIO'])).toBe(false);
    const url = TestBed.inject(Router).parseUrl(TestBed.inject(Router).url);
    expect(url.root.children['primary'].segments.map((segment) => segment.path)).toEqual(['login']);
    expect(url.queryParams['returnUrl']).toBe('/inventario/insumos');
    expect(harness.routeDebugElement!.componentInstance).toBeInstanceOf(Login);
  });
  it('conserva el destino al iniciar sesión y no permite redirecciones externas ni elevar permisos', async () => {
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/inventario/movimientos');
    let login = harness.routeDebugElement!.componentInstance as Login;
    login.form.patchValue({ username: 'inventario.demo', password: 'Inventario123!' });
    login.enter();
    http.expectOne('http://localhost:3000/api/auth/login').flush(respuestaLogin('INVENTARIO'));
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/inventario/movimientos');
    await harness.navigateByUrl('/administracion/usuarios');
    expect(TestBed.inject(Router).url).toBe('/inicio');
    expect(TestBed.inject(Auth).role()).toBe('INVENTARIO');
    TestBed.inject(Auth).logout();
    await harness.navigateByUrl('/login?returnUrl=https%3A%2F%2Fexample.com');
    login = harness.routeDebugElement!.componentInstance as Login;
    expect(login.destination).toBeNull();
    login.form.patchValue({ username: 'admin.demo', password: 'Admin123!' });
    login.enter();
    http.expectOne('http://localhost:3000/api/auth/login').flush(respuestaLogin('ADMINISTRADOR'));
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/inicio');
    http.verify();
  });
});

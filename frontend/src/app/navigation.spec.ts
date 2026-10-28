import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { Auth } from './core/auth';
import { DemoStore } from './core/demo-store';
import { seed } from './core/demo-data';
import { Cares } from './features/servicios/cares';
import { Patients } from './features/admision/patients';
import { RecordEditor } from './shared/record-editor';
import { By } from '@angular/platform-browser';

describe('Páginas y permisos de MediCore', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    TestBed.inject(DemoStore).data.set(seed());
  });
  it('renderiza todas las páginas principales con el perfil administrador', async () => {
    TestBed.inject(Auth).login('ADMINISTRADOR');
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
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent, url).toContain(title);
    }
  });
  it('redirige usuarios sin sesión al acceso y bloquea módulos de otro rol', async () => {
    const harness = await RouterTestingHarness.create('/inventario/insumos');
    expect(TestBed.inject(Router).url).toBe('/login');
    TestBed.inject(Auth).login('ADMISION');
    await harness.navigateByUrl('/inventario/insumos');
    expect(TestBed.inject(Router).url).toBe('/inicio');
    await harness.navigateByUrl('/admision/pacientes');
    expect(harness.routeNativeElement?.textContent).toContain('Registrar paciente');
  });
  it('permite abrir un formulario reactivo y registrar un paciente sin reiniciarlo al detectar cambios', async () => {
    TestBed.inject(Auth).login('ADMINISTRADOR');
    const harness = await RouterTestingHarness.create('/admision/pacientes');
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
  it('abre una atención desde agenda y conserva solo citas propias para el médico', async () => {
    TestBed.inject(Auth).login('MEDICO');
    const harness = await RouterTestingHarness.create('/servicios/atenciones?cita=1');
    const page = harness.routeDebugElement!.query(By.directive(Cares)).componentInstance as Cares;
    expect(page.editing()).toBe(true);
    expect(page.form.controls.citaId.value).toBe('1');
    expect(page.eligible().every((x) => x.medicoId === 1)).toBe(true);
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
});

import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Auth, CLAVE_TOKEN } from './autenticacion';
import { restaurarSesionInicial } from './inicializar-sesion';
import { interceptorAutenticacion } from './interceptor-autenticacion';
import { vi } from 'vitest';

const usuario = {
  id_usuario: '1',
  nombre_usuario: 'medico.real',
  nombre_completo: 'Profesional real',
  correo: 'medico@example.test',
  rol: 'MEDICO' as const,
  id_medico: '9007199254740993',
};
describe('Restauración y expiración de sesión', () => {
  let http: HttpTestingController;
  const router = { url: '/servicios/atenciones', navigate: vi.fn(() => Promise.resolve(true)) };
  beforeEach(() => {
    sessionStorage.clear();
    router.navigate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([interceptorAutenticacion])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });
  it('no inicia sesión a partir de roles demo y no solicita identidad si falta token', async () => {
    sessionStorage.setItem('medicore-role', 'ADMINISTRADOR');
    await TestBed.runInInjectionContext(restaurarSesionInicial);
    expect(TestBed.inject(Auth).usuario()).toBeNull();
    http.expectNone('http://localhost:3000/api/auth/me');
  });
  it('valida el token antes de restaurar identidad y conserva el ID completo', async () => {
    sessionStorage.setItem(CLAVE_TOKEN, 'token-guardado');
    const restauracion = TestBed.runInInjectionContext(restaurarSesionInicial);
    expect(TestBed.inject(Auth).usuario()).toBeNull();
    const req = http.expectOne('http://localhost:3000/api/auth/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-guardado');
    req.flush({ data: usuario });
    await restauracion;
    expect(TestBed.inject(Auth).usuario()).toEqual(usuario);
    expect(TestBed.inject(Auth).idMedicoReal()).toBe('9007199254740993');
    TestBed.inject(Auth).logout();
    expect(sessionStorage.getItem(CLAVE_TOKEN)).toBeNull();
  });
  it('elimina un token rechazado durante la restauración', async () => {
    sessionStorage.setItem(CLAVE_TOKEN, 'token-expirado');
    const restauracion = TestBed.runInInjectionContext(restaurarSesionInicial);
    http
      .expectOne('http://localhost:3000/api/auth/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await restauracion;
    expect(TestBed.inject(Auth).token()).toBeNull();
    expect(sessionStorage.getItem(CLAVE_TOKEN)).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('limpia la sesión y conserva el destino cuando una API protegida devuelve 401', () => {
    const auth = TestBed.inject(Auth);
    auth.guardarSesion({ token: 'token-prueba', token_type: 'Bearer', usuario });
    let status = 0;
    TestBed.inject(HttpClient)
      .get('http://localhost:3000/api/atenciones/resumen')
      .subscribe({
        error: (error) => {
          status = error.status;
        },
      });
    const req = http.expectOne('http://localhost:3000/api/atenciones/resumen');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-prueba');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401);
    expect(auth.usuario()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/servicios/atenciones' },
    });
  });
  it('no envía tokens a otros sitios ni cierra sesión por errores de esos sitios', () => {
    const auth = TestBed.inject(Auth);
    auth.guardarSesion({ token: 'token-prueba', token_type: 'Bearer', usuario });
    TestBed.inject(HttpClient)
      .get('https://example.test/api')
      .subscribe({ error: () => {} });
    const req = http.expectOne('https://example.test/api');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.usuario()).toEqual(usuario);
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('un 403 conserva la sesión y propaga el error de permisos', () => {
    const auth = TestBed.inject(Auth);
    auth.guardarSesion({ token: 'token-prueba', token_type: 'Bearer', usuario });
    let status = 0;
    TestBed.inject(HttpClient)
      .get('http://localhost:3000/api/atenciones/cita/2')
      .subscribe({
        error: (error) => {
          status = error.status;
        },
      });
    http
      .expectOne('http://localhost:3000/api/atenciones/cita/2')
      .flush({}, { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403);
    expect(auth.usuario()).toEqual(usuario);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

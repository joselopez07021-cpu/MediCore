import { Injectable, signal, inject, computed } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from './modelos';
import { DemoStore } from './almacen-demostracion';
import type { RespuestaLogin } from '../servicios/servicio-autenticacion-api';

export const CLAVE_TOKEN = 'medicore-token';

// Credenciales públicas, únicamente para presentar el flujo de acceso.
export const DEMO_ACCOUNTS: Record<Role, string> = {
  ADMINISTRADOR: 'admin',
  ADMISION: 'admision',
  MEDICO: 'medico',
  INVENTARIO: 'inventario',
};
export const DEMO_PASSWORD = 'demo123';

@Injectable({ providedIn: 'root' })
export class Auth {

  private sesionReal = signal<RespuestaLogin['data'] | null>(null);

  readonly usuario = computed(
    () => this.sesionReal()?.usuario ?? null,
  );

  readonly token = computed(
    () => this.sesionReal()?.token ?? null,
  );

  // Este ID pertenece a PostgreSQL; nunca debe usarse como ID de DemoStore.
  readonly idMedicoReal = computed(() =>
    this.usuario()?.rol === 'MEDICO' ? this.usuario()?.id_medico ?? null : null,
  );

  guardarSesion(datos: RespuestaLogin['data']): void {
    this.sesionReal.set(datos);
    this.role.set(datos.usuario.rol);
    this.medicoId.set(null);
    try { sessionStorage.setItem(CLAVE_TOKEN, datos.token); } catch { }
  }

  private store = inject(DemoStore);
  readonly medicoId = signal<number | null>(this.restoreDoctor());
  readonly role = signal<Role | null>(this.restore());
  private restoreDoctor(): number | null {
    try {
      const id = Number(sessionStorage.getItem('medicore-medico'));
      return this.store.data().medicos.some((m) => m.id === id) ? id : null;
    } catch {
      return null;
    }
  }
  private restore(): Role | null {
    try {
      const r = sessionStorage.getItem('medicore-role');
      if (r === 'MEDICO' && this.medicoId() === null) return null;
      return ['ADMINISTRADOR', 'ADMISION', 'MEDICO', 'INVENTARIO'].includes(r || '')
        ? (r as Role)
        : null;
    } catch {
      return null;
    }
  }
  login(role: Role, medicoId?: number) {
    if (role === 'MEDICO' && !this.store.data().medicos.some((m) => m.id === medicoId))
      throw Error('Selecciona un médico registrado.');
    this.medicoId.set(role === 'MEDICO' ? medicoId! : null);
    this.role.set(role);
    try {
      if (this.medicoId() !== null)
        sessionStorage.setItem('medicore-medico', String(this.medicoId()));
      else sessionStorage.removeItem('medicore-medico');
      sessionStorage.setItem('medicore-role', role);
    } catch { }
  }
  logout() {
    this.sesionReal.set(null);
    this.role.set(null);
    this.medicoId.set(null);
    try {
      sessionStorage.removeItem(CLAVE_TOKEN);
      sessionStorage.removeItem('medicore-medico');
      sessionStorage.removeItem('medicore-role');
    } catch { }
  }
  can(roles: Role[]): boolean {
    const rol = this.usuario()?.rol;

    return !!rol && (
      rol === 'ADMINISTRADOR' || roles.includes(rol)
    );
  }
  verifyCredentials(role: Role, username: string, password: string) {
    return username.trim().toLowerCase() === DEMO_ACCOUNTS[role] && password === DEMO_PASSWORD;
  }
}
export const sessionGuard: CanActivateFn = (_, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return auth.usuario() && auth.token()
    ? true
    : router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
};

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (!auth.usuario() || !auth.token()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  return auth.can(route.data['roles'] || [])
    ? true
    : router.createUrlTree(['/inicio']);
};

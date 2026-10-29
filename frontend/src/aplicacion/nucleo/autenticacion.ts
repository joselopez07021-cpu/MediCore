import { Injectable, signal, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from './modelos';
import { DemoStore } from './almacen-demostracion';

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
    } catch {}
  }
  logout() {
    this.role.set(null);
    this.medicoId.set(null);
    try {
      sessionStorage.removeItem('medicore-medico');
      sessionStorage.removeItem('medicore-role');
    } catch {}
  }
  can(roles: Role[]) {
    return this.role() === 'ADMINISTRADOR' || roles.includes(this.role()!);
  }
  verifyCredentials(role: Role, username: string, password: string) {
    return username.trim().toLowerCase() === DEMO_ACCOUNTS[role] && password === DEMO_PASSWORD;
  }
}
export const sessionGuard: CanActivateFn = (_, state) =>
  inject(Auth).role()
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (!auth.role())
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  return auth.can(route.data['roles'] || []) ? true : router.createUrlTree(['/inicio']);
};

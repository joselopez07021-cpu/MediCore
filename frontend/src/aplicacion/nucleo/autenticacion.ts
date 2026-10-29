import { Injectable, signal, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from './modelos';
import { DemoStore } from './almacen-demostracion';
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
}
export const sessionGuard: CanActivateFn = () =>
  inject(Auth).role() ? true : inject(Router).createUrlTree(['/login']);
export const roleGuard: CanActivateFn = (route) =>
  inject(Auth).can(route.data['roles'] || []) ? true : inject(Router).createUrlTree(['/inicio']);

import { Injectable, signal, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from './models';
@Injectable({ providedIn: 'root' })
export class Auth {
  readonly role = signal<Role | null>(this.restore());
  private restore(): Role | null {
    try {
      const r = sessionStorage.getItem('medicore-role');
      return ['ADMINISTRADOR', 'ADMISION', 'MEDICO', 'INVENTARIO'].includes(r || '')
        ? (r as Role)
        : null;
    } catch {
      return null;
    }
  }
  login(role: Role) {
    this.role.set(role);
    try {
      sessionStorage.setItem('medicore-role', role);
    } catch {}
  }
  logout() {
    this.role.set(null);
    try {
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

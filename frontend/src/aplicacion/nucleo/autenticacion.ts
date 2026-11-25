import { Injectable, signal, inject, computed } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { Role } from './modelos';
import type { RespuestaLogin } from '../servicios/servicio-autenticacion-api';
export const CLAVE_TOKEN = 'medicore-token';
@Injectable({ providedIn: 'root' })
export class Auth {
  private sesionReal = signal<RespuestaLogin['data'] | null>(null);
  readonly usuario = computed(() => this.sesionReal()?.usuario ?? null);
  readonly token = computed(() => this.sesionReal()?.token ?? null);
  readonly role = computed(() => this.usuario()?.rol ?? null);
  readonly idMedicoReal = computed(() =>
    this.usuario()?.rol === 'MEDICO' ? (this.usuario()?.id_medico ?? null) : null,
  );
  guardarSesion(datos: RespuestaLogin['data']): void {
    this.sesionReal.set(datos);
    try {
      sessionStorage.setItem(CLAVE_TOKEN, datos.token);
    } catch {}
  }
  logout(): void {
    this.sesionReal.set(null);
    try {
      sessionStorage.removeItem(CLAVE_TOKEN);
      sessionStorage.removeItem('medicore-role');
      sessionStorage.removeItem('medicore-medico');
    } catch {}
  }
  can(roles: Role[]): boolean {
    const rol = this.usuario()?.rol;
    return !!rol && (rol === 'ADMINISTRADOR' || roles.includes(rol));
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

  return auth.can(route.data['roles'] || []) ? true : router.createUrlTree(['/inicio']);
};

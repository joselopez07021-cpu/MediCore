import { inject } from '@angular/core';
import { catchError, firstValueFrom, map, of, tap, timeout } from 'rxjs';
import { Auth, CLAVE_TOKEN } from './autenticacion';
import { AutenticacionApi } from '../servicios/servicio-autenticacion-api';

export function restaurarSesionInicial(): Promise<void> {
  const auth = inject(Auth);
  const api = inject(AutenticacionApi);
  let token: string | null = null;
  try {
    token = sessionStorage.getItem(CLAVE_TOKEN);
  } catch {}
  if (!token) {
    auth.logout();
    return Promise.resolve();
  }
  // Se conserva solo el token. Rol, nombre e identidad se vuelven a consultar.
  const tokenGuardado = token;
  return firstValueFrom(
    api.consultarUsuario(tokenGuardado).pipe(
      timeout(10_000),
      tap(({ data }) =>
        auth.guardarSesion({ token: tokenGuardado, token_type: 'Bearer', usuario: data }),
      ),
      map(() => undefined),
      catchError(() => {
        auth.logout();
        return of(undefined);
      }),
    ),
  );
}

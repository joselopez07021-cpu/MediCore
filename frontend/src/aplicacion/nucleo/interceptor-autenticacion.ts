import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Auth } from './autenticacion';
import { API_CONFIG } from './configuracion-api';

export const interceptorAutenticacion: HttpInterceptorFn = (request, next) => {
  const base = API_CONFIG.baseUrl;
  if (request.url !== base && !request.url.startsWith(`${base}/`)) return next(request);
  const auth = inject(Auth);
  const router = inject(Router);
  const login = request.url === `${base}/auth/login`;
  const token = auth.token();
  const enviada =
    token && !login ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  return next(enviada).pipe(
    catchError((error) => {
      if (error.status === 401 && !login) {
        auth.logout();
        // La restauración inicial deja que el guard decida el destino al terminar.
        if (request.url !== `${base}/auth/me` && !router.url.startsWith('/login')) {
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      }
      return throwError(() => error);
    }),
  );
};

import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
} from '@angular/core';

import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { restaurarSesionInicial } from './nucleo/inicializar-sesion';
import { interceptorAutenticacion } from './nucleo/interceptor-autenticacion';

import { routes } from './rutas-aplicacion';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([interceptorAutenticacion])),
    provideAppInitializer(restaurarSesionInicial),
  ],
};

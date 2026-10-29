import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './aplicacion/configuracion-aplicacion';
import { App } from './aplicacion/aplicacion';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

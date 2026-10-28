
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { Api } from './services/api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {

  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);

  mensaje = 'Conectando con MediCore...';
  estado = '';

  ngOnInit(): void {
    this.api.verificarConexion().subscribe({
      next: (respuesta) => {
        this.mensaje = respuesta.mensaje;
        this.estado = respuesta.estado;

        this.cdr.detectChanges();
      },
      error: (error) => {
        this.mensaje = 'Error al conectar con el backend';
        this.estado = 'Verifica que Node.js esté ejecutándose';

        console.error(error);
        this.cdr.detectChanges();
      }
    });
  }
}

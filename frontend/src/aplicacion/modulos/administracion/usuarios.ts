import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import { ConsultasApi, UsuarioDto } from '../../servicios/servicio-operaciones-api';
import { mensajeError } from '../../nucleo/utilidades-api';
@Component({
  standalone: true,
  imports: [PageHeader],
  template: ` <mc-page-header
      title="Usuarios y roles"
      subtitle="Directorio de cuentas y perfiles del sistema."
      section="ADMINISTRACIÓN / ACCESO"
    >
      <button class="btn-secondary" [disabled]="cargando()" (click)="cargar()">Actualizar</button>
    </mc-page-header>
    @if (error()) {
      <p class="error mb-4" role="alert">{{ error() }}</p>
    }
    <section class="card">
      <div class="toolbar">
        <input
          aria-label="Buscar usuarios"
          placeholder="Nombre, usuario o rol…"
          (input)="query.set($any($event.target).value)"
        />
      </div>
      @if (cargando()) {
        <p class="p-5" role="status">Cargando usuarios…</p>
      }
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (u of rows(); track u.id_usuario) {
              <tr>
                <td>{{ u.nombre_completo }}</td>
                <td>{{ u.nombre_usuario }}</td>
                <td>{{ u.correo }}</td>
                <td>{{ u.rol }}</td>
                <td>{{ u.activo ? 'Activo' : 'Inactivo' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="empty">No se encontraron usuarios.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>`,
})
export class Users {
  private api = inject(ConsultasApi);
  private destroyRef = inject(DestroyRef);
  usuarios = signal<UsuarioDto[]>([]);
  query = signal('');
  error = signal('');
  cargando = signal(false);
  rows = computed(() =>
    this.usuarios().filter((u) =>
      `${u.nombre_completo} ${u.nombre_usuario} ${u.rol}`
        .toLowerCase()
        .includes(this.query().trim().toLowerCase()),
    ),
  );
  constructor() {
    this.cargar();
  }
  cargar() {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.error.set('');
    this.api
      .usuarios()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.usuarios.set(r.data);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      });
  }
}

import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import { ConsultasApi, ServicioDto } from '../../servicios/servicio-operaciones-api';
import { mensajeError } from '../../nucleo/utilidades-api';
@Component({
  standalone: true,
  imports: [PageHeader],
  template: ` <mc-page-header
      title="Servicios hospitalarios"
      subtitle="Catálogo disponible para registrar atenciones."
      section="SERVICIOS / CATÁLOGO"
    >
      <button class="btn-secondary" [disabled]="cargando()" (click)="cargar()">Actualizar</button>
    </mc-page-header>
    @if (error()) {
      <p class="error mb-4" role="alert">{{ error() }}</p>
    }
    @if (cargando()) {
      <p role="status">Cargando servicios…</p>
    }
    <input
      class="mb-5"
      aria-label="Buscar servicios"
      placeholder="Nombre o código…"
      (input)="query.set($any($event.target).value)"
    />
    <section class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      @for (s of rows(); track s.id_servicio) {
        <article class="card p-6">
          <span class="badge">{{ s.codigo }}</span>
          <h2 class="mt-4">{{ s.nombre }}</h2>
          <p class="mt-3 text-sm text-slate-500">{{ s.descripcion }}</p>
          <p class="mt-4 text-sm">
            Duración estimada: {{ s.duracion_estimada_minutos ?? 'No definida' }} min
          </p>
          <p class="mt-2 text-xs text-slate-500">
            {{ s.atenciones }} atenciones con este servicio en tu ámbito de consulta
          </p>
        </article>
      } @empty {
        @if (!cargando()) {
          <p class="empty">No se encontraron servicios.</p>
        }
      }
    </section>`,
})
export class Catalog {
  private api = inject(ConsultasApi);
  private destroyRef = inject(DestroyRef);
  servicios = signal<ServicioDto[]>([]);
  query = signal('');
  error = signal('');
  cargando = signal(false);
  rows = computed(() =>
    this.servicios().filter((s) =>
      `${s.nombre} ${s.codigo}`.toLowerCase().includes(this.query().trim().toLowerCase()),
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
      .servicios()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.servicios.set(r.data);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      });
  }
}

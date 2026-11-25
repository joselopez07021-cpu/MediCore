import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import { MedicosApi, MedicoDto } from '../../servicios/servicio-operaciones-api';
import { mensajeError } from '../../nucleo/utilidades-api';
@Component({
  standalone: true,
  imports: [PageHeader],
  template: ` <mc-page-header
      title="Directorio médico"
      subtitle="Profesionales registrados en el hospital."
      section="ADMISIÓN / MÉDICOS"
    >
      <button class="btn-secondary" [disabled]="cargando()" (click)="cargar()">Actualizar</button>
    </mc-page-header>
    @if (error()) {
      <p class="error mb-4" role="alert">{{ error() }}</p>
    }
    @if (cargando()) {
      <p role="status">Cargando médicos…</p>
    }
    <input
      class="mb-5"
      aria-label="Buscar médicos"
      placeholder="Nombre o especialidad…"
      (input)="query.set($any($event.target).value)"
    />
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      @for (m of rows(); track m.id_medico) {
        <article class="card p-6">
          <h2>{{ m.nombre_completo }}</h2>
          <p class="mt-2 text-sm text-sky-700">{{ m.especialidad }}</p>
          <p class="mt-3 text-sm">{{ m.telefono || 'Sin teléfono' }}</p>
          <p class="text-sm">{{ m.correo || 'Sin correo' }}</p>
          <span class="badge mt-4">{{ m.activo ? 'Activo' : 'Inactivo' }}</span>
        </article>
      } @empty {
        @if (!cargando()) {
          <p class="empty">No se encontraron médicos.</p>
        }
      }
    </section>`,
})
export class Doctors {
  private api = inject(MedicosApi);
  private destroyRef = inject(DestroyRef);
  medicos = signal<MedicoDto[]>([]);
  query = signal('');
  error = signal('');
  cargando = signal(false);
  rows = computed(() =>
    this.medicos().filter((m) =>
      `${m.nombre_completo} ${m.especialidad}`
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
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.medicos.set(r.data);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      });
  }
}

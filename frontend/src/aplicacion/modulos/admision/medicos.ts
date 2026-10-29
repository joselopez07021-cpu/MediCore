import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemoStore } from '../../nucleo/almacen-demostracion';
import { PageHeader } from '../../compartidos/encabezado-pagina';
@Component({
  standalone: true,
  imports: [PageHeader, RouterLink],
  template: `<mc-page-header
      title="Directorio médico"
      subtitle="Conoce al equipo médico y sus especialidades."
      section="ADMISIÓN / EQUIPO MÉDICO"
    />
    <div class="mb-6 max-w-md">
      <input
        aria-label="Buscar médico"
        placeholder="Buscar por nombre o especialidad…"
        (input)="query.set($any($event.target).value)"
      />
    </div>
    <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      @for (d of rows(); track d.id) {
        <article class="card p-6">
          <div
            class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-xl font-bold text-sky-700"
          >
            {{ d.nombre.split(' ')[1].slice(0, 1) }}{{ d.nombre.split(' ')[2].slice(0, 1) }}
          </div>
          <span class="badge badge-green">EQUIPO MÉDICO</span>
          <h2 class="mt-4 text-base">{{ d.nombre }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ d.especialidad }}</p>
          <div class="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
            Hospital Privado Boston Vida
          </div>
          <a routerLink="/admision/agenda" class="link mt-4 inline-block">Consultar agenda →</a>
        </article>
      } @empty {
        <p class="empty">No se encontraron médicos.</p>
      }
    </div>`,
})
export class Doctors {
  store = inject(DemoStore);
  query = signal('');
  rows = computed(() =>
    this.store
      .data()
      .medicos.filter((x) =>
        (x.nombre + ' ' + x.especialidad).toLowerCase().includes(this.query().toLowerCase()),
      ),
  );
}

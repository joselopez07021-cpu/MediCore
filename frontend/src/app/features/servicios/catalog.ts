import { Component, computed, inject, signal } from '@angular/core';
import { DemoStore } from '../../core/demo-store';
import { PageHeader } from '../../shared/page-header';
@Component({
  standalone: true,
  imports: [PageHeader],
  template: `<mc-page-header
      title="Servicios hospitalarios"
      subtitle="Catálogo de servicios disponibles para registrar en una atención."
      section="SERVICIOS / CATÁLOGO"
    />
    <div class="mb-6 max-w-md">
      <input
        aria-label="Buscar servicios"
        placeholder="Buscar servicio o categoría…"
        (input)="query.set($any($event.target).value)"
      />
    </div>
    <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      @for (s of rows(); track s.id) {
        <article class="card p-6">
          <div class="mb-5 flex items-center justify-between">
            <span
              class="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-2xl text-teal-600"
              >✚</span
            ><span class="badge badge-green">{{ s.categoria }}</span>
          </div>
          <h2>{{ s.nombre }}</h2>
          <p class="mt-2 text-xs text-slate-400">SER-{{ s.id.toString().padStart(4, '0') }}</p>
          <div class="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
            {{ uses(s.id) }} atenciones con este servicio
          </div>
        </article>
      } @empty {
        <p class="empty">No se encontraron servicios.</p>
      }
    </div>`,
})
export class Catalog {
  store = inject(DemoStore);
  query = signal('');
  rows = computed(() =>
    this.store
      .data()
      .servicios.filter((s) =>
        (s.nombre + ' ' + s.categoria).toLowerCase().includes(this.query().toLowerCase()),
      ),
  );
  uses(id: number) {
    return this.store.data().atenciones.filter((x) => x.servicios.includes(id)).length;
  }
}

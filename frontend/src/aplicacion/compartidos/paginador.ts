import { Component, computed, input, output } from '@angular/core';
@Component({
  selector: 'mc-paginador',
  standalone: true,
  template: `<nav
    aria-label="Paginación"
    class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 p-4 text-sm"
  >
    <span>{{ total() }} registros · Página {{ actual() }} de {{ paginas() }}</span>
    <button class="btn-secondary" [disabled]="actual() <= 1" (click)="cambio.emit(actual() - 1)">
      Anterior
    </button>
    <button
      class="btn-secondary"
      [disabled]="actual() >= paginas()"
      (click)="cambio.emit(actual() + 1)"
    >
      Siguiente
    </button>
  </nav>`,
})
export class Paginador {
  total = input.required<number>();
  pagina = input(1);
  tamano = input(10);
  cambio = output<number>();
  paginas = computed(() => Math.max(1, Math.ceil(this.total() / this.tamano())));
  actual = computed(() => Math.min(Math.max(1, this.pagina()), this.paginas()));
}

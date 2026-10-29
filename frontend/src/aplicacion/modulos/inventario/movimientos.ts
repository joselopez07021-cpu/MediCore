import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DemoStore } from '../../nucleo/almacen-demostracion';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import { RecordEditor, EditorField } from '../../compartidos/editor-registros';
@Component({
  standalone: true,
  imports: [PageHeader, RecordEditor, DatePipe],
  template: `<mc-page-header
      title="Movimientos de inventario"
      subtitle="Consulta la trazabilidad de entradas, salidas y consumos de atención."
      section="INVENTARIO / MOVIMIENTOS"
      ><button class="btn-primary" (click)="open()">＋ Registrar movimiento</button></mc-page-header
    >
    <section class="mb-6 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800">
      Los consumos de las atenciones se registran automáticamente como salidas de inventario.
    </section>
    <section class="card">
      <div class="toolbar">
        <input
          aria-label="Buscar movimientos"
          placeholder="Buscar insumo o motivo…"
          (input)="query.set($any($event.target).value)"
        /><select
          aria-label="Filtrar tipo de movimiento"
          (change)="type.set($any($event.target).value)"
        >
          <option value="">Todos los tipos</option>
          <option>ENTRADA</option>
          <option>SALIDA</option></select
        ><span class="ml-auto text-xs text-slate-400">{{ rows().length }} movimientos</span>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Referencia / fecha</th>
              <th>Insumo</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Motivo / origen</th>
            </tr>
          </thead>
          <tbody>
            @for (m of rows(); track m.id) {
              <tr>
                <td class="font-medium">
                  MOV-{{ m.id.toString().padStart(4, '0') }}
                  <p class="mt-1 text-xs text-slate-400">{{ m.fecha | date: 'dd/MM/yyyy' }}</p>
                </td>
                <td>{{ store.supply(m.insumoId) }}</td>
                <td>
                  <span
                    class="badge"
                    [class.badge-green]="m.tipo === 'ENTRADA'"
                    [class.badge-blue]="m.tipo === 'SALIDA'"
                    >{{ m.tipo }}</span
                  >
                </td>
                <td class="font-semibold" [class.text-teal-600]="m.tipo === 'ENTRADA'">
                  {{ m.tipo === 'ENTRADA' ? '+' : '−' }}{{ m.cantidad }}
                </td>
                <td class="max-w-80 !whitespace-normal text-xs">
                  {{ m.motivo }}
                  <p class="mt-1 text-slate-400">
                    {{ m.atencionId ? 'Consumo de atención' : 'Registro manual' }}
                  </p>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="empty">No se encontraron movimientos.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
    @if (editing()) {
      <mc-editor
        title="Registrar movimiento"
        [fields]="fields()"
        [error]="error()"
        (save)="save($event)"
        (cancel)="editing.set(false)"
      />
    }`,
})
export class Movements {
  store = inject(DemoStore);
  query = signal('');
  type = signal('');
  editing = signal(false);
  error = signal('');
  rows = computed(() =>
    this.store
      .data()
      .movimientos.filter(
        (x) =>
          (!this.type() || x.tipo === this.type()) &&
          (this.store.supply(x.insumoId) + ' ' + x.motivo)
            .toLowerCase()
            .includes(this.query().toLowerCase()),
      )
      .sort((a, b) => b.id - a.id),
  );
  fields = computed<EditorField[]>(() => [
    {
      key: 'insumoId',
      label: 'Insumo',
      required: true,
      type: 'select',
      options: this.store
        .data()
        .insumos.map((x) => ({ value: x.id, label: x.nombre + ' · ' + x.stock + ' disponibles' })),
    },
    {
      key: 'tipo',
      label: 'Tipo de movimiento',
      required: true,
      type: 'select',
      options: [
        { value: 'ENTRADA', label: 'Entrada' },
        { value: 'SALIDA', label: 'Salida' },
      ],
    },
    { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, min: 1 },
    { key: 'motivo', label: 'Motivo', type: 'textarea', required: true },
  ]);
  open() {
    this.error.set('');
    this.editing.set(true);
  }
  save(v: Record<string, any>) {
    try {
      this.store.move(+v['insumoId'], v['tipo'], +v['cantidad'], v['motivo']);
      this.editing.set(false);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}

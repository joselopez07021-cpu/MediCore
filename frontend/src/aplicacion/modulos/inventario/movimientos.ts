import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import { RecordEditor, EditorField } from '../../compartidos/editor-registros';
import { Paginador } from '../../compartidos/paginador';
import {
  InventarioApi,
  MovimientoDto,
  InsumoDto,
  DatosMovimiento,
} from '../../servicios/servicio-operaciones-api';
import { mensajeError } from '../../nucleo/utilidades-api';
@Component({
  standalone: true,
  imports: [PageHeader, RecordEditor, DatePipe, Paginador],
  template: `
    <mc-page-header
      title="Movimientos de inventario"
      subtitle="Entradas, salidas y consumos de atención."
      section="INVENTARIO / MOVIMIENTOS"
    >
      <button class="btn-secondary" [disabled]="cargando() || guardando()" (click)="cargar()">
        Actualizar
      </button>
      <button class="btn-primary" [disabled]="cargando() || guardando()" (click)="open()">
        ＋ Registrar movimiento
      </button>
    </mc-page-header>
    <p class="mb-5 text-sm text-slate-500">
      Los consumos de las atenciones generan salidas automáticamente. Los movimientos manuales
      requieren cantidades enteras positivas.
    </p>
    @if (error() && !editing()) {
      <p class="error mb-4" role="alert">{{ error() }}</p>
    }
    @if (aviso()) {
      <p class="mb-4 text-sm text-teal-700" role="status">{{ aviso() }}</p>
    }
    <section class="card">
      <div class="toolbar">
        <input
          aria-label="Buscar movimientos"
          placeholder="Insumo o motivo…"
          (input)="query.set($any($event.target).value); pagina.set(1)"
        />
        <select
          aria-label="Filtrar tipo de movimiento"
          (change)="type.set($any($event.target).value); pagina.set(1)"
        >
          <option value="">Todos los tipos</option>
          <option>ENTRADA</option>
          <option>SALIDA</option>
        </select>
      </div>
      @if (cargando()) {
        <p class="p-5" role="status">Cargando movimientos…</p>
      }
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
            @for (m of visibles(); track m.id_movimiento) {
              <tr>
                <td>
                  {{ m.referencia }}
                  <p class="text-xs text-slate-500">
                    {{ m.fecha_movimiento | date: 'dd/MM/yyyy HH:mm' : '-0600' }}
                  </p>
                </td>
                <td>{{ m.insumo }}</td>
                <td>
                  <span class="badge">{{ m.tipo_movimiento }}</span>
                </td>
                <td>{{ m.cantidad }}</td>
                <td>
                  {{ m.motivo }}
                  <p class="text-xs text-slate-500">
                    {{
                      m.id_atencion
                        ? 'Consumo de atención · AT-' + m.id_atencion
                        : 'Registro manual'
                    }}
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
      <mc-paginador
        [total]="rows().length"
        [pagina]="paginaActual()"
        (cambio)="pagina.set($event)"
      />
    </section>
    @if (editing()) {
      <mc-editor
        title="Registrar movimiento"
        [fields]="fields()"
        [error]="error()"
        [busy]="guardando()"
        (save)="save($event)"
        (cancel)="editing.set(false)"
      />
    }
  `,
})
export class Movements {
  private api = inject(InventarioApi);
  private destroyRef = inject(DestroyRef);
  movimientos = signal<MovimientoDto[]>([]);
  insumos = signal<InsumoDto[]>([]);
  query = signal('');
  type = signal('');
  pagina = signal(1);
  editing = signal(false);
  error = signal('');
  aviso = signal('');
  cargando = signal(false);
  guardando = signal(false);
  rows = computed(() =>
    this.movimientos().filter(
      (m) =>
        (!this.type() || m.tipo_movimiento === this.type()) &&
        `${m.insumo} ${m.motivo}`.toLowerCase().includes(this.query().trim().toLowerCase()),
    ),
  );
  paginaActual = computed(() =>
    Math.min(this.pagina(), Math.max(1, Math.ceil(this.rows().length / 10))),
  );
  visibles = computed(() =>
    this.rows().slice((this.paginaActual() - 1) * 10, this.paginaActual() * 10),
  );
  fields = computed<EditorField[]>(() => [
    {
      key: 'id_insumo',
      label: 'Insumo',
      type: 'select',
      required: true,
      options: this.insumos().map((i) => ({
        value: i.id_insumo,
        label: `${i.nombre} · ${i.stock_actual} ${i.unidad_medida}`,
      })),
    },
    {
      key: 'tipo_movimiento',
      label: 'Tipo de movimiento',
      type: 'select',
      required: true,
      options: [
        { value: 'ENTRADA', label: 'Entrada' },
        { value: 'SALIDA', label: 'Salida' },
      ],
    },
    { key: 'cantidad', label: 'Cantidad', type: 'number', min: 1, required: true },
    { key: 'motivo', label: 'Motivo', type: 'textarea', required: true, maxLength: 250 },
  ]);
  constructor() {
    this.cargar();
  }
  cargar() {
    if (this.cargando() || this.guardando()) return;
    this.cargando.set(true);
    this.error.set('');
    forkJoin({ movimientos: this.api.movimientos(), insumos: this.api.insumos() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.movimientos.set(r.movimientos.data);
          this.insumos.set(r.insumos.data);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      });
  }
  open() {
    if (this.guardando()) return;
    this.error.set('');
    this.editing.set(true);
  }
  save(v: Record<string, unknown>) {
    if (this.guardando()) return;
    const datos: DatosMovimiento = {
      id_insumo: String(v['id_insumo']),
      tipo_movimiento: v['tipo_movimiento'] as DatosMovimiento['tipo_movimiento'],
      cantidad: Number(v['cantidad']),
      motivo: String(v['motivo']),
    };
    this.guardando.set(true);
    this.error.set('');
    this.aviso.set('');
    this.api
      .mover(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.guardando.set(false);
          this.editing.set(false);
          this.aviso.set(r.message);
          this.cargar();
        },
        error: (e) => {
          this.guardando.set(false);
          this.error.set(mensajeError(e));
        },
      });
  }
}

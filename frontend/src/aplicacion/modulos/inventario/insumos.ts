import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import { RecordEditor, EditorField } from '../../compartidos/editor-registros';
import { Paginador } from '../../compartidos/paginador';
import {
  InventarioApi,
  InsumoDto,
  CategoriaDto,
  DatosInsumo,
} from '../../servicios/servicio-operaciones-api';
import { mensajeError } from '../../nucleo/utilidades-api';
@Component({
  standalone: true,
  imports: [PageHeader, RecordEditor, RouterLink, Paginador],
  templateUrl: './insumos.html',
})
export class Supplies {
  private api = inject(InventarioApi);
  private destroyRef = inject(DestroyRef);
  insumos = signal<InsumoDto[]>([]);
  categorias = signal<CategoriaDto[]>([]);
  query = signal('');
  category = signal('');
  low = signal(false);
  pagina = signal(1);
  editing = signal<InsumoDto | null | undefined>(undefined);
  desactivando = signal<InsumoDto | null>(null);
  error = signal('');
  aviso = signal('');
  cargando = signal(false);
  guardando = signal(false);
  bajas = computed(() =>
    this.insumos().filter((p) => Number(p.stock_actual) <= Number(p.stock_minimo)),
  );
  rows = computed(() =>
    this.insumos().filter(
      (p) =>
        `${p.nombre} ${p.categoria} ${p.codigo}`
          .toLowerCase()
          .includes(this.query().trim().toLowerCase()) &&
        (!this.category() || p.id_categoria === this.category()) &&
        (!this.low() || Number(p.stock_actual) <= Number(p.stock_minimo)),
    ),
  );
  paginaActual = computed(() =>
    Math.min(this.pagina(), Math.max(1, Math.ceil(this.rows().length / 10))),
  );
  visibles = computed(() =>
    this.rows().slice((this.paginaActual() - 1) * 10, this.paginaActual() * 10),
  );
  fields = computed<EditorField[]>(() => [
    { key: 'nombre', label: 'Nombre del insumo', required: true, maxLength: 150 },
    {
      key: 'id_categoria',
      label: 'Categoría',
      type: 'select',
      required: true,
      options: this.categorias().map((c) => ({ value: c.id_categoria, label: c.nombre })),
    },
    { key: 'unidad_medida', label: 'Unidad de medida', required: true, maxLength: 30 },
    {
      key: 'stock_minimo',
      label: 'Existencia mínima (entero)',
      type: 'number',
      min: 0,
      required: true,
    },
  ]);
  values = computed(() => (this.editing() ? { ...this.editing() } : { stock_minimo: 10 }));
  constructor() {
    this.cargar();
  }
  cargar() {
    if (this.cargando() || this.guardando()) return;
    this.cargando.set(true);
    this.error.set('');
    forkJoin({ insumos: this.api.insumos(), categorias: this.api.categorias() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.insumos.set(r.insumos.data);
          this.categorias.set(r.categorias.data);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      });
  }
  open(p: InsumoDto | null) {
    if (!this.guardando()) {
      this.error.set('');
      this.editing.set(p);
    }
  }
  save(v: Record<string, unknown>) {
    if (this.guardando()) return;
    const datos: DatosInsumo = {
      nombre: String(v['nombre']),
      id_categoria: String(v['id_categoria']),
      unidad_medida: String(v['unidad_medida']),
      stock_minimo: Number(v['stock_minimo']),
    };
    const id = this.editing()?.id_insumo;
    this.guardando.set(true);
    this.error.set('');
    this.aviso.set('');
    (id ? this.api.actualizar(id, datos) : this.api.crear(datos))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.guardando.set(false);
          this.editing.set(undefined);
          this.aviso.set(r.message);
          this.cargar();
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.guardando.set(false);
        },
      });
  }
  desactivar(p: InsumoDto) {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.api
      .desactivar(p.id_insumo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.guardando.set(false);
          this.desactivando.set(null);
          this.aviso.set(r.message);
          this.cargar();
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.guardando.set(false);
        },
      });
  }
}

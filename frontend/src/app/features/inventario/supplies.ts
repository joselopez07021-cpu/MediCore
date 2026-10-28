import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemoStore } from '../../core/demo-store';
import { Supply } from '../../core/models';
import { PageHeader } from '../../shared/page-header';
import { RecordEditor, EditorField } from '../../shared/record-editor';
@Component({
  standalone: true,
  imports: [PageHeader, RecordEditor, RouterLink],
  templateUrl: './supplies.html',
})
export class Supplies {
  store = inject(DemoStore);
  query = signal('');
  category = signal('');
  low = signal(false);
  editing = signal<Supply | null | undefined>(undefined);
  error = signal('');
  categories = computed(() => [...new Set(this.store.data().insumos.map((x) => x.categoria))]);
  rows = computed(() =>
    this.store
      .data()
      .insumos.filter(
        (p) =>
          (p.nombre + ' ' + p.categoria).toLowerCase().includes(this.query().toLowerCase()) &&
          (!this.category() || p.categoria === this.category()) &&
          (!this.low() || p.stock <= p.minimo),
      ),
  );
  fields: EditorField[] = [
    { key: 'nombre', label: 'Nombre del insumo', required: true },
    {
      key: 'categoria',
      label: 'Categoría',
      type: 'select',
      required: true,
      options: ['Protección', 'Curación', 'Instrumental', 'Desinfección', 'Otros'].map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: 'unidad',
      label: 'Unidad de medida',
      type: 'select',
      required: true,
      options: ['unidad', 'par', 'frasco', 'caja'].map((value) => ({ value, label: value })),
    },
    { key: 'minimo', label: 'Existencia mínima', type: 'number', min: 0, required: true },
  ];
  values = computed(() => (this.editing() ? { ...this.editing() } : { minimo: 10 }));
  open(p: Supply | null) {
    this.error.set('');
    this.editing.set(p);
  }
  save(v: Record<string, any>) {
    try {
      this.store.saveSupply({
        ...v,
        id: this.editing()?.id || 0,
        minimo: +v['minimo'],
        stock: 0,
      } as Supply);
      this.editing.set(undefined);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}

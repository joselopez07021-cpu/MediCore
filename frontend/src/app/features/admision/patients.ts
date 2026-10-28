import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DemoStore } from '../../core/demo-store';
import { Patient } from '../../core/models';
import { PageHeader } from '../../shared/page-header';
import { RecordEditor, EditorField } from '../../shared/record-editor';
import { StatusBadge } from '../../shared/status';
import { today } from '../../core/demo-data';
import { DialogFocus } from '../../shared/dialog-focus';
@Component({
  standalone: true,
  imports: [PageHeader, RecordEditor, DatePipe, StatusBadge, DialogFocus],
  templateUrl: './patients.html',
})
export class Patients {
  store = inject(DemoStore);
  query = signal('');
  editing = signal<Patient | null | undefined>(undefined);
  detail = signal<Patient | null>(null);
  error = signal('');
  rows = computed(() =>
    this.store
      .data()
      .pacientes.filter((p) =>
        (p.nombre + ' ' + p.documento + ' ' + p.correo)
          .toLowerCase()
          .includes(this.query().toLowerCase()),
      ),
  );
  fields: EditorField[] = [
    { key: 'nombre', label: 'Nombre completo', required: true },
    { key: 'documento', label: 'Documento de identidad', required: true },
    { key: 'nacimiento', label: 'Fecha de nacimiento', type: 'date', required: true, max: today() },
    { key: 'telefono', label: 'Teléfono', required: true },
    { key: 'correo', label: 'Correo electrónico', type: 'email', required: true },
  ];
  open(p: Patient | null) {
    this.error.set('');
    this.editing.set(p);
  }
  values = computed(() => ({ ...this.editing() }));
  history() {
    return this.store
      .data()
      .citas.filter((x) => x.pacienteId === this.detail()?.id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
  save(v: Record<string, any>) {
    try {
      if (v['nacimiento'] > today()) throw Error('La fecha de nacimiento no puede ser futura.');
      this.store.savePatient({ ...v, id: this.editing()?.id || 0 } as Patient);
      this.editing.set(undefined);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}

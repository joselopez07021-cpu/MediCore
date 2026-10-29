import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DemoStore } from '../../nucleo/almacen-demostracion';
import { Appointment, Status } from '../../nucleo/modelos';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import { RecordEditor, EditorField } from '../../compartidos/editor-registros';
import { StatusBadge } from '../../compartidos/indicador-estado';
import { today } from '../../nucleo/datos-demostracion';
import { DialogFocus } from '../../compartidos/enfoque-dialogo';
@Component({
  standalone: true,
  imports: [PageHeader, RecordEditor, DatePipe, StatusBadge, DialogFocus],
  templateUrl: './citas.html',
})
export class Appointments {
  store = inject(DemoStore);
  query = signal('');
  status = signal('');
  date = signal('');
  editing = signal<Appointment | null | undefined>(undefined);
  error = signal('');
  canceling = signal<Appointment | null>(null);
  rows = computed(() =>
    this.store
      .data()
      .citas.filter(
        (a) =>
          (!this.date() || a.fecha === this.date()) &&
          (!this.status() || a.estado === this.status()) &&
          (this.store.patient(a.pacienteId) + ' ' + this.store.doctor(a.medicoId) + ' ' + a.motivo)
            .toLowerCase()
            .includes(this.query().toLowerCase()),
      )
      .sort((a, b) => (b.fecha + a.hora).localeCompare(a.fecha + b.hora)),
  );
  fields = computed<EditorField[]>(() => [
    {
      key: 'pacienteId',
      label: 'Paciente',
      type: 'select',
      required: true,
      options: this.store.data().pacientes.map((p) => ({ value: p.id, label: p.nombre })),
    },
    {
      key: 'medicoId',
      label: 'Médico',
      type: 'select',
      required: true,
      options: this.store
        .data()
        .medicos.map((p) => ({ value: p.id, label: p.nombre + ' · ' + p.especialidad })),
    },
    { key: 'fecha', label: 'Fecha', type: 'date', required: true },
    { key: 'hora', label: 'Hora', type: 'time', required: true },
    { key: 'motivo', label: 'Motivo de la cita', type: 'textarea', required: true },
    {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      required: true,
      options: ['PROGRAMADA', 'CONFIRMADA', 'CANCELADA', 'NO_ASISTIO'].map((value) => ({
        value,
        label: value.replaceAll('_', ' '),
      })),
    },
  ]);
  open(a: Appointment | null) {
    this.error.set('');
    this.editing.set(a);
  }
  values = computed(() =>
    this.editing() ? { ...this.editing() } : { fecha: today(), estado: 'PROGRAMADA' },
  );
  count(status: string) {
    return this.store.data().citas.filter((x) => x.estado === status).length;
  }
  save(v: Record<string, any>) {
    try {
      this.store.saveAppointment({
        ...v,
        id: this.editing()?.id || 0,
        pacienteId: +v['pacienteId'],
        medicoId: +v['medicoId'],
      } as Appointment);
      this.editing.set(undefined);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  change(a: Appointment, estado: Status) {
    try {
      this.store.saveAppointment({ ...a, estado });
      this.canceling.set(null);
    } catch (e) {
      this.store.notify((e as Error).message);
    }
  }
}

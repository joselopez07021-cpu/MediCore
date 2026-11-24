import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import { RecordEditor, EditorField } from '../../compartidos/editor-registros';
import { StatusBadge } from '../../compartidos/indicador-estado';
import { Paginador } from '../../compartidos/paginador';
import { PacientesApi, PacienteDto } from '../../servicios/servicio-pacientes-api';
import {
  CitasApi,
  CitaDto,
  MedicosApi,
  MedicoDto,
  DatosCita,
} from '../../servicios/servicio-operaciones-api';
import { fechaCostaRica, horaCostaRica, mensajeError } from '../../nucleo/utilidades-api';
import type { Status } from '../../nucleo/modelos';
@Component({
  standalone: true,
  imports: [PageHeader, RecordEditor, DatePipe, StatusBadge, Paginador],
  templateUrl: './citas.html',
})
export class Appointments {
  private api = inject(CitasApi);
  private pacientesApi = inject(PacientesApi);
  private medicosApi = inject(MedicosApi);
  private destroyRef = inject(DestroyRef);
  citas = signal<CitaDto[]>([]);
  pacientes = signal<PacienteDto[]>([]);
  medicos = signal<MedicoDto[]>([]);
  query = signal('');
  status = signal('');
  date = signal('');
  pagina = signal(1);
  editing = signal<CitaDto | null | undefined>(undefined);
  canceling = signal<CitaDto | null>(null);
  error = signal('');
  aviso = signal('');
  cargando = signal(false);
  guardando = signal(false);
  rows = computed(() =>
    this.citas().filter(
      (a) =>
        (!this.date() || fechaCostaRica(a.fecha_hora_inicio) === this.date()) &&
        (!this.status() || a.estado === this.status()) &&
        `${a.paciente} ${a.medico} ${a.motivo ?? ''}`
          .toLowerCase()
          .includes(this.query().trim().toLowerCase()),
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
      key: 'id_paciente',
      label: 'Paciente',
      type: 'select',
      required: true,
      options: this.pacientes()
        .filter((p) => p.activo)
        .map((p) => ({
          value: p.id_paciente,
          label: `${p.nombre} ${p.apellido} · ${p.identificacion}`,
        })),
    },
    {
      key: 'id_medico',
      label: 'Médico',
      type: 'select',
      required: true,
      options: this.medicos()
        .filter((m) => m.activo)
        .map((m) => ({ value: m.id_medico, label: `${m.nombre_completo} · ${m.especialidad}` })),
    },
    { key: 'fecha', label: 'Fecha (Costa Rica)', type: 'date', required: true },
    { key: 'hora', label: 'Hora (Costa Rica)', type: 'time', required: true },
    { key: 'motivo', label: 'Motivo de la cita', type: 'textarea', required: true, maxLength: 300 },
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
  values = computed(() => {
    const a = this.editing();
    return a
      ? {
          ...a,
          fecha: fechaCostaRica(a.fecha_hora_inicio),
          hora: horaCostaRica(a.fecha_hora_inicio),
        }
      : { fecha: fechaCostaRica(), hora: '', estado: 'PROGRAMADA' };
  });
  constructor() {
    this.cargar();
  }
  cargar() {
    if (this.cargando() || this.guardando()) return;
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      citas: this.api.listar(),
      pacientes: this.pacientesApi.listar(),
      medicos: this.medicosApi.listar(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.citas.set(r.citas.data);
          this.pacientes.set(r.pacientes.data);
          this.medicos.set(r.medicos.data);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      });
  }
  open(a: CitaDto | null) {
    if (this.guardando()) return;
    this.error.set('');
    this.editing.set(a);
  }
  count(estado: string) {
    return this.citas().filter((c) => c.estado === estado).length;
  }
  save(v: Record<string, unknown>) {
    if (this.guardando()) return;
    const datos = v as unknown as DatosCita;
    const id = this.editing()?.id_cita;
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
          this.guardando.set(false);
          this.error.set(mensajeError(e));
        },
      });
  }
  change(a: CitaDto, estado: Status) {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.aviso.set('');
    this.api
      .cambiarEstado(a.id_cita, estado)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.citas.update((lista) => lista.map((c) => (c.id_cita === a.id_cita ? r.data : c)));
          this.guardando.set(false);
          this.canceling.set(null);
          this.aviso.set(r.message);
        },
        error: (e) => {
          this.guardando.set(false);
          this.error.set(mensajeError(e));
        },
      });
  }
}

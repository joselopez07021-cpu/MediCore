import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DemoStore } from '../../nucleo/almacen-demostracion';
import { Auth } from '../../nucleo/autenticacion';
import { today } from '../../nucleo/datos-demostracion';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import { StatusBadge } from '../../compartidos/indicador-estado';
import { AgendaApi, CitaAgenda } from '../../servicios/servicio-agenda-api';
@Component({
  standalone: true,
  imports: [PageHeader, StatusBadge, DatePipe, RouterLink],
  template: `<mc-page-header
      title="Agenda médica"
      subtitle="Consulta la jornada y accede al registro de atención."
      section="ADMISIÓN / AGENDA"
    />
    <section class="card">
      <div class="toolbar">
        <label class="field"
          >Fecha de consulta<input
            type="date"
            [value]="date()"
            (input)="date.set($any($event.target).value)"
        /></label>
        @if (auth.role() !== 'MEDICO') {
          <label class="field"
            >Médico<select (change)="doctor.set(+$any($event.target).value)">
              <option value="0">Todos los médicos</option>
              @for (d of store.data().medicos; track d.id) {
                <option [value]="d.id">{{ d.nombre }}</option>
              }
            </select></label
          >
        }
        <p class="ml-auto text-xs text-slate-400">
          {{ auth.usuario()?.rol === 'MEDICO' ? citasReales().length : rows().length }} citas
          · {{ date() | date: 'dd/MM/yyyy' }}
        </p>
      </div>
      @if (auth.usuario()?.rol === 'MEDICO') {
        <div class="px-5 pb-5">
          <p class="mb-4 text-sm text-slate-500">Agenda de {{ auth.usuario()?.nombre_completo }} · PostgreSQL</p>
          @if (cargando()) {
            <p role="status">Cargando agenda…</p>
          } @else if (errorAgenda()) {
            <p class="error" role="alert">{{ errorAgenda() }}</p>
          } @else {
            @for (cita of citasReales(); track cita.id_cita) {
              <article class="mb-3 flex flex-wrap items-center gap-5 rounded-xl border border-slate-100 p-5">
                <p class="text-xl font-bold text-sky-700">{{ cita.fecha_hora_inicio | date: 'HH:mm' : '-0600' }}</p>
                <div class="flex-1">
                  <h2 class="text-base">{{ cita.paciente }}</h2>
                  <p class="mt-1 text-sm text-slate-500">{{ cita.motivo }}</p>
                </div>
                <mc-status [value]="cita.estado" />
              </article>
            } @empty {
              <p class="empty">No hay citas registradas para esta fecha.</p>
            }
          }
          <p class="mt-4 text-xs text-slate-500">El registro de atenciones desde esta agenda está pendiente de integración.</p>
        </div>
      } @else {
      <div class="px-5 pb-5">
        @for (a of rows(); track a.id) {
          <article
            class="mb-3 flex flex-wrap items-center gap-5 rounded-xl border border-slate-100 p-5"
          >
            <div class="border-r border-slate-200 pr-5 text-xl font-bold text-sky-700">
              {{ a.hora }}
            </div>
            <div class="min-w-48 flex-1">
              <h2 class="text-base">{{ store.patient(a.pacienteId) }}</h2>
              <p class="mt-1 text-xs text-slate-500">
                {{ store.doctor(a.medicoId) }} · {{ a.motivo }}
              </p>
            </div>
            <mc-status [value]="a.estado" />
            @if (auth.can(['MEDICO']) && (a.estado === 'PROGRAMADA' || a.estado === 'CONFIRMADA')) {
              <a
                routerLink="/servicios/atenciones"
                [queryParams]="{ cita: a.id }"
                class="btn-secondary"
                >Registrar atención →</a
              >
            }
          </article>
        } @empty {
          <div class="empty">No hay citas para esta fecha y médico.</div>
        }
      </div>
      }
    </section>`,
})
export class Agenda {
  store = inject(DemoStore);
  auth = inject(Auth);
  date = signal(today());
  doctor = signal(this.auth.role() === 'MEDICO' ? this.auth.medicoId() : 0);
  private agendaApi = inject(AgendaApi);
  citasReales = signal<CitaAgenda[]>([]);
  cargando = signal(false);
  errorAgenda = signal('');

  constructor() {
    effect((onCleanup) => {
      const usuario = this.auth.usuario();
      const token = this.auth.token();
      const idMedico = this.auth.idMedicoReal();
      const fecha = this.date();
      this.citasReales.set([]);
      this.errorAgenda.set('');
      this.cargando.set(false);
      if (usuario?.rol !== 'MEDICO') return;
      if (!token || !idMedico) {
        this.errorAgenda.set('La sesión no tiene un perfil médico válido.');
        return;
      }
      this.cargando.set(true);
      const subscription = this.agendaApi.consultar(fecha, token).subscribe({
        next: (respuesta) => {
          this.citasReales.set(respuesta.data.filter((cita) => cita.id_medico === idMedico));
          this.cargando.set(false);
        },
        error: () => {
          this.errorAgenda.set('No se pudo cargar la agenda. Comprueba la conexión y tu sesión.');
          this.cargando.set(false);
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  rows = computed(() =>
    this.store
      .data()
      .citas.filter(
        (x) => this.auth.usuario()?.rol !== 'MEDICO' &&
          x.fecha === this.date() && (!this.doctor() || x.medicoId === this.doctor()),
      )
      .sort((a, b) => a.hora.localeCompare(b.hora)),
  );
}

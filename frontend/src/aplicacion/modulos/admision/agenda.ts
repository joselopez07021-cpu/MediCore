import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth } from '../../nucleo/autenticacion';
import { fechaCostaRica } from '../../nucleo/utilidades-api';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import { StatusBadge } from '../../compartidos/indicador-estado';
import { AgendaApi, CitaAgenda } from '../../servicios/servicio-agenda-api';
import { MedicosApi, MedicoDto } from '../../servicios/servicio-operaciones-api';
@Component({
  standalone: true,
  imports: [PageHeader, StatusBadge, DatePipe, RouterLink],
  template: ` <mc-page-header
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
        @if (auth.usuario()?.rol !== 'MEDICO') {
          <label class="field"
            >Médico<select [value]="doctor()" (change)="doctor.set($any($event.target).value)">
              <option value="">Todos los médicos</option>
              @for (m of medicos(); track m.id_medico) {
                <option [value]="m.id_medico">{{ m.nombre_completo }}</option>
              }
            </select></label
          >
        }
        <span class="ml-auto text-sm text-slate-500">{{ rows().length }} citas</span>
      </div>
      @if (cargando()) {
        <p class="p-5" role="status">Cargando agenda…</p>
      } @else if (errorAgenda()) {
        <p class="error p-5" role="alert">{{ errorAgenda() }}</p>
      } @else {
        <div class="px-5 pb-5">
          @for (cita of rows(); track cita.id_cita) {
            <article
              class="mb-3 flex flex-wrap items-center gap-5 rounded-xl border border-slate-100 p-5"
            >
              <p class="text-xl font-bold text-sky-700">
                {{ cita.fecha_hora_inicio | date: 'HH:mm' : '-0600' }}
              </p>
              <div class="flex-1">
                <h2 class="text-base">{{ cita.paciente }}</h2>
                <p class="mt-1 text-sm text-slate-500">{{ cita.medico }} · {{ cita.motivo }}</p>
              </div>
              <mc-status [value]="cita.estado" />
              @if (
                auth.can(['MEDICO']) &&
                (cita.estado === 'PROGRAMADA' || cita.estado === 'CONFIRMADA')
              ) {
                <a
                  class="btn-secondary"
                  routerLink="/servicios/atenciones"
                  [queryParams]="{ cita: cita.id_cita }"
                  >Registrar atención →</a
                >
              }
            </article>
          } @empty {
            <p class="empty">No hay citas registradas para esta fecha y médico.</p>
          }
        </div>
      }
    </section>`,
})
export class Agenda {
  auth = inject(Auth);
  private agendaApi = inject(AgendaApi);
  private medicosApi = inject(MedicosApi);
  private destroyRef = inject(DestroyRef);
  date = signal(fechaCostaRica());
  doctor = signal('');
  medicos = signal<MedicoDto[]>([]);
  citasReales = signal<CitaAgenda[]>([]);
  cargando = signal(false);
  errorAgenda = signal('');
  rows = computed(() =>
    this.citasReales().filter((c) => !this.doctor() || c.id_medico === this.doctor()),
  );
  constructor() {
    if (this.auth.usuario()?.rol !== 'MEDICO')
      this.medicosApi
        .listar()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (r) => this.medicos.set(r.data),
          error: () => this.errorAgenda.set('No se pudo cargar el directorio médico.'),
        });
    effect((onCleanup) => {
      const usuario = this.auth.usuario();
      const token = this.auth.token();
      const id = this.auth.idMedicoReal();
      const fecha = this.date();
      this.citasReales.set([]);
      this.errorAgenda.set('');
      this.cargando.set(false);
      if (!token) return;
      if (usuario?.rol === 'MEDICO' && !id) {
        this.errorAgenda.set('La sesión no tiene un perfil médico válido.');
        return;
      }
      if (!fecha) {
        this.errorAgenda.set('Selecciona una fecha de consulta.');
        return;
      }
      this.cargando.set(true);
      const peticion = this.agendaApi.consultar(fecha, token).subscribe({
        next: (r) => {
          this.citasReales.set(
            usuario?.rol === 'MEDICO' ? r.data.filter((c) => c.id_medico === id) : r.data,
          );
          this.cargando.set(false);
        },
        error: () => {
          this.errorAgenda.set('No se pudo cargar la agenda. Comprueba la conexión y tu sesión.');
          this.cargando.set(false);
        },
      });
      onCleanup(() => peticion.unsubscribe());
    });
  }
}

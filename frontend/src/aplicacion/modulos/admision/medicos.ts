import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import {
  MedicosApi,
  MedicoDto,
  DatosMedico,
  Respuesta,
} from '../../servicios/servicio-operaciones-api';
import { mensajeError } from '../../nucleo/utilidades-api';
import { Auth } from '../../nucleo/autenticacion';
import { RecordEditor, EditorField } from '../../compartidos/editor-registros';
import { DialogFocus } from '../../compartidos/enfoque-dialogo';
import { Paginador } from '../../compartidos/paginador';
import { Observable } from 'rxjs';
@Component({
  standalone: true,
  imports: [PageHeader, RecordEditor, DialogFocus, Paginador],
  template: ` <mc-page-header
      title="Directorio médico"
      subtitle="Profesionales registrados en el hospital."
      section="ADMISIÓN / MÉDICOS"
    >
      <button class="btn-secondary" [disabled]="cargando() || guardando()" (click)="cargar()">
        Actualizar
      </button>
      @if (esAdmin()) {
        <button class="btn-primary" [disabled]="cargando() || guardando()" (click)="open(null)">
          Nuevo médico
        </button>
      }
    </mc-page-header>
    @if (error() && editing() === undefined && !confirmando()) {
      <p class="error mb-4" role="alert">{{ error() }}</p>
    }
    @if (aviso()) {
      <p class="mb-4 text-sm text-teal-700" role="status">{{ aviso() }}</p>
    }
    @if (cargando()) {
      <p role="status">Cargando médicos…</p>
    }
    <input
      class="mb-5"
      aria-label="Buscar médicos"
      placeholder="Nombre o especialidad…"
      (input)="query.set($any($event.target).value); pagina.set(1)"
    />
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      @for (m of visibles(); track m.id_medico) {
        <article class="card p-6">
          <h2>{{ m.nombre_completo }}</h2>
          <p class="text-xs text-slate-500">{{ m.identificacion }}</p>
          <p class="mt-2 text-sm text-sky-700">{{ m.especialidad }}</p>
          <p class="mt-3 text-sm">{{ m.telefono || 'Sin teléfono' }}</p>
          <p class="text-sm">{{ m.correo || 'Sin correo' }}</p>
          <span class="badge mt-4">{{ m.activo ? 'Activo' : 'Inactivo' }}</span>
          @if (esAdmin()) {
            <div class="mt-4 flex gap-4">
              <button class="link" [disabled]="guardando() || cargando()" (click)="open(m)">
                Editar
              </button>
              <button class="link" [disabled]="guardando() || cargando()" (click)="confirmar(m)">
                {{ m.activo ? 'Desactivar' : 'Reactivar' }}
              </button>
            </div>
          }
        </article>
      } @empty {
        @if (!cargando()) {
          <p class="empty">No se encontraron médicos.</p>
        }
      }
    </section>
    <mc-paginador [total]="rows().length" [pagina]="paginaActual()" (cambio)="pagina.set($event)" />
    @if (editing() !== undefined) {
      <mc-editor
        [title]="editing() ? 'Editar médico' : 'Nuevo médico'"
        [description]="
          editing()
            ? 'Los cambios de nombre y correo también se aplican a su cuenta. La contraseña se conserva.'
            : 'Se creará también su cuenta con rol Médico. La contraseña debe tener al menos 8 caracteres (máximo 72 bytes). Entrega las credenciales al profesional por un medio privado.'
        "
        [fields]="fields()"
        [values]="values()"
        [busy]="guardando()"
        [error]="error()"
        (save)="save($event)"
        (cancel)="editing.set(undefined)"
      />
    }
    @if (confirmando(); as m) {
      <div class="modal-backdrop">
        <section
          class="modal"
          mcDialog
          role="dialog"
          aria-modal="true"
          aria-labelledby="estado-medico"
        >
          <h2 id="estado-medico">{{ m.activo ? 'Desactivar médico' : 'Reactivar médico' }}</h2>
          <p class="my-4">
            {{ m.nombre_completo }}: esta acción {{ m.activo ? 'deshabilita' : 'habilita' }} también
            su acceso al sistema. Su historial se conserva.
          </p>
          @if (m.activo) {
            <p class="mb-4 text-sm">Primero debes cancelar o reasignar sus citas pendientes.</p>
          }
          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <div class="mt-5 flex justify-end gap-3">
            <button class="btn-secondary" [disabled]="guardando()" (click)="confirmando.set(null)">
              Cancelar
            </button>
            <button class="btn-primary" [disabled]="guardando()" (click)="cambiarEstado(m)">
              Confirmar
            </button>
          </div>
        </section>
      </div>
    }`,
})
export class Doctors {
  private api = inject(MedicosApi);
  private destroyRef = inject(DestroyRef);
  private auth = inject(Auth);
  esAdmin = computed(() => this.auth.role() === 'ADMINISTRADOR');
  guardando = signal(false);
  aviso = signal('');
  editing = signal<MedicoDto | null | undefined>(undefined);
  confirmando = signal<MedicoDto | null>(null);
  pagina = signal(1);
  medicos = signal<MedicoDto[]>([]);
  query = signal('');
  error = signal('');
  cargando = signal(false);
  rows = computed(() =>
    this.medicos().filter((m) =>
      `${m.nombre_completo} ${m.especialidad} ${m.identificacion}`
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
  values = computed(() =>
    this.editing()
      ? {
          ...this.editing(),
          telefono: this.editing()?.telefono ?? '',
          correo: this.editing()?.correo ?? '',
        }
      : {},
  );
  fields = computed<EditorField[]>(() => [
    { key: 'identificacion', label: 'Identificación', required: true, maxLength: 40 },
    { key: 'nombre', label: 'Nombre', required: true, maxLength: 80 },
    { key: 'apellido', label: 'Apellidos', required: true, maxLength: 100 },
    { key: 'especialidad', label: 'Especialidad', required: true, maxLength: 100 },
    { key: 'telefono', label: 'Teléfono', maxLength: 30 },
    { key: 'correo', label: 'Correo', type: 'email', required: true, maxLength: 254 },
    ...(!this.editing()
      ? [
          { key: 'nombre_usuario', label: 'Usuario de acceso', required: true, maxLength: 60 },
          {
            key: 'password',
            label: 'Contraseña (mínimo 8 caracteres)',
            type: 'password' as const,
            required: true,
            minLength: 8,
            maxLength: 72,
          },
        ]
      : []),
  ]);
  open(m: MedicoDto | null) {
    if (!this.esAdmin() || this.guardando() || this.cargando()) return;
    this.error.set('');
    this.editing.set(m);
  }
  confirmar(m: MedicoDto) {
    if (!this.esAdmin() || this.guardando()) return;
    this.error.set('');
    this.confirmando.set(m);
  }
  save(v: Record<string, unknown>) {
    if (!this.esAdmin() || this.guardando() || this.editing() === undefined) return;
    const datos: DatosMedico = {
      identificacion: String(v['identificacion'] ?? '').trim(),
      nombre: String(v['nombre'] ?? '').trim(),
      apellido: String(v['apellido'] ?? '').trim(),
      especialidad: String(v['especialidad'] ?? '').trim(),
      telefono: String(v['telefono'] ?? '').trim(),
      correo: String(v['correo'] ?? '').trim(),
    };
    const id = this.editing()?.id_medico;
    this.procesar(
      id
        ? this.api.actualizar(id, datos)
        : this.api.crear({
            ...datos,
            nombre_usuario: String(v['nombre_usuario'] ?? '').trim(),
            password: String(v['password'] ?? ''),
          }),
    );
  }
  cambiarEstado(m: MedicoDto) {
    if (!this.esAdmin() || this.guardando()) return;
    this.procesar(m.activo ? this.api.desactivar(m.id_medico) : this.api.reactivar(m.id_medico));
  }
  private procesar(peticion: Observable<Respuesta<MedicoDto>>) {
    this.guardando.set(true);
    this.error.set('');
    this.aviso.set('');
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.medicos.update((lista) =>
          [...lista.filter((m) => m.id_medico !== r.data.id_medico), r.data].sort(
            (a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre),
          ),
        );
        this.guardando.set(false);
        this.editing.set(undefined);
        this.confirmando.set(null);
        this.aviso.set(r.message);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }
  constructor() {
    this.cargar();
  }
  cargar() {
    if (this.cargando() || this.guardando()) return;
    this.cargando.set(true);
    this.error.set('');
    this.api
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.medicos.set(r.data);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      });
  }
}

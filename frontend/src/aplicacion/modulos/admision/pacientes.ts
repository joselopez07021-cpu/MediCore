import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PacientesApi, PacienteDto, CitaPacienteDto } from '../../servicios/servicio-pacientes-api';
import { Paginador } from '../../compartidos/paginador';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import { DatePipe } from '@angular/common';
import { DialogFocus } from '../../compartidos/enfoque-dialogo';

@Component({
  standalone: true,
  imports: [PageHeader, ReactiveFormsModule, Paginador, DatePipe, DialogFocus],
  templateUrl: './pacientes.html',
})
export class Patients implements OnInit {
  private api = inject(PacientesApi);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
    apellido: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    identificacion: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(40)]],
    fecha_nacimiento: ['', Validators.required],
    telefono: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(30)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });
  pacientes = signal<PacienteDto[]>([]);
  query = signal('');
  cargando = signal(false);
  error = signal('');
  guardando = signal(false);
  errorRegistro = signal('');
  mensajeRegistro = signal('');
  idEnEdicion = signal<string | null>(null);
  detalle = signal<PacienteDto | null>(null);
  historial = signal<CitaPacienteDto[]>([]);
  cargandoHistorial = signal(false);
  errorHistorial = signal('');

  verHistorial(paciente: PacienteDto): void {
    this.detalle.set(paciente);
    this.historial.set([]);
    this.errorHistorial.set('');
    this.cargandoHistorial.set(true);
    this.api
      .historial(paciente.id_paciente)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          if (this.detalle()?.id_paciente !== paciente.id_paciente) return;
          this.historial.set(r.data);
          this.cargandoHistorial.set(false);
        },
        error: () => {
          if (this.detalle()?.id_paciente !== paciente.id_paciente) return;
          this.errorHistorial.set('No se pudo cargar el historial.');
          this.cargandoHistorial.set(false);
        },
      });
  }

  rows = computed(() => {
    const busqueda = this.query().trim().toLowerCase();

    return this.pacientes().filter((paciente) =>
      [paciente.nombre, paciente.apellido, paciente.identificacion, paciente.correo ?? '']
        .join(' ')
        .toLowerCase()
        .includes(busqueda),
    );
  });

  pagina = signal(1);
  paginaActual = computed(() =>
    Math.min(this.pagina(), Math.max(1, Math.ceil(this.rows().length / 10))),
  );
  visibles = computed(() =>
    this.rows().slice((this.paginaActual() - 1) * 10, this.paginaActual() * 10),
  );

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    if (this.cargando() || this.guardando()) return;

    this.cargando.set(true);
    this.error.set('');

    this.api
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.pacientes.set(respuesta.data);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los pacientes.');
          this.cargando.set(false);
        },
      });
  }
  guardar(): void {
    if (this.guardando() || this.cargando()) return;

    this.errorRegistro.set('');
    this.mensajeRegistro.set('');
    this.formulario.markAllAsTouched();

    if (this.formulario.invalid) {
      this.errorRegistro.set('Revisa los seis campos del formulario.');
      return;
    }

    const valores = this.formulario.getRawValue();

    const datos = {
      nombre: valores.nombre.trim(),
      apellido: valores.apellido.trim(),
      identificacion: valores.identificacion.trim(),
      fecha_nacimiento: valores.fecha_nacimiento,
      telefono: valores.telefono.trim(),
      correo: valores.correo.trim(),
    };

    const id = this.idEnEdicion();

    const solicitud = id === null ? this.api.crear(datos) : this.api.actualizar(id, datos);

    this.guardando.set(true);

    solicitud.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => {
        this.pacientes.update((actuales) =>
          id === null
            ? [...actuales, respuesta.data]
            : actuales.map((paciente) => (paciente.id_paciente === id ? respuesta.data : paciente)),
        );

        this.idEnEdicion.set(null);
        this.formulario.reset();
        this.mensajeRegistro.set(respuesta.message);
        this.guardando.set(false);
      },
      error: (error) => {
        const mensaje = error.error?.message;

        this.errorRegistro.set(
          typeof mensaje === 'string'
            ? mensaje
            : 'No se pudo guardar el paciente. Intenta nuevamente.',
        );

        this.guardando.set(false);
      },
    });
  }
  editar(paciente: PacienteDto): void {
    if (this.guardando() || this.cargando()) return;

    this.idEnEdicion.set(paciente.id_paciente);
    this.errorRegistro.set('');
    this.mensajeRegistro.set('');

    this.formulario.reset({
      nombre: paciente.nombre,
      apellido: paciente.apellido,
      identificacion: paciente.identificacion,
      fecha_nacimiento: paciente.fecha_nacimiento ?? '',
      telefono: paciente.telefono ?? '',
      correo: paciente.correo ?? '',
    });
  }
  cancelarEdicion(): void {
    if (this.guardando() || this.cargando()) return;

    this.idEnEdicion.set(null);
    this.formulario.reset();
    this.errorRegistro.set('');
    this.mensajeRegistro.set('');
  }
  cambiarEstado(paciente: PacienteDto): void {
    if (this.guardando() || this.cargando()) return;

    this.errorRegistro.set('');
    this.mensajeRegistro.set('');
    this.guardando.set(true);

    this.api
      .cambiarEstado(paciente.id_paciente, !paciente.activo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.pacientes.update((actuales) =>
            actuales.map((actual) =>
              actual.id_paciente === respuesta.data.id_paciente ? respuesta.data : actual,
            ),
          );

          this.mensajeRegistro.set(respuesta.message);
          this.guardando.set(false);
        },
        error: (error) => {
          const mensaje = error.error?.message;

          this.errorRegistro.set(
            typeof mensaje === 'string' ? mensaje : 'No se pudo cambiar el estado del paciente.',
          );

          this.guardando.set(false);
        },
      });
  }
}

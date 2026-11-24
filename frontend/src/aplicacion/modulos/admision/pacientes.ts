import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PacientesApi,
  PacienteDto,
} from '../../servicios/servicio-pacientes-api';
import { PageHeader } from '../../compartidos/encabezado-pagina';

@Component({
  standalone: true,
  imports: [PageHeader, ReactiveFormsModule], templateUrl: './pacientes.html',
})
export class Patients implements OnInit {
  private api = inject(PacientesApi);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  formulario = this.fb.nonNullable.group({
    nombre: ['', [
      Validators.required,
      Validators.pattern(/\S/),
      Validators.maxLength(80),
    ]],
    apellido: ['', [
      Validators.required,
      Validators.pattern(/\S/),
      Validators.maxLength(100),
    ]],
    identificacion: ['', [
      Validators.required,
      Validators.pattern(/\S/),
      Validators.maxLength(40),
    ]],
    fecha_nacimiento: ['', Validators.required],
    telefono: ['', [
      Validators.required,
      Validators.pattern(/\S/),
      Validators.maxLength(30),
    ]],
    correo: ['', [
      Validators.required,
      Validators.email,
      Validators.maxLength(254),
    ]],
  });
  pacientes = signal<PacienteDto[]>([]);
  query = signal('');
  cargando = signal(false);
  error = signal('');
  guardando = signal(false);
  errorRegistro = signal('');
  mensajeRegistro = signal('');

  rows = computed(() => {
    const busqueda = this.query().trim().toLowerCase();

    return this.pacientes().filter((paciente) =>
      [
        paciente.nombre,
        paciente.apellido,
        paciente.identificacion,
        paciente.correo ?? '',
      ].join(' ').toLowerCase().includes(busqueda),
    );
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    if (this.cargando()) return;

    this.cargando.set(true);
    this.error.set('');

    this.api.listar()
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
    if (this.guardando()) return;

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

    this.guardando.set(true);

    this.api.crear(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.pacientes.update((actuales) => [
            ...actuales,
            respuesta.data,
          ]);

          this.formulario.reset();
          this.mensajeRegistro.set(respuesta.message);
          this.guardando.set(false);
        },
        error: (error) => {
          const mensaje = error.error?.message;

          this.errorRegistro.set(
            typeof mensaje === 'string'
              ? mensaje
              : 'No se pudo registrar el paciente. Intenta nuevamente.',
          );

          this.guardando.set(false);
        },
      });
  }
}
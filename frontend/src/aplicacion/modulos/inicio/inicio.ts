import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth } from '../../nucleo/autenticacion';
import { StatusBadge } from '../../compartidos/indicador-estado';
import { ConsultasApi, InicioDto } from '../../servicios/servicio-operaciones-api';
import { mensajeError } from '../../nucleo/utilidades-api';
@Component({
  standalone: true,
  imports: [RouterLink, DatePipe, StatusBadge],
  templateUrl: './inicio.html',
})
export class Dashboard {
  auth = inject(Auth);
  private api = inject(ConsultasApi);
  private destroyRef = inject(DestroyRef);
  resumen = signal<InicioDto | null>(null);
  cargando = signal(false);
  error = signal('');
  date = new Date();
  day = computed(() => this.resumen()?.agenda_hoy ?? []);
  stats = computed(() => {
    const r = this.resumen()?.indicadores;
    if (!r) return [];
    const rol = this.auth.usuario()?.rol;
    return [
      ...(rol !== 'INVENTARIO'
        ? [
            {
              label: rol === 'MEDICO' ? 'Pacientes de tu agenda' : 'Pacientes registrados',
              value: r.pacientes_registrados,
            },
            {
              label: rol === 'MEDICO' ? 'Tus citas para hoy' : 'Citas para hoy',
              value: r.citas_hoy,
            },
            {
              label: rol === 'MEDICO' ? 'Tus atenciones' : 'Atenciones registradas',
              value: r.atenciones_registradas,
            },
          ]
        : []),
      ...(['ADMINISTRADOR', 'INVENTARIO'].includes(rol ?? '')
        ? [{ label: 'Insumos por reponer', value: r.insumos_por_reponer }]
        : []),
    ];
  });
  states = computed(() =>
    Object.entries(this.resumen()?.estados_citas ?? {}).map(([estado, count]) => ({
      estado,
      count,
    })),
  );
  total = computed(() => this.states().reduce((n, s) => n + s.count, 0));
  percentage(n: number) {
    return this.total() ? Math.round((n / this.total()) * 100) : 0;
  }
  constructor() {
    this.cargar();
  }
  cargar() {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.error.set('');
    this.api
      .inicio()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.resumen.set(r.data);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      });
  }
}

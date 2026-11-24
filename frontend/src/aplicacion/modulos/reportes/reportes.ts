import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import {
  ConsultasApi,
  MedicosApi,
  MedicoDto,
  ReporteDto,
} from '../../servicios/servicio-operaciones-api';
import { mensajeError } from '../../nucleo/utilidades-api';
import { POWER_BI_CONFIG } from '../../nucleo/configuracion-powerbi';
export function generarCsv(filas: (string | number)[][]): string {
  return (
    '\ufeff' +
    filas
      .map((fila) =>
        fila
          .map(
            (valor) =>
              '"' +
              String(valor)
                .replace(/^[\s]*[=+@-]/, "'$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(','),
      )
      .join('\r\n')
  );
}
@Component({ standalone: true, imports: [PageHeader], templateUrl: './reportes.html' })
export class Reports {
  private api = inject(ConsultasApi);
  private medicosApi = inject(MedicosApi);
  private destroyRef = inject(DestroyRef);
  tab = signal('citas');
  from = signal('');
  to = signal('');
  doctor = signal('');
  medicos = signal<MedicoDto[]>([]);
  reporte = signal<ReporteDto | null>(null);
  cargando = signal(false);
  error = signal('');
  invalid = computed(() => !!this.from() && !!this.to() && this.from() > this.to());
  filtrosCambiados = computed(
    () => this.aplicados() !== JSON.stringify([this.from(), this.to(), this.doctor()]),
  );
  private aplicados = signal('');
  bars = computed(() => {
    const r = this.reporte();
    return !r
      ? []
      : this.tab() === 'citas'
        ? r.citas_por_medico
        : this.tab() === 'servicios'
          ? r.servicios
          : r.consumos;
  });
  max = computed(() => Math.max(1, ...this.bars().map((r) => r.cantidad)));
  powerBiUrl = (() => {
    try {
      const url = new URL(POWER_BI_CONFIG.reportUrl);
      return url.protocol === 'https:' && url.hostname === 'app.powerbi.com' ? url.href : '';
    } catch {
      return '';
    }
  })();
  constructor() {
    this.medicosApi
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => this.medicos.set(r.data),
        error: (e) => this.error.set(mensajeError(e)),
      });
    this.cargar();
  }
  cargar() {
    if (this.cargando() || this.invalid()) return;
    const filtros = [this.from(), this.to(), this.doctor()];
    this.cargando.set(true);
    this.error.set('');
    this.api
      .reporte(...(filtros as [string, string, string]))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.reporte.set(r.data);
          this.aplicados.set(JSON.stringify(filtros));
          this.cargando.set(false);
        },
        error: (e) => {
          this.reporte.set(null);
          this.cargando.set(false);
          this.error.set(mensajeError(e));
        },
      });
  }
  limpiar() {
    this.from.set('');
    this.to.set('');
    this.doctor.set('');
    this.cargar();
  }
  export() {
    if (!this.reporte() || this.cargando() || this.filtrosCambiados() || this.invalid()) return;
    const filas: (string | number)[][] = [
      ['Referencia', 'Nombre', 'Cantidad', 'Unidad'],
      ...this.bars().map((r) => [r.id, r.nombre, r.cantidad, r.unidad]),
    ];
    const url = URL.createObjectURL(
      new Blob([generarCsv(filas)], { type: 'text/csv;charset=utf-8;' }),
    );
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `medicore-${this.tab()}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}

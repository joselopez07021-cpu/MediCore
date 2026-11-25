import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
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

// Solo se confía en enlaces de «Publicar en la web», nunca en URLs arbitrarias.
export function validarUrlPublicaPowerBi(valor: string): string {
  try {
    const url = new URL(valor);
    const claves = url.searchParams.getAll('r');
    return url.protocol === 'https:' &&
      url.hostname === 'app.powerbi.com' &&
      !url.port &&
      !url.username &&
      !url.password &&
      !url.hash &&
      url.pathname === '/view' &&
      claves.length === 1 &&
      /^[A-Za-z0-9/_+-]+={0,2}$/.test(claves[0])
      ? url.href
      : '';
  } catch {
    return '';
  }
}

type TipoReporte = 'citas' | 'servicios' | 'inventario' | 'powerbi';
type EstadoVisualizacion = 'cargando' | 'documento-cargado' | 'demorado' | 'error';

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
@Component({
  standalone: true,
  imports: [PageHeader],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reports {
  private api = inject(ConsultasApi);
  private medicosApi = inject(MedicosApi);
  private destroyRef = inject(DestroyRef);
  private sanitizer = inject(DomSanitizer);
  private document = inject(DOCUMENT);
  private esperaPowerBi?: ReturnType<typeof setTimeout>;
  private contenedorPantallaCompleta?: HTMLElement;
  tab = signal<TipoReporte>('citas');
  readonly reportesOperativos = [
    { id: 'citas', nombre: 'Citas y atenciones' },
    { id: 'servicios', nombre: 'Servicios hospitalarios' },
    { id: 'inventario', nombre: 'Inventario' },
  ] as const;
  olapIniciado = signal(false);
  estadoPowerBi = signal<EstadoVisualizacion>('cargando');
  versionPowerBi = signal(0);
  pantallaCompleta = signal(false);
  errorPantallaCompleta = signal('');
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
  readonly powerBiUrl = validarUrlPublicaPowerBi(POWER_BI_CONFIG.reportUrl);
  // La validación debe preceder siempre a la excepción de confianza de Angular.
  readonly powerBiSrc = this.powerBiUrl
    ? this.sanitizer.bypassSecurityTrustResourceUrl(this.powerBiUrl)
    : null;
  constructor() {
    this.destroyRef.onDestroy(() => this.cancelarEsperaPowerBi());
    this.medicosApi
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => this.medicos.set(r.data),
        error: (e) => this.error.set(mensajeError(e)),
      });
    this.cargar();
  }
  seleccionarReporte(tipo: TipoReporte) {
    this.tab.set(tipo);
    if (tipo === 'powerbi' && !this.olapIniciado()) {
      this.olapIniciado.set(true);
      if (this.powerBiSrc) this.iniciarEsperaPowerBi();
    }
  }
  recargarPowerBi() {
    if (!this.powerBiSrc) return;
    this.iniciarEsperaPowerBi();
    // Recrear el iframe recarga la visualización sin cambiar la URL ni el modelo.
    this.versionPowerBi.update((version) => version + 1);
  }
  documentoPowerBiCargado() {
    this.cancelarEsperaPowerBi();
    // El evento load no permite verificar los gráficos de un origen externo.
    this.estadoPowerBi.set('documento-cargado');
  }
  falloPowerBi() {
    this.cancelarEsperaPowerBi();
    this.estadoPowerBi.set('error');
  }
  private iniciarEsperaPowerBi() {
    this.cancelarEsperaPowerBi();
    this.estadoPowerBi.set('cargando');
    this.esperaPowerBi = setTimeout(() => this.estadoPowerBi.set('demorado'), 25000);
  }
  private cancelarEsperaPowerBi() {
    clearTimeout(this.esperaPowerBi);
    this.esperaPowerBi = undefined;
  }
  async alternarPantallaCompleta(contenedor: HTMLElement) {
    this.errorPantallaCompleta.set('');
    this.contenedorPantallaCompleta = contenedor;
    try {
      if (this.document.fullscreenElement === contenedor) {
        await this.document.exitFullscreen();
      } else if (contenedor.requestFullscreen) {
        await contenedor.requestFullscreen();
      } else {
        this.errorPantallaCompleta.set(
          'Este navegador no admite pantalla completa. Puedes abrir el informe en otra pestaña.',
        );
      }
    } catch {
      this.errorPantallaCompleta.set(
        'No se pudo cambiar a pantalla completa. Puedes abrir el informe en otra pestaña.',
      );
    }
  }
  @HostListener('document:fullscreenchange')
  actualizarPantallaCompleta() {
    this.pantallaCompleta.set(
      !!this.contenedorPantallaCompleta &&
        this.document.fullscreenElement === this.contenedorPantallaCompleta,
    );
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
    if (
      this.tab() === 'powerbi' ||
      !this.reporte() ||
      this.cargando() ||
      this.filtrosCambiados() ||
      this.invalid()
    )
      return;
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

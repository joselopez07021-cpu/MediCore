import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subscription } from 'rxjs';
import { Auth } from '../../nucleo/autenticacion';
import {
  AtencionesApi,
  AtencionReal,
  CatalogosAtencion,
  PaginaAtenciones,
} from '../../servicios/servicio-atenciones-api';
import type { CitaAgenda } from '../../servicios/servicio-agenda-api';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import { DialogFocus } from '../../compartidos/enfoque-dialogo';

@Component({
  standalone: true,
  imports: [PageHeader, ReactiveFormsModule, DatePipe, DialogFocus],
  templateUrl: './atenciones.html',
})
export class Cares {
  auth = inject(Auth);
  private api = inject(AtencionesApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder).nonNullable;
  private carga?: Subscription;
  private citaSolicitada = this.route.snapshot.queryParamMap.get('cita');
  query = signal('');
  editing = signal(false);
  detail = signal<AtencionReal | null>(null);
  error = signal('');
  aviso = signal('');
  cargando = signal(false);
  guardando = signal(false);
  catalogos = signal<CatalogosAtencion>({ servicios: [], insumos: [] });
  eligible = signal<CitaAgenda[]>([]);
  rows = signal<AtencionReal[]>([]);
  pagina = signal(1);
  paginacion = signal<PaginaAtenciones['paginacion'] | null>(null);
  resumen = signal({ total_atenciones: 0, citas_pendientes: 0 });
  form = this.fb.group({
    citaId: ['', Validators.required],
    diagnostico: [
      '',
      [Validators.required, Validators.pattern(/[\s\S]*\S[\s\S]*/), Validators.maxLength(2000)],
    ],
    notas: ['', Validators.maxLength(2000)],
    servicios: this.fb.control<string[]>([], Validators.required),
    consumos: this.fb.array<ReturnType<Cares['consumptionGroup']>>([]),
  });
  consumptionGroup() {
    return this.fb.group({
      insumoId: ['', Validators.required],
      cantidad: [
        1,
        [Validators.required, Validators.min(0.01), Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      ],
    });
  }
  get consumos() {
    return this.form.controls.consumos;
  }

  constructor() {
    this.cargar();
  }

  cargar() {
    const token = this.auth.token();
    if (!token) {
      this.error.set('Inicia sesión para consultar las atenciones.');
      return;
    }
    this.carga?.unsubscribe();
    this.cargando.set(true);
    this.error.set('');
    this.carga = forkJoin({
      catalogos: this.api.catalogos(token),
      pendientes: this.api.pendientes(token),
      historial: this.api.historial(token, this.pagina(), this.query()),
      resumen: this.api.resumen(token),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => {
          this.catalogos.set(datos.catalogos.data);
          this.eligible.set(datos.pendientes.data);
          this.rows.set(datos.historial.data);
          this.paginacion.set(datos.historial.paginacion);
          this.resumen.set(datos.resumen.data);
          this.cargando.set(false);
          const id = this.citaSolicitada;
          this.citaSolicitada = null;
          if (id) this.abrirDesdeAgenda(token, id);
        },
        error: (fallo) => {
          this.cargando.set(false);
          this.error.set(this.mensajeError(fallo));
        },
      });
  }
  private abrirDesdeAgenda(token: string, id: string) {
    this.api
      .cita(token, id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          if (!data.puede_registrar) {
            this.error.set('Esta cita ya no permite registrar una atención.');
          } else if (this.eligible().some((cita) => cita.id_cita === data.id_cita)) {
            this.open(data.id_cita);
          } else {
            this.error.set('La cita no está entre las pendientes autorizadas.');
          }
        },
        error: (fallo) => this.error.set(this.mensajeError(fallo)),
      });
  }
  buscar() {
    if (!this.guardando()) {
      this.pagina.set(1);
      this.cargar();
    }
  }
  cambiarPagina(paso: number) {
    const siguiente = this.pagina() + paso;
    if (this.cargando() || siguiente < 1 || siguiente > (this.paginacion()?.total_paginas ?? 1))
      return;
    this.pagina.set(siguiente);
    this.cargar();
  }
  open(cita?: string) {
    if (this.cargando() || this.guardando()) return;
    if (!this.eligible().length || (cita && !this.eligible().some((a) => a.id_cita === cita))) {
      this.error.set('Selecciona una cita pendiente autorizada.');
      return;
    }
    this.error.set('');
    this.aviso.set('');
    this.form.reset({ citaId: cita ?? '', diagnostico: '', notas: '', servicios: [] });
    this.consumos.clear();
    this.editing.set(true);
  }
  toggleService(id: string, checked: boolean) {
    const control = this.form.controls.servicios;
    control.setValue(
      checked ? [...new Set([...control.value, id])] : control.value.filter((x) => x !== id),
    );
    control.markAsTouched();
  }
  close() {
    if (this.guardando()) return;
    this.editing.set(false);
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
  save() {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Completa el diagnóstico, los servicios y las cantidades.');
      return;
    }
    const token = this.auth.token();
    const valor = this.form.getRawValue();
    if (!token || !this.eligible().some((cita) => cita.id_cita === valor.citaId)) {
      this.error.set('Selecciona una cita pendiente autorizada.');
      return;
    }
    if (new Set(valor.consumos.map((item) => item.insumoId)).size !== valor.consumos.length) {
      this.error.set('No repitas un insumo: utiliza una sola fila con la cantidad total.');
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    this.api
      .registrar(token, {
        id_cita: valor.citaId,
        diagnostico: valor.diagnostico.trim(),
        notas: valor.notas.trim(),
        servicios: valor.servicios.map((id_servicio) => ({ id_servicio, cantidad: 1 })),
        insumos: valor.consumos.map((item) => ({
          id_insumo: item.insumoId,
          cantidad: item.cantidad,
        })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.guardando.set(false);
          this.close();
          this.detail.set(data);
          this.aviso.set(
            'Atención registrada. El servidor actualizó la cita y los consumos de inventario.',
          );
          this.cargar();
        },
        error: (fallo) => {
          this.guardando.set(false);
          this.error.set(this.mensajeError(fallo));
        },
      });
  }
  private mensajeError(fallo: HttpErrorResponse): string {
    if (fallo.status === 0) return 'No se pudo contactar con el backend.';
    if (fallo.status === 401) return 'La sesión expiró. Vuelve a iniciar sesión.';
    return typeof fallo.error?.message === 'string'
      ? fallo.error.message
      : 'No se pudo completar la operación.';
  }
}

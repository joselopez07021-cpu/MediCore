import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DemoStore } from '../../nucleo/almacen-demostracion';
import { Auth } from '../../nucleo/autenticacion';
import { Care } from '../../nucleo/modelos';
import { PageHeader } from '../../compartidos/encabezado-pagina';
import { DialogFocus } from '../../compartidos/enfoque-dialogo';
@Component({
  standalone: true,
  imports: [PageHeader, ReactiveFormsModule, DatePipe, DialogFocus],
  templateUrl: './atenciones.html',
})
export class Cares {
  store = inject(DemoStore);
  auth = inject(Auth);
  route = inject(ActivatedRoute);
  router = inject(Router);
  fb = inject(FormBuilder).nonNullable;
  query = signal('');
  editing = signal(false);
  detail = signal<Care | null>(null);
  error = signal('');
  form = this.fb.group({
    citaId: ['', Validators.required],
    diagnostico: [
      '',
      [Validators.required, Validators.pattern(/[\s\S]*\S[\s\S]*/), Validators.maxLength(2000)],
    ],
    notas: ['', Validators.maxLength(2000)],
    servicios: this.fb.control<number[]>([], Validators.required),
    consumos: this.fb.array<ReturnType<Cares['consumptionGroup']>>([]),
  });
  consumptionGroup() {
    return this.fb.group({
      insumoId: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    });
  }
  get consumos() {
    return this.form.controls.consumos;
  }
  eligible = computed(() =>
    this.store
      .data()
      .citas.filter(
        (a) =>
          ['PROGRAMADA', 'CONFIRMADA'].includes(a.estado) &&
          (this.auth.role() !== 'MEDICO' || a.medicoId === this.auth.medicoId()),
      ),
  );
  rows = computed(() =>
    this.store
      .data()
      .atenciones.filter((c) => {
        const a = this.appointment(c.citaId);
        return (
          (this.auth.role() !== 'MEDICO' || a?.medicoId === this.auth.medicoId()) &&
          (this.store.patient(a?.pacienteId || 0) + ' ' + c.diagnostico)
            .toLowerCase()
            .includes(this.query().toLowerCase())
        );
      })
      .sort((a, b) => b.id - a.id),
  );
  constructor() {
    const id = +(this.route.snapshot.queryParamMap.get('cita') || 0);
    if (id && this.eligible().some((a) => a.id === id)) this.open(id);
  }
  appointment(id: number) {
    return this.store.data().citas.find((a) => a.id === id);
  }
  service(id: number) {
    return this.store.data().servicios.find((s) => s.id === id)?.nombre || 'Servicio';
  }
  open(cita?: number) {
    this.error.set('');
    this.form.reset({
      citaId: cita ? String(cita) : '',
      diagnostico: '',
      notas: '',
      servicios: [],
    });
    this.consumos.clear();
    this.editing.set(true);
  }
  toggleService(id: number, checked: boolean) {
    const c = this.form.controls.servicios;
    c.setValue(checked ? [...c.value, id] : c.value.filter((x) => x !== id));
    c.markAsTouched();
  }
  close() {
    this.editing.set(false);
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set(
        'Completa los campos obligatorios, selecciona un servicio y revisa los insumos.',
      );
      return;
    }
    try {
      const v = this.form.getRawValue();
      this.store.attend({
        citaId: +v.citaId,
        diagnostico: v.diagnostico.trim(),
        notas: v.notas.trim(),
        servicios: v.servicios,
        consumos: v.consumos.map((x) => ({ insumoId: +x.insumoId, cantidad: +x.cantidad })),
      });
      this.close();
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}

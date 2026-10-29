import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DemoStore } from '../../nucleo/almacen-demostracion';
import { Auth } from '../../nucleo/autenticacion';
import { today } from '../../nucleo/datos-demostracion';
import { StatusBadge } from '../../compartidos/indicador-estado';
@Component({
  standalone: true,
  imports: [RouterLink, DatePipe, StatusBadge],
  templateUrl: './inicio.html',
})
export class Dashboard {
  store = inject(DemoStore);
  auth = inject(Auth);
  date = new Date();
  day = computed(() =>
    this.store
      .data()
      .citas.filter(
        (x) => x.fecha === today() && (this.auth.role() !== 'MEDICO' || x.medicoId === this.auth.medicoId()),
      )
      .sort((a, b) => a.hora.localeCompare(b.hora)),
  );
  stats = computed(() => {
    const s = this.store.data();
    return [
      {
        label: 'Pacientes registrados',
        value: s.pacientes.length,
        detail: 'Directorio de pacientes',
        icon: '♧',
        tone: 'sky',
      },
      {
        label: 'Citas para hoy',
        value: this.day().length,
        detail: 'Agenda del día',
        icon: '▦',
        tone: 'teal',
      },
      {
        label: 'Atenciones registradas',
        value: s.atenciones.length,
        detail: 'Historial de servicios',
        icon: '♡',
        tone: 'sky',
      },
      {
        label: 'Insumos por reponer',
        value: this.store.lowStock().length,
        detail: 'En el mínimo o por debajo',
        icon: '▤',
        tone: 'amber',
      },
    ];
  });
  states = computed(() =>
    ['PROGRAMADA', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO'].map((estado) => ({
      estado,
      count: this.store.data().citas.filter((x) => x.estado === estado).length,
    })),
  );
  total = computed(() => this.store.data().citas.length);
  percentage(n: number) {
    return this.total() ? Math.round((n / this.total()) * 100) : 0;
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { DemoStore } from '../../nucleo/almacen-demostracion';
import { PageHeader } from '../../compartidos/encabezado-pagina';
@Component({ standalone: true, imports: [PageHeader], templateUrl: './reportes.html' })
export class Reports {
  store = inject(DemoStore);
  tab = signal('citas');
  from = signal('');
  to = signal('');
  doctor = signal(0);
  invalid = computed(() => !!this.from() && !!this.to() && this.from() > this.to());
  inPeriod(date: string) {
    return (
      !this.invalid() && (!this.from() || date >= this.from()) && (!this.to() || date <= this.to())
    );
  }
  appointments = computed(() =>
    this.store
      .data()
      .citas.filter(
        (a) => this.inPeriod(a.fecha) && (!this.doctor() || a.medicoId === this.doctor()),
      ),
  );
  cares = computed(() =>
    this.store
      .data()
      .atenciones.filter(
        (c) =>
          this.inPeriod(c.fecha) &&
          (!this.doctor() ||
            this.store.data().citas.find((a) => a.id === c.citaId)?.medicoId === this.doctor()),
      ),
  );
  attended = computed(() => this.appointments().filter((x) => x.estado === 'ATENDIDA').length);
  serviceCount = computed(() => this.cares().reduce((n, c) => n + c.servicios.length, 0));
  movements = computed(() => this.store.data().movimientos.filter((m) => this.inPeriod(m.fecha)));
  serviceRows = computed(() =>
    this.store
      .data()
      .servicios.map((s) => ({
        name: s.nombre,
        count: this.cares().filter((c) => c.servicios.includes(s.id)).length,
      }))
      .sort((a, b) => b.count - a.count),
  );
  consumptionRows = computed(() =>
    this.store
      .data()
      .insumos.map((s) => ({
        name: s.nombre,
        count: this.cares().reduce(
          (sum, c) =>
            sum + c.consumos.filter((x) => x.insumoId === s.id).reduce((n, x) => n + x.cantidad, 0),
          0,
        ),
        unit: s.unidad,
      }))
      .sort((a, b) => b.count - a.count),
  );
  appointmentRows = computed(() =>
    this.store.data().medicos.map((d) => ({
      name: d.nombre,
      count: this.appointments().filter((a) => a.medicoId === d.id).length,
    })),
  );
  bars = computed(() =>
    this.tab() === 'citas'
      ? this.appointmentRows()
      : this.tab() === 'servicios'
        ? this.serviceRows()
        : this.consumptionRows(),
  );
  max = computed(() => Math.max(1, ...this.bars().map((x) => x.count)));
  consumedTypes = computed(() => this.consumptionRows().filter((x) => x.count > 0).length);
  // Intencionalmente no se inventa un enlace Power BI. Se configurará tras publicar el informe sintético.
  export() {
    let rows: (string | number)[][] = [];
    if (this.tab() === 'citas')
      rows = [['Médico', 'Citas'], ...this.appointmentRows().map((x) => [x.name, x.count])];
    else if (this.tab() === 'servicios')
      rows = [
        ['Servicio', 'Atenciones con el servicio'],
        ...this.serviceRows().map((x) => [x.name, x.count]),
      ];
    else
      rows = [
        ['Insumo', 'Consumo', 'Unidad'],
        ...this.consumptionRows().map((x) => [x.name, x.count, x.unit]),
      ];
    const csv =
      '\ufeff' +
      rows
        .map((row) =>
          row
            .map(
              (x) =>
                '"' +
                String(x)
                  .replace(/^[=+@-]/, "'$&")
                  .replaceAll('"', '""') +
                '"',
            )
            .join(','),
        )
        .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `medicore-${this.tab()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.store.notify('Reporte CSV exportado.');
  }
}

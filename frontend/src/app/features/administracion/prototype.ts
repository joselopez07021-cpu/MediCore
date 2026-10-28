import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PageHeader } from '../../shared/page-header';
interface PrototypeData {
  title: string;
  subtitle: string;
  section: string;
  metrics: { label: string; value: string }[];
  columns: string[];
  rows: string[][];
}
const modules: Record<string, PrototypeData> = {
  compras: {
    title: 'Compras y abastecimiento',
    subtitle: 'Vista de referencia para planificar el abastecimiento hospitalario.',
    section: 'ADMINISTRACIÓN / COMPRAS',
    metrics: [
      { label: 'Solicitudes de referencia', value: '03' },
      { label: 'Proveedores de ejemplo', value: '04' },
      { label: 'Órdenes en revisión', value: '02' },
    ],
    columns: ['Solicitud', 'Proveedor', 'Descripción', 'Fecha', 'Estado'],
    rows: [
      ['SOL-001', 'Boston Medical Supply', 'Material de protección', '25/10/2026', 'En revisión'],
      ['SOL-002', 'Healthcare Essentials', 'Insumos de curación', '24/10/2026', 'Pendiente'],
      ['SOL-003', 'MedEquip Boston', 'Instrumental médico', '22/10/2026', 'Aprobada'],
    ],
  },
  finanzas: {
    title: 'Gestión financiera y contabilidad',
    subtitle: 'Vista de referencia para el seguimiento administrativo del hospital.',
    section: 'ADMINISTRACIÓN / FINANZAS',
    metrics: [
      { label: 'Presupuesto ilustrativo', value: '$ 125,000' },
      { label: 'Gastos ilustrativos', value: '$ 82,400' },
      { label: 'Disponible ilustrativo', value: '$ 42,600' },
    ],
    columns: ['Referencia', 'Concepto', 'Centro de costo', 'Importe ilustrativo', 'Estado'],
    rows: [
      ['FIN-001', 'Material hospitalario', 'Servicios médicos', '$ 12,500', 'Registrado'],
      ['FIN-002', 'Mantenimiento preventivo', 'Operaciones', '$ 4,800', 'En revisión'],
      ['FIN-003', 'Servicios generales', 'Administración', '$ 2,100', 'Registrado'],
    ],
  },
  rrhh: {
    title: 'Recursos humanos',
    subtitle: 'Vista de referencia de la organización y el equipo hospitalario.',
    section: 'ADMINISTRACIÓN / RECURSOS HUMANOS',
    metrics: [
      { label: 'Personal de ejemplo', value: '06' },
      { label: 'Departamentos', value: '04' },
      { label: 'Turnos representados', value: '03' },
    ],
    columns: ['Colaborador', 'Puesto', 'Departamento', 'Turno', 'Estado'],
    rows: [
      ['Elena Morales', 'Médica general', 'Servicios médicos', 'Diurno', 'Activo'],
      ['James Bennett', 'Cardiólogo', 'Servicios médicos', 'Diurno', 'Activo'],
      ['Lucía Fernández', 'Recepcionista', 'Admisión', 'Diurno', 'Activo'],
      ['Marcos Díaz', 'Encargado de inventario', 'Inventario', 'Diurno', 'Activo'],
      ['Sara Mitchell', 'Asistente administrativa', 'Administración', 'Vespertino', 'Activo'],
      ['David Gómez', 'Auxiliar de atención', 'Servicios médicos', 'Nocturno', 'Vacaciones'],
    ],
  },
};
@Component({
  standalone: true,
  imports: [PageHeader],
  template: `<mc-page-header
      [title]="data.title"
      [subtitle]="data.subtitle"
      [section]="data.section"
      ><span class="badge bg-amber-100 text-amber-800">PROTOTIPO VISUAL</span></mc-page-header
    >
    <div
      class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800"
    >
      Este módulo presenta únicamente una interfaz de referencia con datos ilustrativos. Sus
      operaciones no están implementadas en el alcance académico actual.
    </div>
    <div class="mb-6 grid gap-4 sm:grid-cols-3">
      @for (m of data.metrics; track m.label) {
        <div class="card p-6">
          <p class="text-xs text-slate-500">{{ m.label }}</p>
          <p class="mt-3 text-3xl font-bold text-sky-950">{{ m.value }}</p>
        </div>
      }
    </div>
    <section class="card">
      <div class="toolbar">
        <h2 class="mr-auto">
          {{
            data.title === 'Recursos humanos'
              ? 'Directorio de colaboradores'
              : 'Registros de referencia'
          }}
        </h2>
        <input
          aria-label="Buscar registros de referencia"
          placeholder="Buscar en esta vista…"
          (input)="query.set($any($event.target).value)"
        />
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              @for (c of data.columns; track c) {
                <th>{{ c }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track $index) {
              <tr>
                @for (value of row; track $index; let last = $last) {
                  <td>
                    @if (last) {
                      <span class="badge badge-blue">{{ value }}</span>
                    } @else {
                      {{ value }}
                    }
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="empty">No hay registros que coincidan con la búsqueda.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
    <section class="mt-6 grid gap-4 sm:grid-cols-3">
      @for (
        step of ['Registro y consulta', 'Seguimiento administrativo', 'Integración con el ERP'];
        track step;
        let i = $index
      ) {
        <article class="rounded-xl border border-dashed border-slate-300 p-5">
          <p class="eyebrow">ETAPA {{ i + 1 }}</p>
          <h3 class="mt-3 text-sm font-semibold">{{ step }}</h3>
          <p class="mt-2 text-xs leading-relaxed text-slate-400">
            Funcionalidad prevista para una futura ampliación del sistema.
          </p>
        </article>
      }
    </section>`,
})
export class Prototype {
  route = inject(ActivatedRoute);
  data = modules[this.route.snapshot.data['module']] || modules['compras'];
  query = signal('');
  rows = computed(() =>
    this.data.rows.filter((row) =>
      row.join(' ').toLowerCase().includes(this.query().toLowerCase()),
    ),
  );
}

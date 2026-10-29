import { Component, computed, signal } from '@angular/core';
import { PageHeader } from '../../compartidos/encabezado-pagina';
@Component({
  standalone: true,
  imports: [PageHeader],
  template: `<mc-page-header
      title="Usuarios y roles"
      subtitle="Perfiles de demostración y distribución de permisos en MediCore."
      section="ADMINISTRACIÓN / ACCESO"
    />
    <div class="mb-6 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800">
      Los perfiles simulan permisos de navegación. La creación de cuentas, las contraseñas y la
      autorización real se implementarán en el backend.
    </div>
    <section class="card">
      <div class="toolbar">
        <h2 class="mr-auto">Perfiles del sistema</h2>
        <input
          aria-label="Buscar perfiles"
          placeholder="Buscar usuario o rol…"
          (input)="query.set($any($event.target).value)"
        />
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Usuario de demostración</th>
              <th>Rol</th>
              <th>Permisos previstos</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (u of rows(); track u.role) {
              <tr>
                <td class="font-semibold text-slate-800">{{ u.name }}</td>
                <td>
                  <span class="badge badge-blue">{{ u.role }}</span>
                </td>
                <td class="!whitespace-normal text-xs text-slate-500">{{ u.permissions }}</td>
                <td><span class="badge badge-green">DEMO</span></td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="empty">No se encontraron perfiles.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
    <div class="mt-6 grid gap-4 sm:grid-cols-2">
      @for (u of users; track u.role) {
        <div class="card p-5">
          <h2 class="text-sm">{{ u.role }}</h2>
          <p class="mt-3 text-sm leading-relaxed text-slate-500">{{ u.permissions }}</p>
        </div>
      }
    </div>`,
})
export class Users {
  query = signal('');
  users = [
    {
      name: 'Administrador MediCore',
      role: 'ADMINISTRADOR',
      permissions: 'Acceso general a los módulos, reportes y administración.',
    },
    {
      name: 'Lucía Fernández',
      role: 'ADMISION',
      permissions: 'Registro de pacientes, programación de citas y consulta de agenda.',
    },
    {
      name: 'Dra. Elena Morales',
      role: 'MEDICO',
      permissions: 'Consulta de su agenda, registro de atenciones, servicios y consumos.',
    },
    {
      name: 'Marcos Díaz',
      role: 'INVENTARIO',
      permissions: 'Gestión de insumos, existencias y movimientos de inventario.',
    },
  ];
  rows = computed(() =>
    this.users.filter((u) => (u.name + u.role).toLowerCase().includes(this.query().toLowerCase())),
  );
}

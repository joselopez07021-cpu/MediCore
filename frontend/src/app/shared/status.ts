import { Component, input } from '@angular/core';
@Component({
  selector: 'mc-status',
  standalone: true,
  template: `<span
    class="badge"
    [class.badge-green]="value() === 'ATENDIDA' || value() === 'CONFIRMADA'"
    [class.badge-red]="value() === 'CANCELADA' || value() === 'NO_ASISTIO'"
    [class.badge-blue]="value() === 'PROGRAMADA'"
    >{{ value().replaceAll('_', ' ') }}</span
  >`,
})
export class StatusBadge {
  value = input('');
}

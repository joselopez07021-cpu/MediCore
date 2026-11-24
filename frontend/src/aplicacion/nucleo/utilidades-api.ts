import { HttpErrorResponse } from '@angular/common/http';
export function mensajeError(
  error: unknown,
  defecto = 'No se pudo completar la operación.',
): string {
  return error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
    ? error.error.message
    : defecto;
}
export function fechaCostaRica(fecha: string | Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(fecha));
  const valores = Object.fromEntries(partes.map((p) => [p.type, p.value]));
  return `${valores['year']}-${valores['month']}-${valores['day']}`;
}
export function horaCostaRica(fecha: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Costa_Rica',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(fecha));
}

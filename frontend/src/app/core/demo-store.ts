import { Injectable, computed, signal } from '@angular/core';
import { Appointment, Care, DemoState, Patient, Supply } from './models';
import { seed, today } from './demo-data';
const KEY = 'medicore-demo-v1';
@Injectable({ providedIn: 'root' })
export class DemoStore {
  private initial(): DemoState {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (
          [
            'pacientes',
            'medicos',
            'citas',
            'insumos',
            'servicios',
            'atenciones',
            'movimientos',
          ].every((k) => Array.isArray(s[k]))
        )
          return s;
      }
    } catch {}
    return seed();
  }
  readonly data = signal<DemoState>(this.initial());
  readonly lowStock = computed(() => this.data().insumos.filter((x) => x.stock <= x.minimo));
  readonly notice = signal('');
  readonly storageWarning = signal('');
  private commit(s: DemoState) {
    this.data.set(s);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      this.storageWarning.set(
        'El navegador no permite guardar los cambios. Se conservarán solo durante esta sesión.',
      );
    }
  }
  private id(rows: { id: number }[]) {
    return Math.max(0, ...rows.map((x) => x.id)) + 1;
  }
  patient(id: number) {
    return this.data().pacientes.find((x) => x.id === id)?.nombre ?? 'Paciente';
  }
  doctor(id: number) {
    return this.data().medicos.find((x) => x.id === id)?.nombre ?? 'Médico';
  }
  supply(id: number) {
    return this.data().insumos.find((x) => x.id === id)?.nombre ?? 'Insumo';
  }
  notify(message: string) {
    this.notice.set(message);
  }
  savePatient(p: Patient) {
    const s = this.data();
    if (s.pacientes.some((x) => x.documento === p.documento && x.id !== p.id))
      throw Error('Ya existe un paciente con ese documento.');
    this.commit({
      ...s,
      pacientes: p.id
        ? s.pacientes.map((x) => (x.id === p.id ? p : x))
        : [...s.pacientes, { ...p, id: this.id(s.pacientes) }],
    });
    this.notify('Paciente guardado correctamente.');
  }
  saveAppointment(a: Appointment) {
    const s = this.data();
    const old = s.citas.find((x) => x.id === a.id);
    if (old?.estado === 'ATENDIDA') throw Error('Una cita atendida no puede modificarse.');
    if (
      s.citas.some(
        (x) =>
          x.id !== a.id &&
          x.fecha === a.fecha &&
          x.hora === a.hora &&
          !['CANCELADA', 'NO_ASISTIO'].includes(x.estado) &&
          (x.medicoId === a.medicoId || x.pacienteId === a.pacienteId),
      )
    )
      throw Error('El médico o el paciente ya tiene una cita en ese horario.');
    this.commit({
      ...s,
      citas: a.id
        ? s.citas.map((x) => (x.id === a.id ? a : x))
        : [...s.citas, { ...a, id: this.id(s.citas) }],
    });
    this.notify('Cita guardada correctamente.');
  }
  saveSupply(p: Supply) {
    const s = this.data();
    this.commit({
      ...s,
      insumos: p.id
        ? s.insumos.map((x) => (x.id === p.id ? { ...p, stock: x.stock } : x))
        : [...s.insumos, { ...p, id: this.id(s.insumos), stock: 0 }],
    });
    this.notify('Insumo guardado. Las existencias se actualizan mediante movimientos.');
  }
  move(insumoId: number, tipo: 'ENTRADA' | 'SALIDA', cantidad: number, motivo: string) {
    const s = this.data(),
      p = s.insumos.find((x) => x.id === insumoId);
    if (!p || !Number.isFinite(cantidad) || cantidad <= 0 || !Number.isInteger(cantidad))
      throw Error('Indica un insumo y una cantidad entera mayor que cero.');
    if (tipo === 'SALIDA' && cantidad > p.stock)
      throw Error('No hay existencias suficientes para esta salida.');
    this.commit({
      ...s,
      insumos: s.insumos.map((x) =>
        x.id === insumoId
          ? { ...x, stock: x.stock + (tipo === 'ENTRADA' ? cantidad : -cantidad) }
          : x,
      ),
      movimientos: [
        ...s.movimientos,
        { id: this.id(s.movimientos), insumoId, tipo, cantidad, motivo, fecha: today() },
      ],
    });
    this.notify('Movimiento registrado correctamente.');
  }
  attend(c: Omit<Care, 'id' | 'fecha'>) {
    const s = this.data(),
      a = s.citas.find((x) => x.id === c.citaId);
    if (!a || !['PROGRAMADA', 'CONFIRMADA'].includes(a.estado))
      throw Error('Selecciona una cita pendiente de atención.');
    if (s.atenciones.some((x) => x.citaId === c.citaId))
      throw Error('Esta cita ya tiene una atención.');
    if (!c.diagnostico.trim() || !c.servicios.length)
      throw Error('Registra el diagnóstico y al menos un servicio.');
    const totals = new Map<number, number>();
    for (const x of c.consumos) {
      if (!Number.isInteger(x.cantidad) || x.cantidad <= 0)
        throw Error('Las cantidades deben ser enteras mayores que cero.');
      totals.set(x.insumoId, (totals.get(x.insumoId) || 0) + x.cantidad);
    }
    for (const [id, q] of totals) {
      const p = s.insumos.find((x) => x.id === id);
      if (!p || p.stock < q) throw Error('Existencias insuficientes para ' + this.supply(id));
    }
    const id = this.id(s.atenciones),
      fecha = today();
    this.commit({
      ...s,
      citas: s.citas.map((x) => (x.id === a.id ? { ...x, estado: 'ATENDIDA' } : x)),
      atenciones: [...s.atenciones, { ...c, id, fecha }],
      insumos: s.insumos.map((x) => ({ ...x, stock: x.stock - (totals.get(x.id) || 0) })),
      movimientos: [
        ...s.movimientos,
        ...Array.from(totals, ([insumoId, cantidad], i) => ({
          id: this.id(s.movimientos) + i,
          insumoId,
          cantidad,
          tipo: 'SALIDA' as const,
          motivo: 'Atención AT-' + String(id).padStart(4, '0'),
          fecha,
          atencionId: id,
        })),
      ],
    });
    this.notify('Atención registrada. Cita e inventario actualizados.');
  }
}

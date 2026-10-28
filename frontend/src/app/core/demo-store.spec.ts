import { TestBed } from '@angular/core/testing';
import { DemoStore } from './demo-store';
import { seed } from './demo-data';
describe('Flujo integrado de demostración', () => {
  let store: DemoStore;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(DemoStore);
    store.data.set(seed());
  });
  it('registra una atención, atiende la cita y descuenta consumos acumulados con movimientos', () => {
    const stock = store.data().insumos[0].stock;
    store.attend({
      citaId: 1,
      diagnostico: 'Control médico',
      notas: '',
      servicios: [1, 5],
      consumos: [
        { insumoId: 1, cantidad: 2 },
        { insumoId: 1, cantidad: 3 },
      ],
    });
    expect(store.data().citas.find((x) => x.id === 1)?.estado).toBe('ATENDIDA');
    expect(store.data().insumos[0].stock).toBe(stock - 5);
    const care = store.data().atenciones.at(-1)!;
    const movements = store.data().movimientos.filter((x) => x.atencionId === care.id);
    expect(movements).toHaveLength(1);
    expect(movements[0].cantidad).toBe(5);
    expect(JSON.parse(localStorage.getItem('medicore-demo-v1')!).atenciones).toHaveLength(2);
  });
  it('rechaza un consumo sin existencias sin modificar ningún registro', () => {
    const before = JSON.stringify(store.data());
    expect(() =>
      store.attend({
        citaId: 1,
        diagnostico: 'Control',
        notas: '',
        servicios: [1],
        consumos: [
          { insumoId: 1, cantidad: 1 },
          { insumoId: 6, cantidad: 1 },
        ],
      }),
    ).toThrow('Existencias insuficientes');
    expect(JSON.stringify(store.data())).toBe(before);
  });
  it('impide una segunda atención para la misma cita', () => {
    expect(() =>
      store.attend({ citaId: 5, diagnostico: 'Repetida', notas: '', servicios: [1], consumos: [] }),
    ).toThrow();
    expect(store.data().atenciones).toHaveLength(1);
  });
  it('impide sobreventa y cantidades fraccionarias en movimientos', () => {
    const before = JSON.stringify(store.data());
    expect(() => store.move(6, 'SALIDA', 1, 'Prueba')).toThrow();
    expect(() => store.move(1, 'SALIDA', 1.5, 'Prueba')).toThrow();
    expect(JSON.stringify(store.data())).toBe(before);
  });
  it('evita conflictos de horario del médico y del paciente', () => {
    const existing = store.data().citas[0];
    expect(() => store.saveAppointment({ ...existing, id: 0, pacienteId: 2 })).toThrow('horario');
    expect(() => store.saveAppointment({ ...existing, id: 0, medicoId: 3 })).toThrow('horario');
    store.saveAppointment({
      ...existing,
      id: 0,
      pacienteId: 2,
      estado: 'CANCELADA',
      hora: '16:00',
    });
    store.saveAppointment({ ...existing, id: 0, pacienteId: 2, hora: '16:00' });
  });
});

import { DemoState } from './modelos';
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function seed(): DemoState {
  const fecha = today();
  const data: DemoState = {
    pacientes: [
      ['Ana Sofía Martínez', 'BV-1001', '1991-04-15', '617-555-0101', 'ana@example.com'],
      ['Carlos Rivera', 'BV-1002', '1980-08-22', '617-555-0102', 'carlos@example.com'],
      ['Isabella Thompson', 'BV-1003', '2000-02-09', '617-555-0103', 'isabella@example.com'],
      ['Daniel López', 'BV-1004', '1975-11-03', '617-555-0104', 'daniel@example.com'],
      ['Emma Wilson', 'BV-1005', '1995-06-18', '617-555-0105', 'emma@example.com'],
      ['Gabriel Torres', 'BV-1006', '1988-01-20', '617-555-0106', 'gabriel@example.com'],
    ].map((p, i) => ({
      id: i + 1,
      nombre: p[0],
      documento: p[1],
      nacimiento: p[2],
      telefono: p[3],
      correo: p[4],
    })),
    medicos: [
      { id: 1, nombre: 'Dra. Elena Morales', especialidad: 'Medicina general' },
      { id: 2, nombre: 'Dr. James Bennett', especialidad: 'Cardiología' },
      { id: 3, nombre: 'Dra. Valeria Cruz', especialidad: 'Pediatría' },
      { id: 4, nombre: 'Dr. Andrés Castillo', especialidad: 'Ortopedia' },
    ],
    citas: [
      {
        id: 1,
        pacienteId: 1,
        medicoId: 1,
        fecha,
        hora: '08:30',
        motivo: 'Control general',
        estado: 'CONFIRMADA',
      },
      {
        id: 2,
        pacienteId: 2,
        medicoId: 2,
        fecha,
        hora: '09:00',
        motivo: 'Valoración cardiológica',
        estado: 'PROGRAMADA',
      },
      {
        id: 3,
        pacienteId: 3,
        medicoId: 1,
        fecha,
        hora: '10:00',
        motivo: 'Consulta general',
        estado: 'PROGRAMADA',
      },
      {
        id: 4,
        pacienteId: 4,
        medicoId: 4,
        fecha,
        hora: '11:00',
        motivo: 'Control de rodilla',
        estado: 'CONFIRMADA',
      },
      {
        id: 5,
        pacienteId: 5,
        medicoId: 1,
        fecha,
        hora: '08:00',
        motivo: 'Revisión de resultados',
        estado: 'ATENDIDA',
      },
      {
        id: 6,
        pacienteId: 6,
        medicoId: 2,
        fecha,
        hora: '14:00',
        motivo: 'Seguimiento',
        estado: 'CANCELADA',
      },
    ],
    insumos: [
      {
        id: 1,
        nombre: 'Guantes de nitrilo',
        categoria: 'Protección',
        unidad: 'par',
        stock: 145,
        minimo: 50,
      },
      {
        id: 2,
        nombre: 'Gasas estériles',
        categoria: 'Curación',
        unidad: 'unidad',
        stock: 18,
        minimo: 30,
      },
      {
        id: 3,
        nombre: 'Jeringas de 5 ml',
        categoria: 'Instrumental',
        unidad: 'unidad',
        stock: 80,
        minimo: 25,
      },
      {
        id: 4,
        nombre: 'Mascarillas quirúrgicas',
        categoria: 'Protección',
        unidad: 'unidad',
        stock: 24,
        minimo: 40,
      },
      {
        id: 5,
        nombre: 'Alcohol al 70 %',
        categoria: 'Desinfección',
        unidad: 'frasco',
        stock: 35,
        minimo: 10,
      },
      {
        id: 6,
        nombre: 'Vendas elásticas',
        categoria: 'Curación',
        unidad: 'unidad',
        stock: 0,
        minimo: 15,
      },
    ],
    servicios: [
      { id: 1, nombre: 'Consulta general', categoria: 'Consulta' },
      { id: 2, nombre: 'Electrocardiograma', categoria: 'Diagnóstico' },
      { id: 3, nombre: 'Curación simple', categoria: 'Procedimiento' },
      { id: 4, nombre: 'Consulta especializada', categoria: 'Consulta' },
      { id: 5, nombre: 'Toma de signos vitales', categoria: 'Valoración' },
    ],
    atenciones: [
      {
        id: 1,
        citaId: 5,
        diagnostico: 'Control de rutina sin hallazgos relevantes.',
        notas: 'Se recomienda seguimiento en seis meses.',
        servicios: [1, 5],
        consumos: [{ insumoId: 1, cantidad: 1 }],
        fecha,
      },
    ],
    movimientos: [
      {
        id: 1,
        insumoId: 1,
        tipo: 'ENTRADA',
        cantidad: 146,
        motivo: 'Existencia inicial de demostración',
        fecha,
      },
      {
        id: 2,
        insumoId: 1,
        tipo: 'SALIDA',
        cantidad: 1,
        motivo: 'Atención AT-0001',
        fecha,
        atencionId: 1,
      },
    ],
  };
  data.movimientos = data.insumos
    .filter((p) => p.stock > 0)
    .map((p, i) => ({
      id: i + 1,
      insumoId: p.id,
      tipo: 'ENTRADA',
      cantidad: p.stock + (p.id === 1 ? 1 : 0),
      motivo: 'Existencia inicial de demostración',
      fecha,
    }));
  data.movimientos.push({
    id: data.movimientos.length + 1,
    insumoId: 1,
    tipo: 'SALIDA',
    cantidad: 1,
    motivo: 'Atención AT-0001',
    fecha,
    atencionId: 1,
  });
  return data;
}

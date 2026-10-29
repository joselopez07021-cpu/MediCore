export type Role = 'ADMINISTRADOR' | 'ADMISION' | 'MEDICO' | 'INVENTARIO';
export type Status = 'PROGRAMADA' | 'CONFIRMADA' | 'ATENDIDA' | 'CANCELADA' | 'NO_ASISTIO';
export interface Patient {
  id: number;
  nombre: string;
  documento: string;
  nacimiento: string;
  telefono: string;
  correo: string;
}
export interface Doctor {
  id: number;
  nombre: string;
  especialidad: string;
}
export interface Appointment {
  id: number;
  pacienteId: number;
  medicoId: number;
  fecha: string;
  hora: string;
  motivo: string;
  estado: Status;
}
export interface Supply {
  id: number;
  nombre: string;
  categoria: string;
  unidad: string;
  stock: number;
  minimo: number;
}
export interface Service {
  id: number;
  nombre: string;
  categoria: string;
}
export interface Care {
  id: number;
  citaId: number;
  diagnostico: string;
  notas: string;
  servicios: number[];
  consumos: { insumoId: number; cantidad: number }[];
  fecha: string;
}
export interface Movement {
  id: number;
  insumoId: number;
  tipo: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  motivo: string;
  fecha: string;
  atencionId?: number;
}
export interface DemoState {
  pacientes: Patient[];
  medicos: Doctor[];
  citas: Appointment[];
  insumos: Supply[];
  servicios: Service[];
  atenciones: Care[];
  movimientos: Movement[];
}

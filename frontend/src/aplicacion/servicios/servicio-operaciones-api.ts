import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../nucleo/configuracion-api';
import type { CitaAgenda } from './servicio-agenda-api';
import type { Status } from '../nucleo/modelos';

export interface Respuesta<T> {
  message: string;
  data: T;
}
export interface MedicoDto {
  id_medico: string;
  nombre_completo: string;
  nombre: string;
  apellido: string;
  especialidad: string;
  identificacion: string;
  telefono: string | null;
  correo: string | null;
  activo: boolean;
}
export interface CitaDto extends CitaAgenda {
  fecha_hora_fin: string;
}
export interface DatosCita {
  id_paciente: string;
  id_medico: string;
  fecha: string;
  hora: string;
  motivo: string;
  estado: Status;
}
export interface InsumoDto {
  id_insumo: string;
  id_categoria: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  unidad_medida: string;
  stock_actual: string;
  stock_minimo: string;
  estado: string;
  activo: boolean;
}
export interface CategoriaDto {
  id_categoria: string;
  nombre: string;
}
export interface DatosInsumo {
  nombre: string;
  id_categoria: string;
  unidad_medida: string;
  stock_minimo: number;
}
export interface MovimientoDto {
  id_movimiento: string;
  referencia: string;
  id_insumo: string;
  insumo: string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA';
  cantidad: string;
  motivo: string;
  fecha_movimiento: string;
  origen: string;
  id_atencion: string | null;
}
export interface DatosMovimiento {
  id_insumo: string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  motivo: string;
}
export interface ServicioDto {
  id_servicio: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  duracion_estimada_minutos: number | null;
  atenciones: number;
}
export interface UsuarioDto {
  id_usuario: string;
  nombre_usuario: string;
  nombre_completo: string;
  correo: string;
  rol: string;
  activo: boolean;
}
export interface FilaReporte {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}
export interface ReporteDto {
  total_citas: number;
  citas_atendidas: number;
  total_atenciones: number;
  total_servicios: number;
  total_movimientos: number;
  insumos_por_reponer: number;
  citas_por_medico: FilaReporte[];
  servicios: FilaReporte[];
  consumos: FilaReporte[];
}
export interface InicioDto {
  fecha: string;
  indicadores: {
    pacientes_registrados: number;
    citas_hoy: number;
    atenciones_registradas: number;
    insumos_por_reponer: number;
  };
  estados_citas: Record<string, number>;
  agenda_hoy: {
    id_cita: string;
    fecha_hora_inicio: string;
    motivo: string | null;
    estado: Status;
    paciente: { nombre: string; apellido: string };
    medico: { nombre: string; apellido: string };
  }[];
  reposicion: {
    id_insumo: string;
    nombre: string;
    unidad_medida: string;
    stock_actual: string;
    stock_minimo: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class MedicosApi {
  private http = inject(HttpClient);
  listar() {
    return this.http.get<Respuesta<MedicoDto[]>>(`${API_CONFIG.baseUrl}/medicos`);
  }
}
@Injectable({ providedIn: 'root' })
export class CitasApi {
  private http = inject(HttpClient);
  listar() {
    return this.http.get<Respuesta<CitaDto[]>>(`${API_CONFIG.baseUrl}/citas`);
  }
  crear(datos: DatosCita) {
    return this.http.post<Respuesta<CitaDto>>(`${API_CONFIG.baseUrl}/citas`, datos);
  }
  actualizar(id: string, datos: DatosCita) {
    return this.http.put<Respuesta<CitaDto>>(`${API_CONFIG.baseUrl}/citas/${id}`, datos);
  }
  cambiarEstado(id: string, estado: Status) {
    return this.http.patch<Respuesta<CitaDto>>(`${API_CONFIG.baseUrl}/citas/${id}/estado`, {
      estado,
    });
  }
}
@Injectable({ providedIn: 'root' })
export class InventarioApi {
  private http = inject(HttpClient);
  insumos() {
    return this.http.get<Respuesta<InsumoDto[]>>(`${API_CONFIG.baseUrl}/insumos`);
  }
  categorias() {
    return this.http.get<Respuesta<CategoriaDto[]>>(`${API_CONFIG.baseUrl}/categorias-insumos`);
  }
  crear(datos: DatosInsumo) {
    return this.http.post<Respuesta<InsumoDto>>(`${API_CONFIG.baseUrl}/insumos`, datos);
  }
  actualizar(id: string, datos: DatosInsumo) {
    return this.http.put<Respuesta<InsumoDto>>(`${API_CONFIG.baseUrl}/insumos/${id}`, datos);
  }
  desactivar(id: string) {
    return this.http.delete<{ message: string }>(`${API_CONFIG.baseUrl}/insumos/${id}`);
  }
  movimientos() {
    return this.http.get<Respuesta<MovimientoDto[]>>(
      `${API_CONFIG.baseUrl}/movimientos-inventario`,
    );
  }
  mover(datos: DatosMovimiento) {
    return this.http.post<Respuesta<MovimientoDto>>(
      `${API_CONFIG.baseUrl}/movimientos-inventario`,
      datos,
    );
  }
}
@Injectable({ providedIn: 'root' })
export class ConsultasApi {
  private http = inject(HttpClient);
  inicio() {
    return this.http.get<Respuesta<InicioDto>>(`${API_CONFIG.baseUrl}/inicio/resumen`);
  }
  servicios() {
    return this.http.get<Respuesta<ServicioDto[]>>(`${API_CONFIG.baseUrl}/servicios`);
  }
  usuarios() {
    return this.http.get<Respuesta<UsuarioDto[]>>(`${API_CONFIG.baseUrl}/usuarios`);
  }
  reporte(desde: string, hasta: string, medico: string) {
    const params: Record<string, string> = {};
    if (desde) params['fecha_desde'] = desde;
    if (hasta) params['fecha_hasta'] = hasta;
    if (medico) params['id_medico'] = medico;
    return this.http.get<Respuesta<ReporteDto>>(`${API_CONFIG.baseUrl}/reportes`, { params });
  }
}

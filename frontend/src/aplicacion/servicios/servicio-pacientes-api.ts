import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../nucleo/configuracion-api';

export interface PacienteDto {
  id_paciente: string;
  identificacion: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  fecha_registro: string;
  activo: boolean;
}

export interface NuevoPacienteDto {
  nombre: string;
  apellido: string;
  identificacion: string;
  fecha_nacimiento: string;
  telefono: string;
  correo: string;
}
export interface CitaPacienteDto {
  id_cita: string;
  fecha_hora_inicio: string;
  motivo: string | null;
  estado: string;
  medico: string;
}

@Injectable({ providedIn: 'root' })
export class PacientesApi {
  private http = inject(HttpClient);
  historial(id: string) {
    return this.http.get<{ message: string; data: CitaPacienteDto[] }>(
      `${API_CONFIG.baseUrl}/pacientes/${id}/citas`,
    );
  }

  listar(): Observable<{
    message: string;
    data: PacienteDto[];
  }> {
    return this.http.get<{
      message: string;
      data: PacienteDto[];
    }>(`${API_CONFIG.baseUrl}/pacientes`);
  }

  crear(datos: NuevoPacienteDto): Observable<{
    message: string;
    data: PacienteDto;
  }> {
    return this.http.post<{
      message: string;
      data: PacienteDto;
    }>(`${API_CONFIG.baseUrl}/pacientes`, datos);
  }

  actualizar(
    id: string,
    datos: NuevoPacienteDto,
  ): Observable<{
    message: string;
    data: PacienteDto;
  }> {
    return this.http.put<{
      message: string;
      data: PacienteDto;
    }>(`${API_CONFIG.baseUrl}/pacientes/${id}`, datos);
  }
  cambiarEstado(
    id: string,
    activo: boolean,
  ): Observable<{
    message: string;
    data: PacienteDto;
  }> {
    return this.http.patch<{
      message: string;
      data: PacienteDto;
    }>(`${API_CONFIG.baseUrl}/pacientes/${id}/estado`, {
      activo,
    });
  }
}

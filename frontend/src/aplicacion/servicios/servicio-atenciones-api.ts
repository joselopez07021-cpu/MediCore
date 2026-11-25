import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_CONFIG } from '../nucleo/configuracion-api';
import type { CitaAgenda } from './servicio-agenda-api';

export interface CatalogosAtencion {
  servicios: { id_servicio: string; nombre: string }[];
  insumos: { id_insumo: string; nombre: string; unidad_medida: string; stock_actual: number }[];
}
export interface AtencionReal {
  id_atencion: string;
  referencia: string;
  id_cita: string;
  id_medico: string;
  paciente: string;
  medico: string;
  fecha_atencion: string;
  diagnostico: string | null;
  notas: string | null;
  estado: string;
  servicios: { id_servicio: string; nombre: string; cantidad: number }[];
  insumos: { id_insumo: string; nombre: string; unidad_medida: string; cantidad: number }[];
}
export interface PaginaAtenciones {
  data: AtencionReal[];
  paginacion: {
    pagina_actual: number;
    total_elementos: number;
    total_paginas: number;
    tiene_anterior: boolean;
    tiene_siguiente: boolean;
  };
}
export interface RegistroAtencion {
  id_cita: string;
  diagnostico: string;
  notas: string;
  servicios: { id_servicio: string; cantidad: number }[];
  insumos: { id_insumo: string; cantidad: number }[];
}

@Injectable({ providedIn: 'root' })
export class AtencionesApi {
  private http = inject(HttpClient);
  private url = `${API_CONFIG.baseUrl}/atenciones`;
  private headers(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  catalogos(token: string) {
    return this.http.get<{ data: CatalogosAtencion }>(`${this.url}/catalogos`, {
      headers: this.headers(token),
    });
  }
  pendientes(token: string) {
    return this.http.get<{ data: CitaAgenda[] }>(`${this.url}/pendientes`, {
      headers: this.headers(token),
    });
  }
  historial(token: string, pagina: number, paciente: string) {
    let params = new HttpParams().set('page', pagina);
    if (paciente.trim()) params = params.set('paciente', paciente.trim());
    return this.http.get<PaginaAtenciones>(`${this.url}/paginados`, {
      params,
      headers: this.headers(token),
    });
  }
  resumen(token: string) {
    return this.http.get<{ data: { total_atenciones: number; citas_pendientes: number } }>(
      `${this.url}/resumen`,
      { headers: this.headers(token) },
    );
  }
  cita(token: string, id: string) {
    return this.http.get<{ data: CitaAgenda & { puede_registrar: boolean } }>(
      `${this.url}/cita/${encodeURIComponent(id)}`,
      { headers: this.headers(token) },
    );
  }
  registrar(token: string, registro: RegistroAtencion) {
    return this.http.post<{ data: AtencionReal }>(this.url, registro, {
      headers: this.headers(token),
    });
  }
}

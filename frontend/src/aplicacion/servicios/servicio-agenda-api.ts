import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../nucleo/configuracion-api';
import type { Status } from '../nucleo/modelos';

export interface CitaAgenda {
  id_cita: string;
  id_paciente: string;
  id_medico: string;
  paciente: string | null;
  medico: string | null;
  fecha_hora_inicio: string;
  motivo: string | null;
  estado: Status;
}

@Injectable({ providedIn: 'root' })
export class AgendaApi {
  private http = inject(HttpClient);

  consultar(fecha: string, token: string): Observable<{ message: string; data: CitaAgenda[] }> {
    // El backend obtiene el médico del usuario autenticado, no de un selector.
    return this.http.get<{ message: string; data: CitaAgenda[] }>(
      `${API_CONFIG.baseUrl}/citas/agenda`,
      { params: { fecha }, headers: { Authorization: `Bearer ${token}` } },
    );
  }
}

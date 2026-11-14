import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../nucleo/configuracion-api';

interface ApiResponse {
  status: number;
  message: string;
  data: {
    database: string;
  } | null;
}

@Injectable({
  providedIn: 'root',
})
export class Api {
  private http = inject(HttpClient);

  private apiUrl = API_CONFIG.baseUrl;

  verificarConexion(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/health`);
  }
}

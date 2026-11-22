import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../nucleo/configuracion-api';
import { Role } from '../nucleo/modelos';

export interface UsuarioAutenticado {
  id_usuario: string;
  nombre_usuario: string;
  correo: string;
  nombre_completo: string;
  rol: Role;
  id_medico: string | null;
}

export interface RespuestaLogin {
  message: string;
  data: {
    token: string;
    token_type: string;
    usuario: UsuarioAutenticado;
  };
}

@Injectable({ providedIn: 'root' })
export class AutenticacionApi {
  private http = inject(HttpClient);

  iniciarSesion(
    nombreUsuario: string,
    password: string,
  ): Observable<RespuestaLogin> {
    return this.http.post<RespuestaLogin>(
      `${API_CONFIG.baseUrl}/auth/login`,
      {
        nombre_usuario: nombreUsuario,
        password,
      },
    );
  }
}
import { inject, Injectable, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../nucleo/configuracion-api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatbotRequest {
  message: string;
  /** Historial anterior al mensaje actual, sin incluirlo de nuevo. */
  history: ChatMessage[];
}

export interface ChatbotReply {
  message: string;
}

/** Contrato del asistente de navegación y de futuros proveedores. */
export interface ChatbotGateway {
  send(request: ChatbotRequest): Observable<ChatbotReply>;
}

@Injectable({ providedIn: 'root' })
export class BackendChatbotGateway implements ChatbotGateway {
  private http = inject(HttpClient);
  send(request: ChatbotRequest): Observable<ChatbotReply> {
    return this.http.post<ChatbotReply>(`${API_CONFIG.baseUrl}/asistente`, {
      message: request.message,
    });
  }
}

export const CHATBOT_GATEWAY = new InjectionToken<ChatbotGateway>('MediCore Chatbot', {
  providedIn: 'root',
  factory: () => inject(BackendChatbotGateway),
});

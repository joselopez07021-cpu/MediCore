import { inject, Injectable, InjectionToken } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

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

/** El adaptador real del backend debe implementar este contrato. */
export interface ChatbotGateway {
  send(request: ChatbotRequest): Observable<ChatbotReply>;
}

@Injectable({ providedIn: 'root' })
export class DemoChatbotGateway implements ChatbotGateway {
  send({ message }: ChatbotRequest): Observable<ChatbotReply> {
    const text = message.toLocaleLowerCase('es');
    let reply =
      'Esta es una respuesta de muestra. Puedes preguntarme cómo encontrar las citas, consultar el inventario o iniciar sesión para explorar el asistente.';
    if (text.includes('cita') || text.includes('agenda')) {
      reply =
        'Para consultar las citas, abre «Admisión y citas» y elige «Agenda médica». Si tu perfil permite gestionar citas, también verás la opción «Citas».';
    } else if (text.includes('inventario') || text.includes('insumo')) {
      reply =
        'En «Inventario» encontrarás «Insumos y existencias» y «Movimientos». Estas opciones están disponibles para los perfiles de Inventario y Administrador.';
    } else if (text.includes('sesión') || text.includes('sesion') || text.includes('acceso')) {
      reply =
        'En la pantalla de acceso, elige un perfil y utiliza las credenciales de muestra indicadas. Solo necesitas iniciar sesión una vez; para cambiar de perfil, pulsa «Salir».';
    }
    // Solo una vista previa local: no hay solicitudes HTTP ni un modelo conectado.
    return of({ message: reply }).pipe(delay(450));
  }
}

export const CHATBOT_GATEWAY = new InjectionToken<ChatbotGateway>('MediCore Chatbot', {
  providedIn: 'root',
  factory: () => inject(DemoChatbotGateway),
});

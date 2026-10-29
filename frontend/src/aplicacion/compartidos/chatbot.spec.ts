import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { App } from '../aplicacion';
import { Auth } from '../nucleo/autenticacion';
import { CHATBOT_GATEWAY, ChatbotReply, ChatbotRequest } from '../servicios/servicio-chatbot';
import { Chatbot } from './chatbot';

@Component({ standalone: true, template: '<h1>Página de prueba</h1>' })
class TestPage {}

describe('Asistente flotante de MediCore', () => {
  let response: Subject<ChatbotReply>;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    response = new Subject<ChatbotReply>();
    send = vi.fn((_request: ChatbotRequest) => response);
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'login', component: TestPage },
          { path: 'inicio', component: TestPage },
        ]),
        { provide: CHATBOT_GATEWAY, useValue: { send } },
      ],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const chat = fixture.debugElement.query(By.directive(Chatbot)).componentInstance as Chatbot;
    return { fixture, chat };
  }

  it('permanece disponible en login y otras páginas, conserva mensajes y admite cerrar con Escape', async () => {
    const { fixture, chat } = await setup();
    await TestBed.inject(Router).navigateByUrl('/login');
    const launcher = fixture.nativeElement.querySelector(
      '[aria-haspopup="dialog"]',
    ) as HTMLButtonElement;
    launcher.click();
    await fixture.whenStable();
    expect(launcher.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    chat.send('¿Dónde veo las citas?');
    response.next({ message: 'Consulta la agenda.' });
    await fixture.whenStable();
    await TestBed.inject(Router).navigateByUrl('/inicio');
    expect(fixture.debugElement.queryAll(By.directive(Chatbot))).toHaveLength(1);
    expect(chat.messages().at(-1)?.content).toBe('Consulta la agenda.');
    const panel = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(launcher);
    launcher.click();
    await fixture.whenStable();
    expect(chat.messages()).toHaveLength(3);
  });

  it('ignora mensajes vacíos y envíos dobles, y reintenta sin duplicar el mensaje', async () => {
    const { chat } = await setup();
    chat.draft.setValue('   ');
    chat.send();
    expect(send).not.toHaveBeenCalled();
    chat.draft.setValue('  Necesito ayuda  ');
    chat.send();
    chat.send('Otro mensaje');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].message).toBe('Necesito ayuda');
    expect(send.mock.calls[0][0].history).toHaveLength(1);
    response.error(new Error('Sin conexión'));
    expect(chat.pending()).toBe(false);
    expect(chat.error()).toBeTruthy();
    response = new Subject<ChatbotReply>();
    chat.retry();
    expect(send).toHaveBeenCalledTimes(2);
    expect(chat.messages()).toHaveLength(2);
    response.next({ message: 'Respuesta recuperada' });
    expect(chat.messages().at(-1)?.content).toBe('Respuesta recuperada');
    expect(chat.pending()).toBe(false);
    expect(chat.error()).toBe('');
  });

  it('limpia la conversación al salir y cancela respuestas pendientes del perfil anterior', async () => {
    const { fixture, chat } = await setup();
    const auth = TestBed.inject(Auth);
    auth.login('ADMINISTRADOR');
    await fixture.whenStable();
    chat.toggle();
    chat.send('Mensaje del administrador');
    expect(chat.pending()).toBe(true);
    auth.logout();
    await fixture.whenStable();
    response.next({ message: 'Respuesta tardía' });
    expect(chat.messages()).toHaveLength(1);
    expect(chat.open()).toBe(false);
    expect(chat.pending()).toBe(false);
    expect(chat.draft.value).toBe('');
  });
});

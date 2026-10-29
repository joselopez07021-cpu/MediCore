import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { defer, finalize, first, map, Subscription, timeout } from 'rxjs';
import { Auth } from '../nucleo/autenticacion';
import { CHATBOT_GATEWAY, ChatbotRequest, ChatMessage } from '../servicios/servicio-chatbot';

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: '¡Hola! Soy el asistente de MediCore. ¿En qué puedo ayudarte hoy?',
};

@Component({
  selector: 'mc-chatbot',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css',
})
export class Chatbot {
  private gateway = inject(CHATBOT_GATEWAY);
  private auth = inject(Auth);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private failedRequest: ChatbotRequest | null = null;
  private composer = viewChild<ElementRef<HTMLTextAreaElement>>('composer');
  private log = viewChild<ElementRef<HTMLElement>>('messageLog');
  private launcher = viewChild<ElementRef<HTMLButtonElement>>('launcher');

  readonly open = signal(false);
  readonly messages = signal<ChatMessage[]>([{ ...WELCOME }]);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly draft = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(1000)],
  });
  readonly suggestions = [
    '¿Dónde veo las citas?',
    'Consultar el inventario',
    'Ayuda para iniciar sesión',
  ];

  constructor() {
    // No compartir conversaciones entre perfiles ni conservarlas después de salir.
    effect(() => {
      this.auth.role();
      this.auth.medicoId();
      untracked(() => this.reset());
    });
  }

  toggle() {
    if (this.open()) this.close();
    else {
      this.open.set(true);
      this.updatePanel(true);
    }
  }

  close(event?: Event) {
    event?.stopPropagation();
    this.open.set(false);
    this.launcher()?.nativeElement.focus();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.send();
    }
  }

  send(suggestion?: string) {
    const message = (suggestion ?? this.draft.value).trim();
    if (!message || message.length > 1000 || this.pending()) return;
    const request: ChatbotRequest = {
      message,
      history: this.messages().map((item) => ({ ...item })),
    };
    this.messages.update((items) => [...items, { role: 'user', content: message }]);
    this.draft.reset();
    this.deliver(request);
  }

  retry() {
    if (this.failedRequest && !this.pending()) this.deliver(this.failedRequest);
  }

  private deliver(request: ChatbotRequest) {
    this.pending.set(true);
    this.error.set('');
    this.failedRequest = null;
    this.updatePanel();
    this.request = defer(() => this.gateway.send(request))
      .pipe(
        timeout(30000),
        first(),
        map((reply) => {
          if (typeof reply?.message !== 'string' || !reply.message.trim()) {
            throw Error('Respuesta de chat vacía.');
          }
          return reply.message.trim();
        }),
        finalize(() => this.pending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (content) => {
          this.messages.update((items) => [...items, { role: 'assistant', content }]);
          this.updatePanel();
        },
        error: () => {
          this.failedRequest = request;
          this.error.set('No pudimos obtener una respuesta. Intenta de nuevo.');
          this.updatePanel();
        },
      });
  }

  private updatePanel(focus = false) {
    afterNextRender(
      () => {
        const log = this.log()?.nativeElement;
        if (log) log.scrollTop = log.scrollHeight;
        if (focus) this.composer()?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  private reset() {
    this.request?.unsubscribe();
    this.messages.set([{ ...WELCOME }]);
    this.draft.reset();
    this.pending.set(false);
    this.error.set('');
    this.failedRequest = null;
    this.open.set(false);
  }
}

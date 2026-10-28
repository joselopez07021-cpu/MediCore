import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
} from '@angular/core';

/** Mantiene el foco dentro de un diálogo y lo devuelve al control que lo abrió. */
@Directive({ selector: '[mcDialog]', standalone: true })
export class DialogFocus implements AfterViewInit, OnDestroy {
  private element = inject<ElementRef<HTMLElement>>(ElementRef);
  private previous = document.activeElement as HTMLElement | null;
  private overflow = document.body.style.overflow;
  private controls() {
    return Array.from(
      this.element.nativeElement.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ),
    );
  }
  ngAfterViewInit() {
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => {
      this.controls()[0]?.focus();
    });
  }
  @HostListener('keydown', ['$event']) key(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const controls = this.controls(),
      first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      last?.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === last) {
      first?.focus();
      event.preventDefault();
    }
  }
  ngOnDestroy() {
    document.body.style.overflow = this.overflow;
    this.previous?.focus();
  }
}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<section class="card mx-auto max-w-lg p-12 text-center">
    <p class="text-6xl font-bold text-sky-700">404</p>
    <h1 class="mt-5 text-2xl font-bold">Página no encontrada</h1>
    <p class="my-5 text-sm text-slate-500">
      La dirección no corresponde a una sección de MediCore.
    </p>
    <a routerLink="/inicio" class="btn-primary">Volver al inicio</a>
  </section>`,
})
export class NotFound {}

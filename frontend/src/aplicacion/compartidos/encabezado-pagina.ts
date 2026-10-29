import { Component, input } from '@angular/core';
@Component({
  selector: 'mc-page-header',
  standalone: true,
  template: `<div class="mb-7 flex flex-wrap items-end justify-between gap-4">
    <div>
      <p class="eyebrow">{{ section() }}</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-900">{{ title() }}</h1>
      <p class="mt-2 text-sm text-slate-500">{{ subtitle() }}</p>
    </div>
    <ng-content />
  </div>`,
})
export class PageHeader {
  title = input('');
  subtitle = input('');
  section = input('MEDICORE / OPERACIONES');
}

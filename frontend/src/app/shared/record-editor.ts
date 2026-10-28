import { Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogFocus } from './dialog-focus';
export interface EditorField {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'date' | 'time' | 'number' | 'select' | 'textarea';
  required?: boolean;
  min?: number;
  max?: string;
  options?: { value: string | number; label: string }[];
}
@Component({
  selector: 'mc-editor',
  standalone: true,
  imports: [ReactiveFormsModule, DialogFocus],
  template: `<div class="modal-backdrop" (click)="cancel.emit()">
    <section
      class="modal"
      mcDialog
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-title"
      (click)="$event.stopPropagation()"
      (keydown.escape)="cancel.emit()"
    >
      <div class="mb-6 flex items-center justify-between">
        <h2 id="editor-title">{{ title() }}</h2>
        <button
          type="button"
          class="btn-secondary !p-2"
          aria-label="Cerrar formulario"
          (click)="cancel.emit()"
        >
          ✕
        </button>
      </div>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="grid gap-4 sm:grid-cols-2">
          @for (f of fields(); track f.key) {
            <label class="field" [class.sm:col-span-2]="f.type === 'textarea'"
              >{{ f.label }}{{ f.required ? ' *' : '' }}
              @switch (f.type) {
                @case ('select') {
                  <select [formControlName]="f.key">
                    <option value="">Seleccionar…</option>
                    @for (o of f.options; track o.value) {
                      <option [value]="o.value">{{ o.label }}</option>
                    }
                  </select>
                }
                @case ('textarea') {
                  <textarea [formControlName]="f.key" maxlength="2000"></textarea>
                }
                @default {
                  <input
                    [type]="f.type || 'text'"
                    [formControlName]="f.key"
                    [attr.min]="f.min ?? null"
                    [attr.max]="f.max ?? null"
                    [attr.step]="f.type === 'number' ? 1 : null"
                    [attr.maxlength]="f.type === 'text' ? 200 : null"
                  />
                }
              }
              @if (form.get(f.key)?.invalid && form.get(f.key)?.touched) {
                <span class="text-xs font-normal text-rose-600">{{
                  f.type === 'email'
                    ? 'Introduce un correo válido.'
                    : f.type === 'number'
                      ? 'Introduce un número entero válido.'
                      : 'Completa este campo con un valor válido.'
                }}</span>
              }
            </label>
          }
        </div>
        <p class="mt-4 text-xs text-slate-400">* Campos obligatorios</p>
        @if (error()) {
          <p class="error mt-4" role="alert">{{ error() }}</p>
        }
        <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button type="button" class="btn-secondary" (click)="cancel.emit()">Cancelar</button
          ><button type="submit" class="btn-primary">Guardar {{ saveLabel() }}</button>
        </div>
      </form>
    </section>
  </div>`,
})
export class RecordEditor {
  title = input('Nuevo registro');
  saveLabel = input('');
  fields = input.required<EditorField[]>();
  values = input<Record<string, unknown>>({});
  error = input('');
  save = output<Record<string, any>>();
  cancel = output<void>();
  form = new FormGroup<Record<string, FormControl>>({});
  constructor() {
    effect(() => {
      const values = this.values();
      const controls: Record<string, FormControl> = {};
      for (const f of this.fields()) {
        const rules = [];
        if (f.required) rules.push(Validators.required, Validators.pattern(/[\s\S]*\S[\s\S]*/));
        if (f.type === 'email') rules.push(Validators.email);
        if (f.type === 'number') {
          rules.push(Validators.pattern(/^\d+$/));
          if (f.min !== undefined) rules.push(Validators.min(f.min));
        }
        controls[f.key] = new FormControl(values[f.key] ?? '', rules);
      }
      this.form = new FormGroup(controls);
    });
  }
  submit() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      const result = this.form.getRawValue();
      for (const key of Object.keys(result)) {
        if (typeof result[key] === 'string') result[key] = result[key].trim();
      }
      this.save.emit(result);
    }
  }
}

import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/auth';
import { Role } from '../../core/models';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<main class="grid min-h-screen lg:grid-cols-2">
    <section
      class="relative flex flex-col justify-between overflow-hidden bg-sky-950 p-10 text-white lg:p-16"
    >
      <div class="flex items-center gap-3">
        <img src="medicore-logo.png" class="h-16 w-16" alt="Logo MediCore" /><span
          class="text-3xl font-bold"
          >MediCore</span
        >
      </div>
      <div class="my-16 max-w-lg">
        <p class="mb-5 text-xs font-semibold tracking-[.25em] text-teal-300">
          HOSPITAL PRIVADO BOSTON VIDA
        </p>
        <h1 class="text-4xl font-semibold leading-tight lg:text-5xl">
          Conectamos procesos.<br /><span class="text-teal-300">Cuidamos personas.</span>
        </h1>
        <p class="mt-6 leading-relaxed text-sky-100/70">
          Una visión integrada de la admisión, la atención médica y los recursos del hospital.
        </p>
        <div class="mt-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-6 text-sm">
          <span>01<br />Admisión</span><span>02<br />Atención</span><span>03<br />Inventario</span>
        </div>
      </div>
      <p class="text-xs text-sky-200/50">Universidad de Costa Rica · IF-6201 · 2026</p>
    </section>
    <section class="flex items-center justify-center bg-white px-6 py-12">
      <div class="w-full max-w-md">
        <span class="badge badge-green">DEMOSTRACIÓN INTERACTIVA</span>
        <h2 class="mt-6 text-3xl font-bold text-slate-900">Bienvenido a MediCore</h2>
        <p class="mb-8 mt-3 text-sm text-slate-500">
          Selecciona un perfil para explorar el sistema.
        </p>
        <form [formGroup]="form" (ngSubmit)="enter()" class="space-y-5">
          <label class="field"
            >Perfil de acceso<select formControlName="role">
              <option value="ADMINISTRADOR">Administrador · acceso general</option>
              <option value="ADMISION">Admisión · pacientes y citas</option>
              <option value="MEDICO">Médico · Elena Morales</option>
              <option value="INVENTARIO">Inventario · insumos y movimientos</option>
            </select></label
          ><button class="btn-primary w-full justify-center py-3" type="submit">
            Entrar a la demostración →
          </button>
        </form>
        <p class="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
          Este acceso simula los roles del ERP. Los datos son ficticios y se guardan en este
          navegador. La autenticación real se integrará con el backend.
        </p>
      </div>
    </section>
  </main>`,
})
export class Login {
  auth = inject(Auth);
  router = inject(Router);
  form = inject(FormBuilder).nonNullable.group({ role: ['ADMINISTRADOR', Validators.required] });
  enter() {
    if (this.form.valid) {
      this.auth.login(this.form.getRawValue().role as Role);
      this.router.navigateByUrl('/inicio');
    }
  }
}

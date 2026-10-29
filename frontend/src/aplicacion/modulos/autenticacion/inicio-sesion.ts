import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../nucleo/autenticacion';
import { Role } from '../../nucleo/modelos';
import { DemoStore } from '../../nucleo/almacen-demostracion';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
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
          {{
            destination
              ? 'Inicia sesión para acceder a ' + destinationName + '.'
              : 'Selecciona un perfil e inicia sesión con las credenciales de prueba.'
          }}
        </p>
        <form [formGroup]="form" (ngSubmit)="enter()" class="space-y-5">
          <div class="grid gap-5 sm:grid-cols-2">
            <label class="field" [class.sm:col-span-2]="form.controls.role.value !== 'MEDICO'"
              >Perfil de acceso<select formControlName="role">
                <option value="ADMINISTRADOR">Administrador · acceso general</option>
                <option value="ADMISION">Admisión · pacientes y citas</option>
                <option value="MEDICO">Médico</option>
                <option value="INVENTARIO">Inventario · insumos y movimientos</option>
              </select></label
            >
            @if (form.controls.role.value === 'MEDICO') {
              <label class="field"
                >Médico que ingresa
                <select formControlName="medicoId" required>
                  <option value="">Seleccionar médico…</option>
                  @for (m of store.data().medicos; track m.id) {
                    <option [value]="m.id">{{ m.nombre }} · {{ m.especialidad }}</option>
                  }
                </select>
                @if (form.controls.medicoId.touched && !selectedDoctor()) {
                  <span class="text-xs text-rose-600">Selecciona un médico registrado.</span>
                }
              </label>
            }
          </div>
          <label class="field"
            >Usuario
            <input
              formControlName="username"
              autocomplete="username"
              placeholder="Escribe tu usuario"
            />
            @if (form.controls.username.touched && form.controls.username.invalid) {
              <span class="text-xs text-rose-600">Ingresa el usuario de prueba.</span>
            }
          </label>
          <label class="field"
            >Contraseña
            <input
              type="password"
              formControlName="password"
              autocomplete="current-password"
              placeholder="Escribe tu contraseña"
            />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <span class="text-xs text-rose-600">Ingresa la contraseña de prueba.</span>
            }
          </label>
          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <div class="rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900">
            <p class="font-semibold">Credenciales de muestra</p>
            <p class="mt-1">
              Usuario: <strong>{{ demoUsername }}</strong> · Contraseña:
              <strong>{{ demoPassword }}</strong>
            </p>
          </div>
          <button class="btn-primary w-full justify-center py-3" type="submit">
            Iniciar sesión →
          </button>
          @if (auth.role()) {
            <a routerLink="/inicio" class="btn-secondary w-full">Cancelar y volver al inicio</a>
          }
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
  store = inject(DemoStore);
  router = inject(Router);
  route = inject(ActivatedRoute);
  error = signal('');
  demoPassword = DEMO_PASSWORD;
  form = inject(FormBuilder).nonNullable.group({
    role: ['ADMINISTRADOR', Validators.required],
    medicoId: [''],
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  get destination() {
    // Aceptar únicamente páginas internas existentes, nunca URLs externas ni el propio login.
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    const path = url?.split(/[?#]/)[0];
    const target = this.router.config
      .flatMap((r) => r.children || [])
      .find((r) => r.path && r.path !== '**' && `/${r.path}` === path);
    return target ? { url: url!, route: target } : null;
  }
  get destinationName() {
    const title = this.destination?.route.title;
    return typeof title === 'string' ? title.split(' · ')[0] : 'la sección';
  }
  get demoUsername() {
    return DEMO_ACCOUNTS[this.form.controls.role.value as Role];
  }
  selectedDoctor() {
    return this.store
      .data()
      .medicos.find((m) => m.id === Number(this.form.controls.medicoId.value));
  }
  enter() {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const role = this.form.controls.role.value as Role;
    if (role === 'MEDICO' && !this.selectedDoctor()) return;
    if (
      !this.auth.verifyCredentials(
        role,
        this.form.controls.username.value,
        this.form.controls.password.value,
      )
    ) {
      this.error.set(
        'Usuario o contraseña incorrectos. Utiliza las credenciales de muestra indicadas.',
      );
      return;
    }
    this.auth.login(role, this.selectedDoctor()?.id);
    const destination = this.destination;
    if (
      destination &&
      (!destination.route.data?.['roles'] || this.auth.can(destination.route.data['roles']))
    ) {
      void this.router.navigateByUrl(destination.url);
    } else void this.router.navigateByUrl('/inicio');
  }
}

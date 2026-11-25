import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../nucleo/autenticacion';
@Component({
  selector: 'mc-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './estructura-principal.html',
})
export class Shell {
  auth = inject(Auth);
  router = inject(Router);
  menu = signal(false);
  closeMenus(event: Event) {
    if ((event.target as HTMLElement).closest('a')) {
      this.menu.set(false);
      (event.currentTarget as HTMLElement)
        .querySelectorAll('details')
        .forEach((d) => (d.open = false));
    }
  }
  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

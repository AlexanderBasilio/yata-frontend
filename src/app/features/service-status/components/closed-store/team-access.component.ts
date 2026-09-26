import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth/auth.service';

@Component({
  selector: 'app-team-access',
  standalone: true,
  template: `
    <div class="mt-6 text-center">
      <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-full opacity-40 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2"
        aria-label="Acceso del equipo" [attr.aria-expanded]="expanded()" (click)="openAccess()">
        <span aria-hidden="true">•</span>
      </button>
      @if (expanded()) {
        <div class="mt-2 text-sm">
          <p class="mb-3">Acceso del equipo</p>
          <button type="button" class="underline" (click)="changeAccount()">Ingresar con otra cuenta</button>
        </div>
      }
    </div>
  `
})
export class TeamAccessComponent {
  readonly expanded = signal(false);
  readonly auth = inject(AuthService);
  private router = inject(Router);

  openAccess(): void {
    if (this.auth.isLoggedIn()) {
      this.expanded.set(!this.expanded());
    } else {
      void this.router.navigateByUrl('/auth/login');
    }
  }

  changeAccount(): void {
    // Only clear the current session after an explicit account-switch action.
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }
}

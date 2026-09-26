import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, exhaustMap, merge, timer } from 'rxjs';
import { ServiceAccessService } from '../../../../core/services/store/service-access.service';
import { TeamAccessComponent } from './team-access.component';

@Component({
  selector: 'app-service-unavailable',
  standalone: true,
  imports: [DatePipe, TeamAccessComponent],
  template: `
    <main class="min-h-screen flex items-center justify-center p-4 bg-[#0D0518] text-[#FAF8FB] relative overflow-hidden">
      <!-- Glow cosmico de fondo Zisify -->
      <div class="absolute -top-32 -left-32 w-96 h-96 bg-[#C30364]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-[#5A3D88]/20 rounded-full blur-3xl pointer-events-none"></div>

      <section class="max-w-md w-full rounded-3xl bg-[#1A0A2E]/90 border border-[#31204F] p-8 text-center backdrop-blur-xl shadow-2xl relative z-10" aria-live="polite">
        <!-- Icono segun estado -->
        <div class="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#221638] border border-[#31204F] flex items-center justify-center shadow-[0_0_20px_rgba(195,3,100,0.15)]">
          @if (access.status().state === 'MAINTENANCE') {
            <svg class="w-8 h-8 text-[#C30364]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          } @else if (access.status().state === 'CLOSED') {
            <svg class="w-8 h-8 text-[#C30364]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          } @else {
            <svg class="w-8 h-8 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          }
        </div>

        <h1 class="text-2xl font-bold mb-3 tracking-tight">
          @if (access.status().state === 'MAINTENANCE') {
            Estamos en mantenimiento
          } @else if (access.status().state === 'CLOSED') {
            Estamos fuera de horario
          } @else {
            Servicio no disponible
          }
        </h1>

        <p class="text-[#9D96A8] text-sm leading-relaxed mb-6">
          {{ access.status().message }}
        </p>

        @if (access.status().nextOpeningAt; as opening) {
          <div class="mb-6 p-4 rounded-2xl bg-[#221638] border border-[#31204F]/60">
            <span class="text-xs text-[#9D96A8] block mb-1">Próxima apertura estimada</span>
            <span class="text-sm font-semibold text-[#FAF8FB]">{{ opening | date:'medium' }}</span>
          </div>
        }

        <button
          type="button"
          class="w-full rounded-xl bg-[#C30364] hover:bg-[#E8368A] active:bg-[#A30254] text-white py-3.5 px-4 font-semibold text-sm transition-all duration-200 shadow-[0_0_20px_rgba(195,3,100,0.25)] hover:shadow-[0_0_25px_rgba(195,3,100,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          [disabled]="loading()"
          (click)="refresh.next()">
          @if (loading()) {
            <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Comprobando estado…
          } @else {
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Actualizar estado
          }
        </button>

        <app-team-access />
      </section>
    </main>
  `
})
export class ServiceUnavailableComponent {
  readonly access = inject(ServiceAccessService);
  private router = inject(Router);
  readonly loading = signal(true);
  readonly refresh = new Subject<void>();

  constructor() {
    merge(timer(0, 60000), this.refresh).pipe(
      exhaustMap(() => { this.loading.set(true); return this.access.check(); }),
      takeUntilDestroyed(inject(DestroyRef))
    ).subscribe(allowed => {
      this.loading.set(false);
      if (allowed) void this.router.navigateByUrl('/home');
    });
  }

}

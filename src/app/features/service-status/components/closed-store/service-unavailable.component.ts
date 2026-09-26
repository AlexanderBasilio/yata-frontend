import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, exhaustMap, merge, timer } from 'rxjs';
import { ServiceAccessService } from '../../../../core/services/store/service-access.service';
import { TeamAccessComponent } from './team-access.component';

@Component({
  selector: 'app-service-unavailable',
  standalone: true,
  imports: [TeamAccessComponent],
  styles: [`
    .service-unavailable {
      position: relative;
      min-height: 100vh;
      min-height: 100svh;
      overflow: hidden;
      color: #fff;
      background-color: #02070d;
      background-image: url('https://res.cloudinary.com/dhgsvmcmc/image/upload/v1790393418/horizontal-outOfService_oovy5i.png');
      background-position: center;
      background-size: cover;
      background-repeat: no-repeat;
    }

    .service-unavailable__message {
      position: absolute;
      top: 53%;
      left: 15.5%;
      width: min(38vw, 620px);
      margin: 0;
      color: #fff;
      font-size: clamp(1rem, 1.5vw, 1.5rem);
      font-weight: 500;
      line-height: 1.5;
      overflow-wrap: anywhere;
      text-shadow: 0 2px 10px rgb(0 0 0 / 90%);
    }

    .service-unavailable__team-access {
      position: absolute;
      right: 1rem;
      bottom: 0.5rem;
      color: #fff;
      text-shadow: 0 1px 6px #000;
    }

    @media (max-width: 1024px) {
      .service-unavailable {
        background-image: url('https://res.cloudinary.com/dhgsvmcmc/image/upload/v1790393424/vertical-outOfService_zjnafa.png');
      }

      .service-unavailable__message {
        top: 43%;
        left: 10%;
        width: 80%;
        font-size: clamp(1rem, 4vw, 1.35rem);
      }
    }
  `],
  template: `
    <main class="service-unavailable" aria-live="polite">
      <p class="service-unavailable__message">{{ access.status().message }}</p>
      <div class="service-unavailable__team-access"><app-team-access /></div>
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

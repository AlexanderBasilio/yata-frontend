import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, exhaustMap, filter, map, of, timeout, timer } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { HANDLE_ERRORS_LOCALLY } from '../../interceptors/error.interceptor';
import { serviceAccessConfig } from './service-access.config';

export interface ServiceAccess {
  state: 'OPEN' | 'CLOSED' | 'MAINTENANCE' | 'UNAVAILABLE';
  access: 'PUBLIC' | 'DEVELOPER' | 'DENIED';
  message: string;
  nextOpeningAt: string | null;
}

const unavailable: ServiceAccess = {
  state: 'UNAVAILABLE', access: 'DENIED',
  message: 'No pudimos comprobar la disponibilidad. Intenta actualizar el estado.',
  nextOpeningAt: null
};

// Only these entry points remain accessible during a closure. Never use prefix matching.
export function isAccessExempt(url: string): boolean {
  const path = url.split(/[?#]/)[0].split('/').map(segment => segment.split(';')[0]).join('/').replace(/\/$/, '');
  return ['', '/zisify', '/closed', '/auth/login', '/auth/register', '/privacy', '/terms', '/reclamaciones'].includes(path) || path.startsWith('/c/');
}

@Injectable({ providedIn: 'root' })
export class ServiceAccessService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private monitoring = false;
  private lastCheckTime = 0;
  readonly enabled = serviceAccessConfig.path.length > 0;
  readonly status = signal<ServiceAccess>(unavailable);

  check() {
    if (!this.enabled) return of(true);
    this.lastCheckTime = Date.now();
    const token = this.auth.getToken();
    return this.http.get<unknown>(`${environment.platformUrl}${serviceAccessConfig.path}`, {
      context: new HttpContext().set(HANDLE_ERRORS_LOCALLY, true),
      params: { 'ngsw-bypass': 'true' }
    }).pipe(
      timeout(10000),
      map(value => {
        if (!this.valid(value) || token !== this.auth.getToken()) {
          this.status.set(unavailable);
          return false;
        }
        this.status.set(value);
        return (value.state === 'OPEN' && value.access === 'PUBLIC') ||
          (!!token && value.access === 'DEVELOPER');
      }),
      catchError(() => { this.status.set(unavailable); return of(false); })
    );
  }

  // Recheck idle pages as well as router transitions. APIs must enforce closure independently.
  startMonitoring(): void {
    if (!this.enabled || this.monitoring) return;
    this.monitoring = true;

    // Polling optimizado a 5 minutos (300,000 ms), pausado si la pestaña está en segundo plano
    timer(300000, 300000).pipe(
      filter(() => typeof document === 'undefined' || !document.hidden),
      filter(() => !isAccessExempt(this.router.url)),
      exhaustMap(() => this.check()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(allowed => {
      if (!allowed && !isAccessExempt(this.router.url)) void this.router.navigateByUrl('/closed');
    });

    // Sondeo reactivo al volver a enfocar la pestaña o cambiar visibilidad
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const minIntervalMs = 120000; // Mínimo 2 minutos entre chequeos al cambiar foco para no saturar
      const onFocusOrVisible = () => {
        if (document.hidden || isAccessExempt(this.router.url)) return;
        if (Date.now() - this.lastCheckTime >= minIntervalMs) {
          this.check().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(allowed => {
            if (!allowed && !isAccessExempt(this.router.url)) void this.router.navigateByUrl('/closed');
          });
        }
      };

      window.addEventListener('focus', onFocusOrVisible);
      document.addEventListener('visibilitychange', onFocusOrVisible);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('focus', onFocusOrVisible);
        document.removeEventListener('visibilitychange', onFocusOrVisible);
      });
    }
  }

  private valid(value: unknown): value is ServiceAccess {
    if (!value || typeof value !== 'object') return false;
    const data = value as ServiceAccess;
    return ['OPEN', 'CLOSED', 'MAINTENANCE'].includes(data.state) &&
      ['PUBLIC', 'DEVELOPER', 'DENIED'].includes(data.access) &&
      typeof data.message === 'string' &&
      (data.nextOpeningAt === null || (typeof data.nextOpeningAt === 'string' &&
        Number.isFinite(Date.parse(data.nextOpeningAt))));
  }
}

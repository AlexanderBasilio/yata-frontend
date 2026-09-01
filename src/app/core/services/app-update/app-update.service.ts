import { DOCUMENT } from '@angular/common';
import { ApplicationRef, DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter, firstValueFrom, from, fromEvent, interval, merge, of, switchMap, take, timeout } from 'rxjs';
import { AnalyticsService } from '../analytics/analytics.service';
import { CartService } from '../cart/cart.service';

export const RELOAD_APP = new InjectionToken<() => void>('RELOAD_APP', {
  providedIn: 'root', factory: () => { const doc = inject(DOCUMENT); return () => doc.location.reload(); }
});
export const CONFIRM_APP_RELOAD = new InjectionToken<() => boolean>('CONFIRM_APP_RELOAD', {
  providedIn: 'root', factory: () => {
    const doc = inject(DOCUMENT);
    return () => doc.defaultView?.confirm('Se recargará Zisify. Guarda cualquier cambio pendiente antes de continuar. Tu sesión y el carrito de comidas se conservarán. ¿Actualizar ahora?') ?? false;
  }
});

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly appRef = inject(ApplicationRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly legacyCart = inject(CartService);
  private readonly reload = inject(RELOAD_APP);
  private readonly confirmReload = inject(CONFIRM_APP_RELOAD);
  private readonly route = signal(this.router.url);
  private readonly holds = signal(0);
  private initialized = false;
  private lastCheck = 0;
  private pending: Promise<boolean> | null = null;
  readonly available = signal(false);
  readonly recovery = signal(false);
  readonly checking = signal(false);
  readonly deferred = signal(false);
  readonly message = signal('');
  readonly visible = computed(() => (this.available() || this.recovery()) && !this.deferred());
  readonly blocked = computed(() => this.holds() > 0 || this.legacyCart.itemCount() > 0 ||
    /^\/(food\/(cart|checkout)|liquor\/(cart|location))(\/|[;?#]|$)/.test(this.route()));

  initialize(): void {
    if (this.initialized || !this.updates?.isEnabled) return;
    this.initialized = true;
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => { this.route.set(event.urlAfterRedirects); this.deferred.set(false); });
    this.updates.versionUpdates.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event.type === 'VERSION_READY') {
        this.available.set(true);
        this.deferred.set(false);
        this.message.set('');
        this.analytics.trackUpdate('ready');
      } else if (event.type === 'VERSION_INSTALLATION_FAILED') {
        this.analytics.trackUpdate('installation_failed');
        this.message.set('No se pudo descargar la nueva versión. Intentaremos de nuevo.');
      }
    });
    this.updates.unrecoverable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.recovery.set(true);
      this.deferred.set(false);
      this.analytics.trackUpdate('unrecoverable');
    });
    const foreground = fromEvent(this.document, 'visibilitychange').pipe(
      filter(() => this.document.visibilityState === 'visible')
    );
    const online = this.document.defaultView ? fromEvent(this.document.defaultView, 'online') : of();
    this.appRef.isStable.pipe(
      filter(stable => stable), take(1),
      switchMap(() => merge(of(null), interval(15 * 60_000), foreground, online)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      if (this.document.visibilityState !== 'hidden') {
        this.deferred.set(false);
        void this.checkForUpdate();
      }
    });
  }

  // Use for payment/dish dialogs, including the payment dialog shown on /orders.
  holdUpdates(): () => void {
    this.holds.update(value => value + 1);
    let released = false;
    return () => {
      if (!released) this.holds.update(value => Math.max(0, value - 1));
      released = true;
    };
  }

  postpone(): void { this.deferred.set(true); this.analytics.trackUpdate('deferred'); }

  async checkForUpdate(force = false): Promise<boolean> {
    if (!this.updates?.isEnabled || this.document.defaultView?.navigator.onLine === false) return false;
    if (this.pending) return this.pending;
    if (!force && Date.now() - this.lastCheck < 60_000) return false;
    this.lastCheck = Date.now();
    this.checking.set(true);
    // Do not leave the button disabled forever if the worker/network stops responding.
    this.pending = firstValueFrom(from(this.updates.checkForUpdate()).pipe(timeout(30_000))).then(() => {
      this.message.set('');
      return true;
    }).catch(() => {
      this.message.set('No pudimos comprobar la versión. Revisa tu conexión e inténtalo de nuevo.');
      this.analytics.trackUpdate('check_failed');
      return false;
    }).finally(() => { this.checking.set(false); this.pending = null; });
    return this.pending;
  }

  async applyUpdate(): Promise<void> {
    if ((!this.available() && !this.recovery()) || this.blocked() || this.checking()) return;
    if (!this.confirmReload()) return;
    // Re-check in case another release appeared while the banner was on screen.
    const checked = await this.checkForUpdate(true);
    if (!checked || this.blocked()) {
      if (!checked) this.message.set('Necesitas conexión para comprobar y actualizar Zisify. Inténtalo de nuevo.');
      return;
    }
    this.analytics.trackUpdate('accepted');
    // Do not activateUpdate(), clear storage, or unregister the worker.
    this.reload();
  }
}

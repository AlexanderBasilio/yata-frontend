import { DOCUMENT } from '@angular/common';
import { ApplicationRef, DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter, firstValueFrom, from, fromEvent, merge, of, switchMap, take, timeout, timer } from 'rxjs';
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
  private lastCheck = -Infinity;
  private readonly checkCooldown = 5 * 60_000;
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
    const navigation = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    );
    navigation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      this.route.set(event.urlAfterRedirects); this.deferred.set(false);
    });
    this.updates.versionUpdates.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event.type === 'VERSION_READY') {
        this.markAvailable();
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
    const restored = this.document.defaultView ? fromEvent<PageTransitionEvent>(this.document.defaultView, 'pageshow').pipe(
      filter(event => event.persisted)
    ) : of();
    // One-shot fallback matches SW registration's 30s limit if the app never stabilizes.
    // No recurring timer: idle/background tabs do not poll our servers.
    merge(this.appRef.isStable.pipe(filter(stable => stable)), timer(30_000)).pipe(
      take(1),
      switchMap(() => merge(of(null), foreground, online, restored, navigation)),
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

  private markAvailable(): void {
    if (!this.available()) this.analytics.trackUpdate('ready');
    this.available.set(true);
    this.deferred.set(false);
    this.message.set('');
  }

  async checkForUpdate(): Promise<boolean> {
    if (!this.updates?.isEnabled || this.document.defaultView?.navigator.onLine === false) return false;
    // A fully downloaded release is already available. Do not fetch another one before adoption.
    if (this.available() && !this.recovery()) return true;
    if (this.pending) return this.pending;
    if (Date.now() - this.lastCheck < this.checkCooldown) return false;
    this.lastCheck = Date.now();
    this.checking.set(true);
    // Do not leave the button disabled forever if the worker/network stops responding.
    this.pending = firstValueFrom(from(this.updates.checkForUpdate()).pipe(timeout(30_000))).then(found => {
      // The promise is also authoritative: an initially uncontrolled tab can miss VERSION_READY
      // before the worker has associated that client with an application version.
      if (found) this.markAvailable();
      this.message.set('');
      return found;
    }).catch(() => {
      this.message.set('No pudimos comprobar la versión. Revisa tu conexión e inténtalo de nuevo.');
      this.analytics.trackUpdate('check_failed');
      return false;
    }).finally(() => { this.checking.set(false); this.pending = null; });
    return this.pending;
  }

  async applyUpdate(): Promise<void> {
    if ((!this.available() && !this.recovery()) || this.blocked()) return;
    if (!this.confirmReload()) return;
    if (this.recovery() && this.document.defaultView?.navigator.onLine === false) {
      this.message.set('Necesitas conexión para recuperar Zisify. Inténtalo cuando vuelvas a estar en línea.');
      return;
    }
    if (this.blocked()) return;
    this.analytics.trackUpdate('accepted');
    // VERSION_READY means the release is completely cached. A second network check is unnecessary
    // and can prevent recovery when the current worker is broken or the network is slow.
    // Do not activateUpdate(), clear storage, or unregister the worker.
    this.reload();
  }
}

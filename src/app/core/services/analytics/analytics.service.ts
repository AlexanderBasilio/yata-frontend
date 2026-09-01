import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { analyticsPage, UI_ACTIONS } from './analytics-events';
import { GA4_SETTINGS, Ga4Transport } from './ga4-transport.service';

export interface AnalyticsItem { id: string; price: number; quantity: number }
export type CheckoutStep = 'delivery' | 'review' | 'order_created';
export type AnalyticsErrorStage = 'cart_add' | 'checkout_summary' | 'checkout_submit' | 'payment_report';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly transport = inject(Ga4Transport);
  private readonly settings = inject(GA4_SETTINGS);
  private readonly consentKey = 'zisify_analytics_consent_v1';
  private initialized = false;
  private lastUrl: string | null = null;
  private previousLocation = '';
  readonly consent = signal<'granted' | 'denied' | null>(this.readConsent());
  readonly preferencesOpen = signal(this.consent() === null);

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    if (this.canSend()) this.safely(() => this.transport.enable(this.context()));
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => this.trackPageView(event.urlAfterRedirects));
    if (this.router.navigated) this.trackPageView(this.router.url);

    const onClick = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest('[data-analytics]');
      if (!element || element.matches(':disabled, [aria-disabled="true"]')) return;
      const action = element.getAttribute('data-analytics');
      if (action && (UI_ACTIONS as readonly string[]).includes(action)) {
        this.send('ui_click', { button_id: action });
      }
    };
    // Capture before navigation/stopPropagation; no text, input, href or user IDs are read.
    this.document.addEventListener('click', onClick, { capture: true, passive: true });
    const onStorage = (event: StorageEvent) => {
      if (event.key === this.consentKey) this.applyConsent(this.readConsent());
    };
    this.document.defaultView?.addEventListener('storage', onStorage);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('click', onClick, true);
      this.document.defaultView?.removeEventListener('storage', onStorage);
    });
  }

  setConsent(value: 'granted' | 'denied'): void {
    try { this.document.defaultView?.localStorage.setItem(this.consentKey, value); } catch { /* Storage may be disabled. */ }
    this.applyConsent(value);
  }

  private applyConsent(value: 'granted' | 'denied' | null): void {
    const changed = this.consent() !== value;
    this.consent.set(value);
    this.preferencesOpen.set(value === null);
    if (!changed) return;
    this.lastUrl = null;
    this.previousLocation = '';
    if (this.canSend()) {
      this.safely(() => this.transport.enable(this.context()));
      if (this.router.navigated) this.trackPageView(this.router.url);
    } else {
      this.safely(() => this.transport.disable());
    }
  }

  private readConsent(): 'granted' | 'denied' | null {
    try {
      const value = this.document.defaultView?.localStorage.getItem(this.consentKey);
      return value === 'granted' || value === 'denied' ? value : null;
    } catch { return null; }
  }

  private canSend(): boolean { return this.settings.enabled && this.consent() === 'granted'; }

  private context(url = this.router.url): Record<string, unknown> {
    const page = analyticsPage(url);
    return {
      page_path: page.path, page_title: page.title, screen_name: page.path,
      page_location: `${this.document.location.origin}${page.path}`,
      page_referrer: this.previousLocation || this.externalReferrer()
    };
  }

  private externalReferrer(): string {
    try { return this.document.referrer ? new URL(this.document.referrer).origin : ''; }
    catch { return ''; }
  }

  trackPageView(url: string): void {
    if (!this.canSend() || this.lastUrl === url) return;
    const context = this.context(url);
    this.safely(() => {
      this.transport.pageContext(context);
      this.transport.event('page_view', context);
    });
    this.lastUrl = url;
    this.previousLocation = context['page_location'] as string;
  }

  private safely(action: () => void): void {
    // A blocked/broken tag must never stop a business action.
    try { action(); } catch { /* Ignore telemetry failures. */ }
  }

  private send(name: string, params: Record<string, unknown> = {}): void {
    if (this.canSend()) this.safely(() => this.transport.event(name, { ...this.context(), ...params }));
  }

  trackEcommerce(name: 'view_item' | 'add_to_cart' | 'view_cart' | 'begin_checkout', items: AnalyticsItem[]): void {
    const safeItems = items.filter(item => Number.isFinite(item.price) && item.price >= 0 &&
      Number.isFinite(item.quantity) && item.quantity > 0 && /^[a-zA-Z0-9_-]{1,100}$/.test(item.id))
      .slice(0, 200).map(item => ({ item_id: item.id, price: item.price, quantity: item.quantity }));
    if (!safeItems.length) return;
    this.send(name, { currency: 'PEN', value: safeItems.reduce((sum, item) => sum + item.price * item.quantity, 0), items: safeItems });
  }

  // Compatibility for the legacy liquor product card. Product names are intentionally omitted.
  trackAddToCart(productId: string, _productName: string, price: number): void {
    this.trackEcommerce('add_to_cart', [{ id: productId, price, quantity: 1 }]);
  }

  trackCheckoutStep(step: CheckoutStep): void { this.send('checkout_step_view', { checkout_step: step }); }
  trackPaymentStep(step: 1 | 2 | 3): void { this.send('payment_step_view', { payment_step: step }); }
  trackOrderCreated(): void { this.send('order_created'); }
  trackPaymentReported(): void { this.send('payment_reported'); }
  trackError(stage: AnalyticsErrorStage, status?: number): void {
    this.send('flow_error', { flow_stage: stage, http_status: Number.isInteger(status) ? status : 0 });
  }
  trackUpdate(action: 'ready' | 'accepted' | 'deferred' | 'installation_failed' | 'check_failed' | 'unrecoverable'): void {
    this.send('pwa_update', { update_action: action });
  }
}

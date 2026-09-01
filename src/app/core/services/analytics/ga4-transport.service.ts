import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';

export const GA4_SETTINGS = new InjectionToken<{ enabled: boolean; measurementId: string }>(
  'GA4_SETTINGS', {
    providedIn: 'root',
    factory: () => ({
      enabled: environment.production && ['zisify.com', 'www.zisify.com'].includes(
        inject(DOCUMENT).location?.hostname ?? ''
      ),
      measurementId: environment.googleAnalyticsId
    })
  }
);

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

@Injectable({ providedIn: 'root' })
export class Ga4Transport {
  private readonly document = inject(DOCUMENT);
  private readonly settings = inject(GA4_SETTINGS);
  private configured = false;

  enable(page: Record<string, unknown>): void {
    const win = this.document.defaultView as AnalyticsWindow | null;
    if (!win || !this.settings.enabled) return;
    Reflect.set(win, `ga-disable-${this.settings.measurementId}`, false);
    win.dataLayer ??= [];
    win.gtag ??= function () { win.dataLayer!.push(arguments); };

    if (!this.configured) {
      // Basic opt-in: this code (and the remote script) runs only AFTER consent.
      win.gtag('consent', 'default', {
        analytics_storage: 'granted', ad_storage: 'denied',
        ad_user_data: 'denied', ad_personalization: 'denied'
      });
      win.gtag('js', new Date());
      win.gtag('config', this.settings.measurementId, {
        ...page, send_page_view: false, allow_google_signals: false,
        allow_ad_personalization_signals: false, cookie_flags: 'SameSite=Lax;Secure'
      });
      this.configured = true;
      const script = this.document.createElement('script');
      script.id = 'zisify-ga4';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.settings.measurementId)}`;
      this.document.head.appendChild(script);
    } else {
      win.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  }

  disable(): void {
    const win = this.document.defaultView as AnalyticsWindow | null;
    if (!win) return;
    Reflect.set(win, `ga-disable-${this.settings.measurementId}`, true);
    win.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  }

  pageContext(page: Record<string, unknown>): void {
    (this.document.defaultView as AnalyticsWindow | null)?.gtag?.('set', page);
  }

  event(name: string, params: Record<string, unknown>): void {
    (this.document.defaultView as AnalyticsWindow | null)?.gtag?.('event', name, params);
  }
}

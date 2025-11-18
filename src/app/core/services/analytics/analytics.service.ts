import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

declare let gtag: Function;

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private router = inject(Router);
  private isInitialized = false;

  /**
   * Inicializa Google Analytics y registra cambios de ruta
   */
  initialize() {
    // Esperar a que gtag esté disponible
    this.waitForGtag().then(() => {
      this.setupAnalytics();
    });
  }

  /**
   * Espera a que gtag esté disponible (máximo 5 segundos)
   */
  private waitForGtag(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 50 intentos = 5 segundos

      const checkGtag = setInterval(() => {
        attempts++;

        if (typeof gtag !== 'undefined') {
          clearInterval(checkGtag);
          console.log('✅ gtag está disponible');
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkGtag);
          console.warn('⚠️ Google Analytics no se cargó después de 5 segundos');
          reject();
        }
      }, 100); // Revisar cada 100ms
    });
  }

  /**
   * Configura Google Analytics
   */
  private setupAnalytics() {
    if (this.isInitialized) return;

    // Configurar gtag
    gtag('config', environment.googleAnalyticsId, {
      send_page_view: false
    });

    this.isInitialized = true;

    if (environment.production) {
      console.log('✅ Google Analytics PRODUCCIÓN inicializado:', environment.googleAnalyticsId);
    } else {
      console.log('📊 Google Analytics DESARROLLO inicializado:', environment.googleAnalyticsId);
    }

    // Rastrear cambios de página
    this.trackPageViews();
  }

  private trackPageViews() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      this.trackPageView(url);

      if (!environment.production) {
        console.log('📄 Página vista:', url);
      }
    });
  }

  /**
   * Registra una vista de página
   */
  trackPageView(url: string) {
    if (this.isInitialized && typeof gtag !== 'undefined') {
      gtag('config', environment.googleAnalyticsId, {
        page_path: url
      });
    }
  }

  /**
   * Registra un evento personalizado
   */
  trackEvent(action: string, category: string, label?: string, value?: number) {
    if (this.isInitialized && typeof gtag !== 'undefined') {
      gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      });

      if (!environment.production) {
        console.log('🎯 Evento:', { action, category, label, value });
      }
    }
  }

  /**
   * Rastrear agregar al carrito
   */
  trackAddToCart(productId: string, productName: string, price: number) {
    this.trackEvent('add_to_cart', 'ecommerce', productName, price);
  }

  /**
   * Rastrear compra completada
   */
  trackPurchase(orderId: string, total: number, itemCount: number) {
    if (this.isInitialized && typeof gtag !== 'undefined') {
      gtag('event', 'purchase', {
        transaction_id: orderId,
        value: total,
        currency: 'PEN',
        items: itemCount
      });
    }
  }

  /**
   * Rastrear inicio de checkout
   */
  trackBeginCheckout(total: number, itemCount: number) {
    this.trackEvent('begin_checkout', 'ecommerce', `${itemCount} items`, total);
  }
}

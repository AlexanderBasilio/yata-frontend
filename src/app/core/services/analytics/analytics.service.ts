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

  /**
   * Inicializa Google Analytics y registra cambios de ruta
   */
  initialize() {
    // En desarrollo, solo registra en consola
    if (!environment.production) {
      console.log('📊 Analytics en modo desarrollo');
      this.trackDevelopmentPages();
      return;
    }

    // En producción, inicializa Google Analytics
    this.initializeGoogleAnalytics();
    this.trackPageViews();
  }

  private initializeGoogleAnalytics() {
    if (typeof gtag === 'undefined') {
      console.warn('Google Analytics no está cargado');
      return;
    }

    // Inicializar gtag con tu ID
    gtag('js', new Date());
    gtag('config', environment.googleAnalyticsId, {
      send_page_view: false // Deshabilitamos el envío automático
    });

    console.log('✅ Google Analytics inicializado:', environment.googleAnalyticsId);
  }

  private trackPageViews() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.trackPageView(event.urlAfterRedirects);
    });
  }

  private trackDevelopmentPages() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      console.log('📄 Página vista (dev):', event.urlAfterRedirects);
    });
  }

  /**
   * Registra una vista de página
   */
  trackPageView(url: string) {
    if (typeof gtag !== 'undefined') {
      gtag('config', environment.googleAnalyticsId, {
        page_path: url
      });
      console.log('📊 Página registrada:', url);
    }
  }

  /**
   * Registra un evento personalizado
   */
  trackEvent(action: string, category: string, label?: string, value?: number) {
    if (typeof gtag !== 'undefined') {
      gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      });
      console.log('🎯 Evento:', { action, category, label, value });
    } else if (!environment.production) {
      console.log('🎯 Evento (dev):', { action, category, label, value });
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
    if (typeof gtag !== 'undefined') {
      gtag('event', 'purchase', {
        transaction_id: orderId,
        value: total,
        currency: 'PEN',
        items: itemCount
      });
      console.log('💰 Compra registrada:', { orderId, total, itemCount });
    }
  }

  /**
   * Rastrear inicio de checkout
   */
  trackBeginCheckout(total: number, itemCount: number) {
    this.trackEvent('begin_checkout', 'ecommerce', `${itemCount} items`, total);
  }
}

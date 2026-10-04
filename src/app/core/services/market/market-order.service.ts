import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, of, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  MarketCheckoutRequest,
  MarketDeliveryLocationDto,
  MarketOrderResponse,
  MarketOrderSummaryRequest,
  MarketOrderSummaryResponse
} from '../../models/market.model';
import { MarketCartService } from './market-cart.service';

@Injectable({
  providedIn: 'root'
})
export class MarketOrderService {
  private http = inject(HttpClient);
  private cartService = inject(MarketCartService);
  private readonly baseUrl = `${environment.apiUrl}/api/market/customer/orders`;

  /**
   * 0. Obtener la última ubicación de entrega utilizada por el cliente (para autorrellenar el mapa en el Paso 1)
   * GET /api/market/customer/orders/last-location
   */
  getLastLocation(): Observable<MarketDeliveryLocationDto | null> {
    return this.http
      .get<MarketDeliveryLocationDto>(`${this.baseUrl}/last-location`, { observe: 'response' })
      .pipe(
        map(res => {
          if (res.status === 204 || !res.body) {
            return null;
          }
          return res.body;
        }),
        catchError(() => of(null))
      );
  }

  /**
   * 1. Resumen y cálculo previo de costos (envío escalonado por peso/distancia, consolidación, servicio, descuentos)
   * POST /api/market/customer/orders/summary
   */
  calculateSummary(request: MarketOrderSummaryRequest): Observable<MarketOrderSummaryResponse> {
    return this.http.post<MarketOrderSummaryResponse>(`${this.baseUrl}/summary`, request).pipe(
      catchError(err => {
        console.error('❌ Error al calcular resumen de orden de mercado:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * 2. Creación y confirmación de la orden de mercado
   * POST /api/market/customer/orders/checkout
   */
  checkout(request: MarketCheckoutRequest): Observable<MarketOrderResponse> {
    return this.http.post<MarketOrderResponse>(`${this.baseUrl}/checkout`, request).pipe(
      tap(() => {
        // Al crear la orden exitosamente en backend, vaciar el carrito
        this.cartService.clearCart().subscribe();
      }),
      catchError(err => {
        console.error('❌ Error al realizar checkout de mercado:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * 3. Consultar orden por código para pantalla de confirmación/voucher
   * GET /api/market/customer/orders/code/{orderCode}
   */
  getOrderByCode(orderCode: string): Observable<MarketOrderResponse | null> {
    return this.http.get<MarketOrderResponse>(`${this.baseUrl}/code/${orderCode}`).pipe(
      catchError(err => {
        console.warn(`⚠️ Error al consultar orden ${orderCode}:`, err);
        return of(null);
      })
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, of, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  MarketCheckoutRequest,
  MarketDeliveryLocationDto,
  MarketOrderResponse,
  MarketOrderSummaryRequest,
  MarketOrderSummaryResponse,
  MarketPaymentAccountDto,
  MarketPaymentOperationRequest,
  ZoneResolutionResponse
} from '../../models/market.model';
import { MarketCartService } from './market-cart.service';

@Injectable({
  providedIn: 'root'
})
export class MarketOrderService {
  private http = inject(HttpClient);
  private cartService = inject(MarketCartService);
  private readonly baseUrl = `${environment.apiUrl}/api/market/customer/orders`;
  private readonly platformUrl = environment.platformUrl;

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
   * 0.5. Resolver la zona de entrega y métodos de pago permitidos en Platform
   * POST /api/v1/logistics/zones/resolve-location
   */
  resolveZoneLocation(latitude: number, longitude: number): Observable<ZoneResolutionResponse> {
    return this.http
      .post<ZoneResolutionResponse>(`${this.platformUrl}/api/v1/logistics/zones/resolve-location`, {
        latitude,
        longitude
      })
      .pipe(
        catchError(err => {
          console.warn('⚠️ No se pudo resolver la zona logística en Platform:', err);
          return of({
            available: true,
            cashOnDeliveryEnabled: true,
            prepaidEnabled: true,
            availablePaymentMethods: ['PREPAID', 'CASH_ON_DELIVERY']
          });
        })
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
   * 3. Confirmar / actualizar el método de pago de una orden ya creada
   * PATCH /api/market/customer/orders/{orderCode}/payment-method
   */
  updatePaymentMethod(orderCode: string, paymentMethod: string): Observable<MarketOrderResponse> {
    return this.http
      .patch<MarketOrderResponse>(`${this.baseUrl}/${orderCode}/payment-method`, {
        paymentMethod
      })
      .pipe(
        catchError(err => {
          console.error(`❌ Error al actualizar método de pago para orden ${orderCode}:`, err);
          return throwError(() => err);
        })
      );
  }

  /**
   * 4. Consultar orden por código para pantalla de confirmación/voucher/pago
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

  /**
   * 5. Obtener cuentas bancarias y billeteras activas para pago de mercado
   * GET /api/market/customer/payment-accounts
   */
  getPaymentAccounts(): Observable<MarketPaymentAccountDto[]> {
    return this.http
      .get<MarketPaymentAccountDto[]>(`${environment.apiUrl}/api/market/customer/payment-accounts`)
      .pipe(
        catchError(err => {
          console.warn('⚠️ Error al consultar cuentas de transferencia de mercado:', err);
          return of([]);
        })
      );
  }

  /**
   * 6. Registrar número de operación del pago anticipado
   * POST /api/market/customer/orders/{orderCode}/payment-operation
   */
  registerPaymentOperation(
    orderCode: string,
    request: MarketPaymentOperationRequest
  ): Observable<MarketOrderResponse> {
    return this.http
      .post<MarketOrderResponse>(`${this.baseUrl}/${orderCode}/payment-operation`, request)
      .pipe(
        catchError(err => {
          console.error(`❌ Error al registrar operación de pago para orden ${orderCode}:`, err);
          return throwError(() => err);
        })
      );
  }
}

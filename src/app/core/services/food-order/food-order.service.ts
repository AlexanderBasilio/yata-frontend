import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CheckoutRequest,
  OrderResponse,
  OrderSummaryResponse,
  SummaryRequest
} from '../../models/food-order.model';

@Injectable({
  providedIn: 'root'
})
export class FoodOrderService {
  private http = inject(HttpClient);

  // Usamos la nueva URL definida en environment para el servicio de órdenes
  private apiUrl = `${environment.foodOrderServiceUrl}/api/orders`;

  /**
   * PASO A: Calcula los costos finales (Subtotal, Delivery, Servicio, Total)
   * Se llama cuando el usuario confirma su ubicación.
   */
  calculateSummary(request: SummaryRequest): Observable<OrderSummaryResponse> {
    return this.http.post<OrderSummaryResponse>(`${this.apiUrl}/summary-calculation`, request);
  }

  /**
   * PASO B: Confirma el pedido y guarda la orden en base de datos.
   * Se llama al final del checkout ("Realizar Pedido").
   */
  confirmOrder(request: CheckoutRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.apiUrl}/confirm`, request);
  }
}
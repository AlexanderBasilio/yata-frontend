import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OrderResponse, PaymentReportRequest } from '../../models/order.model';

export interface CreateOrderRequest {
  items: { productId: string, name: string, price: number, quantity: number, unit?: string }[];
  location: { address: string, latitude: number, longitude: number, city: string, region: string };
  payment: { method: string, cashAmount: number | null, changeAmount: number };
  summary: { subtotal: number, serviceCost: number, shippingCost: number, total: number };
  deliveryNote: string;
  customerName: string;
  customerPhone: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.restaurantServiceUrl}/api/orders`;

  getMyOrders(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.apiUrl}/my-orders`);
  }

  reportPayment(orderCode: string, request: PaymentReportRequest): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(`${this.apiUrl}/${orderCode}/report-payment`, request);
  }

  calculateShipping(location: { destLat: number; destLon: number }): Observable<{ shippingCost: number, currency: string }> {
    return this.http.post<{ shippingCost: number, currency: string }>(`${this.apiUrl}/calculate-shipping`, location);
  }

  createOrder(request: CreateOrderRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, request);
  }
}

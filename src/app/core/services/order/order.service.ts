import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OrderResponse, PaymentReportRequest } from '../../models/order.model';
import { CustomerUnifiedOrdersResponse } from '../../models/unified-orders.model';

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

  getUnifiedOrders(vertical: string = 'ALL', status: string = 'ALL'): Observable<CustomerUnifiedOrdersResponse> {
    let params = new HttpParams().set('vertical', vertical || 'ALL');
    if (status && status !== 'ALL') {
      params = params.set('status', status);
    } else {
      params = params.set('status', 'ALL');
    }
    return this.http.get<CustomerUnifiedOrdersResponse>(`${environment.apiUrl}/api/customer/orders`, { params });
  }

  reportPayment(orderCode: string, request: PaymentReportRequest): Observable<OrderResponse> {
    const portalBase = environment.portalUrl.replace('/api/v1', '/api/portal/customer/orders');
    return this.http.patch<OrderResponse>(`${portalBase}/${orderCode}/report-payment`, request);
  }

  calculateShipping(location: { destLat: number; destLon: number }): Observable<{ shippingCost: number, currency: string }> {
    return this.http.post<{ shippingCost: number, currency: string }>(`${this.apiUrl}/calculate-shipping`, location);
  }

  createOrder(request: CreateOrderRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, request);
  }

  confirmReceipt(orderCode: string): Observable<void> {
    const portalBase = environment.portalUrl.replace('/api/v1', '/api/portal/customer/orders');
    return this.http.post<void>(`${portalBase}/${orderCode}/confirm`, {});
  }
}

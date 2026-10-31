import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
    let params = new HttpParams();
    if (vertical && vertical !== 'ALL') {
      const v = vertical === 'RESTAURANTS' ? 'RESTAURANT' : vertical;
      params = params.set('vertical', v);
    }
    if (status && status !== 'ALL') {
      params = params.set('status', status);
      params = params.set('tab', status);
    }
    return this.http.get<any>(`${environment.apiUrl}/api/customer/orders/tabs`, { params }).pipe(
      map(res => {
        if (res && res.orders && Array.isArray(res.orders)) {
          return res as CustomerUnifiedOrdersResponse;
        }

        if (Array.isArray(res)) {
          const porPagarStates = ['CREATED', 'PENDING_PAYMENT', 'PAYMENT_VERIFICATION'];
          const activeStates = ['CONFIRMED', 'PREPARING', 'COLLECTING', 'READY_FOR_DELIVERY', 'IN_DELIVERY'];
          const historyStates = ['DELIVERED', 'CONFIRMED_BY_CLIENT', 'CONFIRMED_BY_SYSTEM'];

          return {
            orders: res,
            counts: {
              total: res.length,
              restaurants: res.filter(o => o.vertical === 'RESTAURANTS' || o.vertical === 'RESTAURANT').length,
              market: res.filter(o => o.vertical === 'MARKET').length,
              liquor: res.filter(o => o.vertical === 'LIQUOR').length,
              pendingPayment: res.filter(o => porPagarStates.includes(o.status)).length,
              active: res.filter(o => activeStates.includes(o.status)).length,
              completed: res.filter(o => historyStates.includes(o.status)).length,
              cancelled: res.filter(o => o.status === 'CANCELLED').length
            },
            statusTabs: [
              { key: 'ALL', label: 'Todos', count: res.length },
              { key: 'POR_PAGAR', label: 'Por Pagar', count: res.filter(o => porPagarStates.includes(o.status)).length },
              { key: 'ACTIVOS', label: 'Activos', count: res.filter(o => activeStates.includes(o.status)).length },
              { key: 'HISTORIAL', label: 'Historial', count: res.filter(o => historyStates.includes(o.status)).length }
            ]
          };
        }

        if (res && (res.porPagar || res.activos || res.historial || res.pendingPayment || res.active || res.history)) {
          const porPagar = res.porPagar || res.pendingPayment || [];
          const activos = res.activos || res.active || [];
          const historial = res.historial || res.history || res.completed || [];
          const allOrders = [...porPagar, ...activos, ...historial];

          let filtered = allOrders;
          if (status === 'POR_PAGAR' || status === 'PENDING_PAYMENT') filtered = porPagar;
          else if (status === 'ACTIVOS' || status === 'ACTIVE') filtered = activos;
          else if (status === 'HISTORIAL' || status === 'COMPLETED' || status === 'HISTORY') filtered = historial;

          return {
            orders: filtered,
            counts: {
              total: allOrders.length,
              restaurants: allOrders.filter(o => o.vertical === 'RESTAURANTS' || o.vertical === 'RESTAURANT').length,
              market: allOrders.filter(o => o.vertical === 'MARKET').length,
              liquor: allOrders.filter(o => o.vertical === 'LIQUOR').length,
              pendingPayment: porPagar.length,
              active: activos.length,
              completed: historial.length,
              cancelled: 0
            },
            statusTabs: [
              { key: 'ALL', label: 'Todos', count: allOrders.length },
              { key: 'POR_PAGAR', label: 'Por Pagar', count: porPagar.length },
              { key: 'ACTIVOS', label: 'Activos', count: activos.length },
              { key: 'HISTORIAL', label: 'Historial', count: historial.length }
            ]
          };
        }

        return res as CustomerUnifiedOrdersResponse;
      })
    );
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

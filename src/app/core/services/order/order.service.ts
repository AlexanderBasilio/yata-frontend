import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CreateOrderRequest {
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    unit: string;
  }>;
  location: {
    address: string;
    latitude: number;
    longitude: number;
    city?: string;
    region?: string;
  };
  payment: {
    method: 'exact' | 'cash';
    cashAmount: number | null;
    changeAmount: number;
  };
  summary: {
    subtotal: number;
    serviceCost: number;
    shippingCost: number;
    total: number;
  };
  deliveryNote: string;
  customerName: string;
  customerPhone: string;
}

export interface CalculateShippingRequest {
  destLat: number;
  destLon: number;
}

export interface CalculateShippingResponse {
  shippingCost: number;
  currency: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.orderServiceUrl}/api/orders`;

  constructor(private http: HttpClient) {}

  calculateShipping(request: CalculateShippingRequest): Observable<CalculateShippingResponse> {
    console.log('📍 Calculando costo de envío para:', request);
    return this.http.post<CalculateShippingResponse>(
      `${this.apiUrl}/shipping-cost`,
      request
    );
  }

  createOrder(orderData: CreateOrderRequest): Observable<CreateOrderResponse> {
    console.log('📤 Enviando orden completa al backend:', orderData);
    return this.http.post<CreateOrderResponse>(this.apiUrl, orderData);
  }
}

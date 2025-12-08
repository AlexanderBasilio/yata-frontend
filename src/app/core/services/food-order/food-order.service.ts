import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface FoodOrder {
  id: string;
  userId?: string;
  restaurantId: string;
  restaurantName: string;
  restaurantPhone: string;

  items: FoodOrderItem[];

  // Ubicación del cliente
  deliveryAddress: string;
  addressReference?: string;
  latitude: number;
  longitude: number;

  // Contacto del cliente
  customerName: string;
  customerPhone: string;
  customerEmail?: string;

  // Montos
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;

  // Estado del pedido
  status: FoodOrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;

  // Tiempos
  estimatedPrepTime: number;
  estimatedDeliveryTime: number;
  orderTime: string;
  confirmedTime?: string;
  readyTime?: string;
  deliveredTime?: string;

  // Pago manual (temporal)
  paymentProof?: string;
  whatsappNumber: string;

  specialInstructions?: string;
}

export interface FoodOrderItem {
  id: string;
  dishId: string;
  dishName: string;
  basePrice: number;
  quantity: number;
  modifiers: OrderModifier[];
  requiredSelections: OrderRequired[];
  itemTotal: number;
  specialInstructions?: string;
}

export interface OrderModifier {
  modifierId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderRequired {
  selectionId: string;
  optionId: string;
  optionName: string;
  priceAdjustment: number;
}

export enum FoodOrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  IN_DELIVERY = 'IN_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  YAPE = 'YAPE'
}

// ✅ Request para calcular delivery fee
export interface CalculateDeliveryRequest {
  restaurantId: string;
  customerLatitude: number;
  customerLongitude: number;
}

export interface CalculateDeliveryResponse {
  deliveryFee: number;
  distance: number;          // en km
  estimatedTime: number;     // en minutos
  currency: string;          // "PEN"
}

// Request para crear orden
export interface CreateFoodOrderRequest {
  // Items del carrito
  items: {
    dishId: string;
    quantity: number;
    modifiers: { modifierId: string; quantity: number }[];
    requiredSelections: { selectionId: string; optionId: string }[];
    specialInstructions?: string;
  }[];

  // Ubicación del cliente
  deliveryAddress: string;
  addressReference?: string;
  latitude: number;
  longitude: number;

  // Contacto
  customerName: string;
  customerPhone: string;
  customerEmail?: string;

  // Método de pago
  paymentMethod: PaymentMethod;

  // Instrucciones adicionales
  specialInstructions?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FoodOrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/food-orders`;

  /**
   * ✅ Calcular costo de delivery y tiempo estimado
   * (Esto reemplaza el calculateFees del cart service)
   */
  calculateDelivery(request: CalculateDeliveryRequest): Observable<CalculateDeliveryResponse> {
    return this.http.post<CalculateDeliveryResponse>(
      `${this.apiUrl}/calculate-delivery`,
      request
    );
  }

  /**
   * Crear orden de comida
   */
  createOrder(request: CreateFoodOrderRequest): Observable<FoodOrder> {
    return this.http.post<FoodOrder>(this.apiUrl, request);
  }

  /**
   * Obtener detalle de una orden
   */
  getOrderById(orderId: string): Observable<FoodOrder> {
    return this.http.get<FoodOrder>(`${this.apiUrl}/${orderId}`);
  }

  /**
   * Obtener mis órdenes
   */
  getMyOrders(): Observable<FoodOrder[]> {
    return this.http.get<FoodOrder[]>(`${this.apiUrl}/my-orders`);
  }

  /**
   * Confirmar pago manual (admin)
   */
  confirmPayment(orderId: string, paymentProof: string): Observable<FoodOrder> {
    return this.http.post<FoodOrder>(`${this.apiUrl}/${orderId}/confirm-payment`, {
      paymentProof
    });
  }

  /**
   * Cancelar orden
   */
  cancelOrder(orderId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${orderId}/cancel`, {});
  }
}
